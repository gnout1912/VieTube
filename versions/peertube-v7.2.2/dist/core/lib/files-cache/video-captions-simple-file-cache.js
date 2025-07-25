import { join } from 'path';
import { logger } from '../../helpers/logger.js';
import { doRequestAndSaveToFile } from '../../helpers/requests.js';
import { FILES_CACHE } from '../../initializers/constants.js';
import { VideoModel } from '../../models/video/video.js';
import { VideoCaptionModel } from '../../models/video/video-caption.js';
import { AbstractSimpleFileCache } from './shared/abstract-simple-file-cache.js';
class VideoCaptionsSimpleFileCache extends AbstractSimpleFileCache {
    constructor() {
        super();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    async getFilePathImpl(filename) {
        const videoCaption = await VideoCaptionModel.loadWithVideoByFilename(filename);
        if (!videoCaption)
            return undefined;
        if (videoCaption.isOwned()) {
            return { isOwned: true, path: videoCaption.getFSFilePath() };
        }
        return this.loadRemoteFile(filename);
    }
    async loadRemoteFile(key) {
        const videoCaption = await VideoCaptionModel.loadWithVideoByFilename(key);
        if (!videoCaption)
            return undefined;
        if (videoCaption.isOwned())
            throw new Error('Cannot load remote caption of owned video.');
        const video = await VideoModel.loadFull(videoCaption.videoId);
        if (!video)
            return undefined;
        const remoteUrl = videoCaption.getOriginFileUrl(video);
        const destPath = join(FILES_CACHE.VIDEO_CAPTIONS.DIRECTORY, videoCaption.filename);
        try {
            await doRequestAndSaveToFile(remoteUrl, destPath);
            return { isOwned: false, path: destPath };
        }
        catch (err) {
            logger.info('Cannot fetch remote caption file %s.', remoteUrl, { err });
            return undefined;
        }
    }
}
export { VideoCaptionsSimpleFileCache };
//# sourceMappingURL=video-captions-simple-file-cache.js.map