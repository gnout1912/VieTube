import { FileStorage, UserExportState } from '@peertube/peertube-models';
import { getFileSize } from '@peertube/peertube-node-utils';
import { activityPubContextify } from '../../helpers/activity-pub-utils.js';
import { saveInTransactionWithRetries } from '../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { UserModel } from '../../models/user/user.js';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { remove } from 'fs-extra/esm';
import { join, parse } from 'path';
import { PassThrough } from 'stream';
import { activityPubCollection } from '../activitypub/collection.js';
import { getContextFilter } from '../activitypub/context.js';
import { getUserExportFileObjectStorageSize, removeUserExportObjectStorage, storeUserExportFile } from '../object-storage/user-export.js';
import { getFSUserExportFilePath } from '../paths.js';
import { AccountExporter, AutoTagPoliciesExporter, BlocklistExporter, ChannelsExporter, CommentsExporter, DislikesExporter, FollowersExporter, FollowingExporter, LikesExporter, UserSettingsExporter, UserVideoHistoryExporter, VideoPlaylistsExporter, VideosExporter, WatchedWordsListsExporter } from './exporters/index.js';
const lTags = loggerTagsFactory('user-export');
export class UserExporter {
    async export(exportModel) {
        try {
            exportModel.state = UserExportState.PROCESSING;
            await saveInTransactionWithRetries(exportModel);
            const user = await UserModel.loadByIdFull(exportModel.userId);
            let endPromise;
            let output;
            if (exportModel.storage === FileStorage.FILE_SYSTEM) {
                output = createWriteStream(getFSUserExportFilePath(exportModel));
                endPromise = new Promise(res => output.on('close', () => res('')));
            }
            else {
                output = new PassThrough();
                endPromise = storeUserExportFile(output, exportModel);
            }
            await this.createZip({ exportModel, user, output });
            const fileUrl = await endPromise;
            if (exportModel.storage === FileStorage.OBJECT_STORAGE) {
                exportModel.fileUrl = fileUrl;
                exportModel.size = await getUserExportFileObjectStorageSize(exportModel);
            }
            else if (exportModel.storage === FileStorage.FILE_SYSTEM) {
                exportModel.size = await getFileSize(getFSUserExportFilePath(exportModel));
            }
            exportModel.state = UserExportState.COMPLETED;
            await saveInTransactionWithRetries(exportModel);
        }
        catch (err) {
            logger.error('Cannot generate an export', Object.assign({ err }, lTags()));
            try {
                exportModel.state = UserExportState.ERRORED;
                exportModel.error = err.message;
                await saveInTransactionWithRetries(exportModel);
            }
            catch (innerErr) {
                logger.error('Cannot set export error state', Object.assign({ err: innerErr }, lTags()));
            }
            try {
                if (exportModel.storage === FileStorage.FILE_SYSTEM) {
                    await remove(getFSUserExportFilePath(exportModel));
                }
                else {
                    await removeUserExportObjectStorage(exportModel);
                }
            }
            catch (innerErr) {
                logger.error('Cannot remove archive path after failure', Object.assign({ err: innerErr }, lTags()));
            }
            throw err;
        }
    }
    createZip(options) {
        const { output, exportModel, user } = options;
        let activityPubOutboxStore = [];
        this.archive = archiver('zip', {
            zlib: {
                level: 9
            }
        });
        return new Promise(async (res, rej) => {
            this.archive.on('warning', err => {
                logger.warn('Warning to archive a file in ' + exportModel.filename, Object.assign(Object.assign({}, lTags()), { err }));
            });
            this.archive.on('error', err => {
                rej(err);
            });
            this.archive.pipe(output);
            try {
                for (const { exporter, jsonFilename } of this.buildExporters(exportModel, user)) {
                    const { json, staticFiles, activityPub, activityPubOutbox } = await exporter.export();
                    logger.debug(`Adding JSON file ${jsonFilename} in archive ${exportModel.filename}`, lTags());
                    this.appendJSON(json, join('peertube', jsonFilename));
                    if (activityPub) {
                        const activityPubFilename = exporter.getActivityPubFilename();
                        if (!activityPubFilename)
                            throw new Error('ActivityPub filename is required for exporter that export activity pub data');
                        this.appendJSON(activityPub, join('activity-pub', activityPubFilename));
                    }
                    if (activityPubOutbox) {
                        activityPubOutboxStore = activityPubOutboxStore.concat(activityPubOutbox);
                    }
                    for (const file of staticFiles) {
                        const archivePath = join('files', parse(jsonFilename).name, file.archivePath);
                        logger.debug(`Adding static file ${archivePath} in archive`, lTags());
                        try {
                            await this.addToArchiveAndWait(await file.readStreamFactory(), archivePath);
                        }
                        catch (err) {
                            logger.error(`Cannot add ${archivePath} in archive`, Object.assign({ err }, lTags()));
                        }
                    }
                }
                this.appendJSON(await activityPubContextify(activityPubCollection('outbox.json', activityPubOutboxStore), 'Video', getContextFilter()), join('activity-pub', 'outbox.json'));
                await this.archive.finalize();
                res();
            }
            catch (err) {
                this.archive.abort();
                rej(err);
            }
        });
    }
    buildExporters(exportModel, user) {
        const options = {
            user,
            activityPubFilenames: {
                dislikes: 'dislikes.json',
                likes: 'likes.json',
                outbox: 'outbox.json',
                following: 'following.json',
                account: 'actor.json'
            }
        };
        return [
            {
                jsonFilename: 'videos.json',
                exporter: new VideosExporter(Object.assign(Object.assign({}, options), { relativeStaticDirPath: '../files/videos', withVideoFiles: exportModel.withVideoFiles }))
            },
            {
                jsonFilename: 'channels.json',
                exporter: new ChannelsExporter(Object.assign(Object.assign({}, options), { relativeStaticDirPath: '../files/channels' }))
            },
            {
                jsonFilename: 'account.json',
                exporter: new AccountExporter(Object.assign(Object.assign({}, options), { relativeStaticDirPath: '../files/account' }))
            },
            {
                jsonFilename: 'blocklist.json',
                exporter: new BlocklistExporter(options)
            },
            {
                jsonFilename: 'likes.json',
                exporter: new LikesExporter(options)
            },
            {
                jsonFilename: 'dislikes.json',
                exporter: new DislikesExporter(options)
            },
            {
                jsonFilename: 'follower.json',
                exporter: new FollowersExporter(options)
            },
            {
                jsonFilename: 'following.json',
                exporter: new FollowingExporter(options)
            },
            {
                jsonFilename: 'user-settings.json',
                exporter: new UserSettingsExporter(options)
            },
            {
                jsonFilename: 'comments.json',
                exporter: new CommentsExporter(options)
            },
            {
                jsonFilename: 'video-playlists.json',
                exporter: new VideoPlaylistsExporter(Object.assign(Object.assign({}, options), { relativeStaticDirPath: '../files/video-playlists' }))
            },
            {
                jsonFilename: 'video-history.json',
                exporter: new UserVideoHistoryExporter(options)
            },
            {
                jsonFilename: 'watched-words-lists.json',
                exporter: new WatchedWordsListsExporter(options)
            },
            {
                jsonFilename: 'automatic-tag-policies.json',
                exporter: new AutoTagPoliciesExporter(options)
            }
        ];
    }
    addToArchiveAndWait(stream, archivePath) {
        let errored = false;
        return new Promise((res, rej) => {
            const self = this;
            function cleanup() {
                self.archive.off('entry', entryListener);
            }
            function entryListener({ name }) {
                if (name !== archivePath)
                    return;
                cleanup();
                return res();
            }
            stream.once('error', err => {
                cleanup();
                errored = true;
                return rej(err);
            });
            this.archive.on('entry', entryListener);
            stream.once('readable', () => {
                if (errored)
                    return;
                this.archive.append(stream, { name: archivePath });
            });
        });
    }
    appendJSON(json, name) {
        this.archive.append(JSON.stringify(json, undefined, 2), { name });
    }
}
//# sourceMappingURL=user-exporter.js.map