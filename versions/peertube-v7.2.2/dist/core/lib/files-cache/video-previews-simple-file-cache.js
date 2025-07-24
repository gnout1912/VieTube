import { join } from 'path';
import { FILES_CACHE } from '../../initializers/constants.js';
import { VideoModel } from '../../models/video/video.js';
import { AbstractSimpleFileCache } from './shared/abstract-simple-file-cache.js';
import { doRequestAndSaveToFile } from '../../helpers/requests.js';
import { ThumbnailModel } from '../../models/video/thumbnail.js';
import { ThumbnailType } from '@peertube/peertube-models';
import { logger } from '../../helpers/logger.js';
class VideoPreviewsSimpleFileCache extends AbstractSimpleFileCache {
    constructor() {
        super();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    async getFilePathImpl(filename) {
        const thumbnail = await ThumbnailModel.loadWithVideoByFilename(filename, ThumbnailType.PREVIEW);
        if (!thumbnail)
            return undefined;
        if (thumbnail.Video.isOwned())
            return { isOwned: true, path: thumbnail.getPath() };
        return this.loadRemoteFile(thumbnail.Video.uuid);
    }
    async loadRemoteFile(key) {
        const video = await VideoModel.loadFull(key);
        if (!video)
            return undefined;
        if (video.isOwned())
            throw new Error('Cannot load remote preview of owned video.');
        const preview = video.getPreview();
        const destPath = join(FILES_CACHE.PREVIEWS.DIRECTORY, preview.filename);
        const remoteUrl = preview.getOriginFileUrl(video);
        try {
            await doRequestAndSaveToFile(remoteUrl, destPath);
            logger.debug('Fetched remote preview %s to %s.', remoteUrl, destPath);
            return { isOwned: false, path: destPath };
        }
        catch (err) {
            logger.info('Cannot fetch remote preview file %s.', remoteUrl, { err });
            return undefined;
        }
    }
}
export { VideoPreviewsSimpleFileCache };
//# sourceMappingURL=video-previews-simple-file-cache.js.map