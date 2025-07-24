import { FileStorage } from '@peertube/peertube-models';
import { buildUUID } from '@peertube/peertube-node-utils';
import { logger, loggerTagsFactory } from '../helpers/logger.js';
import { extractVideo } from '../helpers/video.js';
import { CONFIG } from '../initializers/config.js';
import { DIRECTORIES } from '../initializers/constants.js';
import { Mutex } from 'async-mutex';
import { remove } from 'fs-extra/esm';
import { extname, join } from 'path';
import { makeHLSFileAvailable, makeWebVideoFileAvailable } from './object-storage/index.js';
import { getHLSDirectory, getHLSResolutionPlaylistFilename } from './paths.js';
import { isVideoInPrivateDirectory } from './video-privacy.js';
const lTags = loggerTagsFactory('video-path-manager');
class VideoPathManager {
    constructor() {
        this.videoFileMutexStore = new Map();
    }
    getFSHLSOutputPath(video, filename) {
        const base = getHLSDirectory(video);
        if (!filename)
            return base;
        return join(base, filename);
    }
    getFSVideoFileOutputPath(videoOrPlaylist, videoFile) {
        const video = extractVideo(videoOrPlaylist);
        if (videoFile.isHLS()) {
            return join(getHLSDirectory(video), videoFile.filename);
        }
        if (isVideoInPrivateDirectory(video.privacy)) {
            return join(DIRECTORIES.WEB_VIDEOS.PRIVATE, videoFile.filename);
        }
        return join(DIRECTORIES.WEB_VIDEOS.PUBLIC, videoFile.filename);
    }
    getFSOriginalVideoFilePath(filename) {
        return join(DIRECTORIES.ORIGINAL_VIDEOS, filename);
    }
    async makeAvailableVideoFiles(videoFiles, cb) {
        const createMethods = [];
        for (const videoFile of videoFiles) {
            if (videoFile.storage === FileStorage.FILE_SYSTEM) {
                createMethods.push({
                    method: () => this.getFSVideoFileOutputPath(videoFile.getVideoOrStreamingPlaylist(), videoFile),
                    clean: false
                });
                continue;
            }
            const destination = this.buildTMPDestination(videoFile.filename);
            if (videoFile.isHLS()) {
                const playlist = videoFile.VideoStreamingPlaylist;
                createMethods.push({
                    method: () => makeHLSFileAvailable(playlist, videoFile.filename, destination),
                    clean: true
                });
            }
            else {
                createMethods.push({
                    method: () => makeWebVideoFileAvailable(videoFile.filename, destination),
                    clean: true
                });
            }
        }
        return this.makeAvailableFactory({ createMethods, cbContext: cb });
    }
    async makeAvailableVideoFile(videoFile, cb) {
        return this.makeAvailableVideoFiles([videoFile], paths => cb(paths[0]));
    }
    async makeAvailableMaxQualityFiles(video, cb) {
        const { videoFile, separatedAudioFile } = video.getMaxQualityAudioAndVideoFiles();
        const files = [videoFile];
        if (separatedAudioFile)
            files.push(separatedAudioFile);
        return this.makeAvailableVideoFiles(files, ([videoPath, separatedAudioPath]) => {
            return cb({ videoPath, separatedAudioPath });
        });
    }
    async makeAvailableResolutionPlaylistFile(videoFile, cb) {
        const filename = getHLSResolutionPlaylistFilename(videoFile.filename);
        if (videoFile.storage === FileStorage.FILE_SYSTEM) {
            return this.makeAvailableFactory({
                createMethods: [
                    {
                        method: () => join(getHLSDirectory(videoFile.getVideo()), filename),
                        clean: false
                    }
                ],
                cbContext: paths => cb(paths[0])
            });
        }
        const playlist = videoFile.VideoStreamingPlaylist;
        return this.makeAvailableFactory({
            createMethods: [
                {
                    method: () => makeHLSFileAvailable(playlist, filename, this.buildTMPDestination(filename)),
                    clean: true
                }
            ],
            cbContext: paths => cb(paths[0])
        });
    }
    async makeAvailablePlaylistFile(playlist, filename, cb) {
        if (playlist.storage === FileStorage.FILE_SYSTEM) {
            return this.makeAvailableFactory({
                createMethods: [
                    {
                        method: () => join(getHLSDirectory(playlist.Video), filename),
                        clean: false
                    }
                ],
                cbContext: paths => cb(paths[0])
            });
        }
        return this.makeAvailableFactory({
            createMethods: [
                {
                    method: () => makeHLSFileAvailable(playlist, filename, this.buildTMPDestination(filename)),
                    clean: true
                }
            ],
            cbContext: paths => cb(paths[0])
        });
    }
    async lockFiles(videoUUID) {
        if (!this.videoFileMutexStore.has(videoUUID)) {
            this.videoFileMutexStore.set(videoUUID, new Mutex());
        }
        const mutex = this.videoFileMutexStore.get(videoUUID);
        const releaser = await mutex.acquire();
        logger.debug('Locked files of %s.', videoUUID, lTags(videoUUID));
        return releaser;
    }
    unlockFiles(videoUUID) {
        const mutex = this.videoFileMutexStore.get(videoUUID);
        mutex.release();
        logger.debug('Released lockfiles of %s.', videoUUID, lTags(videoUUID));
    }
    async makeAvailableFactory(options) {
        const { cbContext, createMethods } = options;
        let result;
        const created = [];
        const cleanup = async () => {
            for (const { destination, clean } of created) {
                if (!destination || !clean)
                    continue;
                try {
                    await remove(destination);
                }
                catch (err) {
                    logger.error('Cannot remove ' + destination, { err });
                }
            }
        };
        for (const { method, clean } of createMethods) {
            created.push({
                destination: await method(),
                clean
            });
        }
        try {
            result = await cbContext(created.map(c => c.destination));
        }
        catch (err) {
            await cleanup();
            throw err;
        }
        await cleanup();
        return result;
    }
    buildTMPDestination(filename) {
        return join(CONFIG.STORAGE.TMP_DIR, buildUUID() + extname(filename));
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { VideoPathManager };
//# sourceMappingURL=video-path-manager.js.map