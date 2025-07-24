import { UserImportState } from '@peertube/peertube-models';
import { getFilenameWithoutExt, getFileSize } from '@peertube/peertube-node-utils';
import { saveInTransactionWithRetries } from '../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { unzip } from '../../helpers/unzip.js';
import { UserModel } from '../../models/user/user.js';
import { remove } from 'fs-extra/esm';
import { dirname, join } from 'path';
import { getFSUserImportFilePath } from '../paths.js';
import { BlocklistImporter } from './importers/account-blocklist-importer.js';
import { AccountImporter } from './importers/account-importer.js';
import { ChannelsImporter } from './importers/channels-importer.js';
import { DislikesImporter } from './importers/dislikes-importer.js';
import { FollowingImporter } from './importers/following-importer.js';
import { LikesImporter } from './importers/likes-importer.js';
import { ReviewCommentsTagPoliciesImporter } from './importers/review-comments-tag-policies-importer.js';
import { UserSettingsImporter } from './importers/user-settings-importer.js';
import { UserVideoHistoryImporter } from './importers/user-video-history-importer.js';
import { VideoPlaylistsImporter } from './importers/video-playlists-importer.js';
import { VideosImporter } from './importers/videos-importer.js';
import { WatchedWordsListsImporter } from './importers/watched-words-lists-importer.js';
import { parseBytes } from '../../helpers/core-utils.js';
const lTags = loggerTagsFactory('user-import');
export class UserImporter {
    async import(importModel) {
        const resultSummary = {
            stats: {
                blocklist: this.buildSummary(),
                channels: this.buildSummary(),
                likes: this.buildSummary(),
                dislikes: this.buildSummary(),
                following: this.buildSummary(),
                videoPlaylists: this.buildSummary(),
                videos: this.buildSummary(),
                account: this.buildSummary(),
                userSettings: this.buildSummary(),
                userVideoHistory: this.buildSummary(),
                watchedWordsLists: this.buildSummary(),
                commentAutoTagPolicies: this.buildSummary()
            }
        };
        try {
            importModel.state = UserImportState.PROCESSING;
            await saveInTransactionWithRetries(importModel);
            const inputZip = getFSUserImportFilePath(importModel);
            this.extractedDirectory = join(dirname(inputZip), getFilenameWithoutExt(inputZip));
            await unzip({
                source: inputZip,
                destination: this.extractedDirectory,
                maxSize: Math.max(await getFileSize(inputZip) * 2, parseBytes('1GB')),
                maxFiles: 10000
            });
            const user = await UserModel.loadByIdFull(importModel.userId);
            for (const { name, importer } of this.buildImporters(user)) {
                try {
                    const { duplicates, errors, success } = await importer.import();
                    resultSummary.stats[name].duplicates += duplicates;
                    resultSummary.stats[name].errors += errors;
                    resultSummary.stats[name].success += success;
                }
                catch (err) {
                    logger.error(`Cannot import ${importer.getJSONFilePath()} from ${inputZip}`, Object.assign({ err }, lTags()));
                    resultSummary.stats[name].errors++;
                }
            }
            importModel.state = UserImportState.COMPLETED;
            importModel.resultSummary = resultSummary;
            await saveInTransactionWithRetries(importModel);
        }
        catch (err) {
            logger.error('Cannot import user archive', Object.assign({ err }, lTags()));
            try {
                importModel.state = UserImportState.ERRORED;
                importModel.error = err.message;
                await saveInTransactionWithRetries(importModel);
            }
            catch (innerErr) {
                logger.error('Cannot set import error state', Object.assign({ err: innerErr }, lTags()));
            }
            throw err;
        }
        finally {
            try {
                await remove(getFSUserImportFilePath(importModel));
                await remove(this.extractedDirectory);
            }
            catch (innerErr) {
                logger.error('Cannot remove import archive and directory after failure', Object.assign({ err: innerErr }, lTags()));
            }
        }
    }
    buildImporters(user) {
        return [
            {
                name: 'account',
                importer: new AccountImporter(this.buildImporterOptions(user, 'account.json'))
            },
            {
                name: 'userSettings',
                importer: new UserSettingsImporter(this.buildImporterOptions(user, 'user-settings.json'))
            },
            {
                name: 'channels',
                importer: new ChannelsImporter(this.buildImporterOptions(user, 'channels.json'))
            },
            {
                name: 'blocklist',
                importer: new BlocklistImporter(this.buildImporterOptions(user, 'blocklist.json'))
            },
            {
                name: 'following',
                importer: new FollowingImporter(this.buildImporterOptions(user, 'following.json'))
            },
            {
                name: 'videos',
                importer: new VideosImporter(this.buildImporterOptions(user, 'videos.json'))
            },
            {
                name: 'likes',
                importer: new LikesImporter(this.buildImporterOptions(user, 'likes.json'))
            },
            {
                name: 'dislikes',
                importer: new DislikesImporter(this.buildImporterOptions(user, 'dislikes.json'))
            },
            {
                name: 'videoPlaylists',
                importer: new VideoPlaylistsImporter(this.buildImporterOptions(user, 'video-playlists.json'))
            },
            {
                name: 'userVideoHistory',
                importer: new UserVideoHistoryImporter(this.buildImporterOptions(user, 'video-history.json'))
            },
            {
                name: 'watchedWordsLists',
                importer: new WatchedWordsListsImporter(this.buildImporterOptions(user, 'watched-words-lists.json'))
            },
            {
                name: 'commentAutoTagPolicies',
                importer: new ReviewCommentsTagPoliciesImporter(this.buildImporterOptions(user, 'automatic-tag-policies.json'))
            }
        ];
    }
    buildImporterOptions(user, jsonFilename) {
        return {
            extractedDirectory: this.extractedDirectory,
            user,
            jsonFilePath: join(this.extractedDirectory, 'peertube', jsonFilename)
        };
    }
    buildSummary() {
        return { success: 0, duplicates: 0, errors: 0 };
    }
}
//# sourceMappingURL=user-importer.js.map