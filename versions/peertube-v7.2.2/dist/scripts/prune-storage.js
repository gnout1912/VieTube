import { createCommand } from '@commander-js/extra-typings';
import { uniqify } from '@peertube/peertube-core-utils';
import { FileStorage, ThumbnailType } from '@peertube/peertube-models';
import { DIRECTORIES, USER_EXPORT_FILE_PREFIX } from '../core/initializers/constants.js';
import { listKeysOfPrefix, removeObjectByFullKey } from '../core/lib/object-storage/object-storage-helpers.js';
import { UserExportModel } from '../core/models/user/user-export.js';
import { StoryboardModel } from '../core/models/video/storyboard.js';
import { VideoCaptionModel } from '../core/models/video/video-caption.js';
import { VideoFileModel } from '../core/models/video/video-file.js';
import { VideoSourceModel } from '../core/models/video/video-source.js';
import { VideoStreamingPlaylistModel } from '../core/models/video/video-streaming-playlist.js';
import Bluebird from 'bluebird';
import { remove } from 'fs-extra/esm';
import { readdir, stat } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { getUUIDFromFilename } from '../core/helpers/utils.js';
import { CONFIG } from '../core/initializers/config.js';
import { initDatabaseModels } from '../core/initializers/database.js';
import { ActorImageModel } from '../core/models/actor/actor-image.js';
import { VideoRedundancyModel } from '../core/models/redundancy/video-redundancy.js';
import { ThumbnailModel } from '../core/models/video/thumbnail.js';
import { VideoModel } from '../core/models/video/video.js';
import { askConfirmation, displayPeerTubeMustBeStoppedWarning } from './shared/common.js';
const program = createCommand()
    .description('Remove unused local objects (video files, captions, user exports...) from object storage or file system')
    .option('-y, --yes', 'Auto confirm files deletion')
    .parse(process.argv);
const options = program.opts();
run()
    .then(() => process.exit(0))
    .catch(err => {
    console.error(err);
    process.exit(-1);
});
async function run() {
    await initDatabaseModels(true);
    displayPeerTubeMustBeStoppedWarning();
    await new FSPruner().prune();
    console.log('\n');
    await new ObjectStoragePruner().prune();
}
class ObjectStoragePruner {
    constructor() {
        this.keysToDelete = [];
    }
    async prune() {
        if (!CONFIG.OBJECT_STORAGE.ENABLED)
            return;
        console.log('Pruning object storage.');
        await this.findFilesToDelete(CONFIG.OBJECT_STORAGE.WEB_VIDEOS, this.doesWebVideoFileExistFactory());
        await this.findFilesToDelete(CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS, this.doesStreamingPlaylistFileExistFactory());
        await this.findFilesToDelete(CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES, this.doesOriginalFileExistFactory());
        await this.findFilesToDelete(CONFIG.OBJECT_STORAGE.USER_EXPORTS, this.doesUserExportFileExistFactory());
        await this.findFilesToDelete(CONFIG.OBJECT_STORAGE.CAPTIONS, this.doesCaptionFileExistFactory());
        if (this.keysToDelete.length === 0) {
            console.log('No unknown object storage files to delete.');
            return;
        }
        const formattedKeysToDelete = this.keysToDelete.map(({ bucket, key }) => ` In bucket ${bucket}: ${key}`).join('\n');
        console.log(`${this.keysToDelete.length} unknown files from object storage can be deleted:\n${formattedKeysToDelete}\n`);
        const res = await askPruneConfirmation(options.yes);
        if (res !== true) {
            console.log('Exiting without deleting object storage files.');
            return;
        }
        console.log('Deleting object storage files...\n');
        for (const { bucket, key } of this.keysToDelete) {
            await removeObjectByFullKey(key, { BUCKET_NAME: bucket });
        }
        console.log(`${this.keysToDelete.length} object storage files deleted.`);
    }
    async findFilesToDelete(config, existFun) {
        try {
            const keys = await listKeysOfPrefix('', config);
            await Bluebird.map(keys, async (key) => {
                if (await existFun(key) !== true) {
                    this.keysToDelete.push({ bucket: config.BUCKET_NAME, key });
                }
            }, { concurrency: 20 });
        }
        catch (err) {
            const prefixMessage = config.PREFIX
                ? ` and prefix ${config.PREFIX}`
                : '';
            console.error('Cannot find files to delete in bucket ' + config.BUCKET_NAME + prefixMessage, { err });
        }
    }
    doesWebVideoFileExistFactory() {
        return (key) => {
            const filename = this.sanitizeKey(key, CONFIG.OBJECT_STORAGE.WEB_VIDEOS);
            return VideoFileModel.doesOwnedWebVideoFileExist(filename, FileStorage.OBJECT_STORAGE);
        };
    }
    doesStreamingPlaylistFileExistFactory() {
        return (key) => {
            const sanitizedKey = this.sanitizeKey(key, CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
            const uuid = dirname(sanitizedKey).replace(/^hls\//, '');
            return VideoStreamingPlaylistModel.doesOwnedVideoUUIDExist(uuid, FileStorage.OBJECT_STORAGE);
        };
    }
    doesOriginalFileExistFactory() {
        return (key) => {
            const filename = this.sanitizeKey(key, CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES);
            return VideoSourceModel.doesOwnedFileExist(filename, FileStorage.OBJECT_STORAGE);
        };
    }
    doesUserExportFileExistFactory() {
        return (key) => {
            const filename = this.sanitizeKey(key, CONFIG.OBJECT_STORAGE.USER_EXPORTS);
            return UserExportModel.doesOwnedFileExist(filename, FileStorage.OBJECT_STORAGE);
        };
    }
    doesCaptionFileExistFactory() {
        return (key) => {
            const filename = this.sanitizeKey(key, CONFIG.OBJECT_STORAGE.CAPTIONS);
            return VideoCaptionModel.doesOwnedFileExist(filename, FileStorage.OBJECT_STORAGE);
        };
    }
    sanitizeKey(key, config) {
        return key.replace(new RegExp(`^${config.PREFIX}`), '');
    }
}
class FSPruner {
    constructor() {
        this.pathsToDelete = [];
    }
    async prune() {
        const dirs = Object.values(CONFIG.STORAGE);
        if (uniqify(dirs).length !== dirs.length) {
            console.error('Cannot prune storage because you put multiple storage keys in the same directory.');
            process.exit(0);
        }
        console.log('Pruning filesystem storage.');
        console.log('Detecting files to remove, it can take a while...');
        await this.findFilesToDelete(DIRECTORIES.WEB_VIDEOS.PUBLIC, this.doesWebVideoFileExistFactory());
        await this.findFilesToDelete(DIRECTORIES.WEB_VIDEOS.PRIVATE, this.doesWebVideoFileExistFactory());
        await this.findFilesToDelete(DIRECTORIES.HLS_STREAMING_PLAYLIST.PRIVATE, this.doesHLSPlaylistExistFactory());
        await this.findFilesToDelete(DIRECTORIES.HLS_STREAMING_PLAYLIST.PUBLIC, this.doesHLSPlaylistExistFactory());
        await this.findFilesToDelete(DIRECTORIES.ORIGINAL_VIDEOS, this.doesOriginalVideoExistFactory());
        await this.findFilesToDelete(CONFIG.STORAGE.TORRENTS_DIR, this.doesTorrentFileExistFactory());
        await this.findFilesToDelete(CONFIG.STORAGE.REDUNDANCY_DIR, this.doesRedundancyExistFactory());
        await this.findFilesToDelete(CONFIG.STORAGE.PREVIEWS_DIR, this.doesThumbnailExistFactory(true, ThumbnailType.PREVIEW));
        await this.findFilesToDelete(CONFIG.STORAGE.THUMBNAILS_DIR, this.doesThumbnailExistFactory(false, ThumbnailType.MINIATURE));
        await this.findFilesToDelete(CONFIG.STORAGE.CAPTIONS_DIR, this.doesCaptionExistFactory());
        await this.findFilesToDelete(CONFIG.STORAGE.STORYBOARDS_DIR, this.doesStoryboardExistFactory());
        await this.findFilesToDelete(CONFIG.STORAGE.ACTOR_IMAGES_DIR, this.doesActorImageExistFactory());
        await this.findFilesToDelete(CONFIG.STORAGE.TMP_PERSISTENT_DIR, this.doesUserExportExistFactory());
        const tmpFiles = await readdir(CONFIG.STORAGE.TMP_DIR);
        this.pathsToDelete = [...this.pathsToDelete, ...tmpFiles.map(t => join(CONFIG.STORAGE.TMP_DIR, t))];
        if (this.pathsToDelete.length === 0) {
            console.log('No unknown filesystem files to delete.');
            return;
        }
        const formattedKeysToDelete = this.pathsToDelete.map(p => ` ${p}`).join('\n');
        console.log(`${this.pathsToDelete.length} unknown files from filesystem can be deleted:\n${formattedKeysToDelete}\n`);
        const res = await askPruneConfirmation(options.yes);
        if (res !== true) {
            console.log('Exiting without deleting filesystem files.');
            return;
        }
        console.log('Deleting filesystem files...\n');
        for (const path of this.pathsToDelete) {
            await remove(path);
        }
        console.log(`${this.pathsToDelete.length} filesystem files deleted.`);
    }
    async findFilesToDelete(directory, existFun) {
        const files = await readdir(directory);
        await Bluebird.map(files, async (file) => {
            const filePath = join(directory, file);
            if (await existFun(filePath) !== true) {
                this.pathsToDelete.push(filePath);
            }
        }, { concurrency: 20 });
    }
    doesWebVideoFileExistFactory() {
        return (filePath) => {
            if (filePath === DIRECTORIES.WEB_VIDEOS.PRIVATE)
                return true;
            return VideoFileModel.doesOwnedWebVideoFileExist(basename(filePath), FileStorage.FILE_SYSTEM);
        };
    }
    doesHLSPlaylistExistFactory() {
        return (hlsPath) => {
            if (hlsPath === DIRECTORIES.HLS_STREAMING_PLAYLIST.PRIVATE)
                return true;
            return VideoStreamingPlaylistModel.doesOwnedVideoUUIDExist(basename(hlsPath), FileStorage.FILE_SYSTEM);
        };
    }
    doesOriginalVideoExistFactory() {
        return (filePath) => {
            return VideoSourceModel.doesOwnedFileExist(basename(filePath), FileStorage.FILE_SYSTEM);
        };
    }
    doesTorrentFileExistFactory() {
        return (filePath) => VideoFileModel.doesOwnedTorrentFileExist(basename(filePath));
    }
    doesThumbnailExistFactory(keepOnlyOwned, type) {
        return async (filePath) => {
            const thumbnail = await ThumbnailModel.loadByFilename(basename(filePath), type);
            if (!thumbnail)
                return false;
            if (keepOnlyOwned) {
                const video = await VideoModel.load(thumbnail.videoId);
                if (video.isOwned() === false)
                    return false;
            }
            return true;
        };
    }
    doesActorImageExistFactory() {
        return async (filePath) => {
            const image = await ActorImageModel.loadByFilename(basename(filePath));
            return !!image;
        };
    }
    doesStoryboardExistFactory() {
        return async (filePath) => {
            const storyboard = await StoryboardModel.loadByFilename(basename(filePath));
            return !!storyboard;
        };
    }
    doesCaptionExistFactory() {
        return async (filePath) => {
            const caption = await VideoCaptionModel.loadWithVideoByFilename(basename(filePath));
            return !!caption;
        };
    }
    doesRedundancyExistFactory() {
        return async (filePath) => {
            const isPlaylist = (await stat(filePath)).isDirectory();
            if (isPlaylist) {
                if (filePath === DIRECTORIES.HLS_REDUNDANCY)
                    return true;
                const uuid = getUUIDFromFilename(filePath);
                const video = await VideoModel.loadWithFiles(uuid);
                if (!video)
                    return false;
                const p = video.getHLSPlaylist();
                if (!p)
                    return false;
                const redundancy = await VideoRedundancyModel.loadLocalByStreamingPlaylistId(p.id);
                return !!redundancy;
            }
            return false;
        };
    }
    doesUserExportExistFactory() {
        return (filePath) => {
            const filename = basename(filePath);
            if (!filename.startsWith(USER_EXPORT_FILE_PREFIX))
                return true;
            return UserExportModel.doesOwnedFileExist(filename, FileStorage.FILE_SYSTEM);
        };
    }
}
async function askPruneConfirmation(yes) {
    if (yes === true)
        return true;
    return askConfirmation('These unknown files can be deleted, but please check your backups first (bugs happen). ' +
        'Can we delete these files?');
}
//# sourceMappingURL=prune-storage.js.map