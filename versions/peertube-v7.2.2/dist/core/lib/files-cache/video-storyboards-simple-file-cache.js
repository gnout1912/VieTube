import { join } from 'path';
import { logger } from '../../helpers/logger.js';
import { doRequestAndSaveToFile } from '../../helpers/requests.js';
import { StoryboardModel } from '../../models/video/storyboard.js';
import { FILES_CACHE } from '../../initializers/constants.js';
import { AbstractSimpleFileCache } from './shared/abstract-simple-file-cache.js';
class VideoStoryboardsSimpleFileCache extends AbstractSimpleFileCache {
    constructor() {
        super();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    async getFilePathImpl(filename) {
        const storyboard = await StoryboardModel.loadWithVideoByFilename(filename);
        if (!storyboard)
            return undefined;
        if (storyboard.Video.isOwned())
            return { isOwned: true, path: storyboard.getPath() };
        return this.loadRemoteFile(storyboard.filename);
    }
    async loadRemoteFile(key) {
        const storyboard = await StoryboardModel.loadWithVideoByFilename(key);
        if (!storyboard)
            return undefined;
        const destPath = join(FILES_CACHE.STORYBOARDS.DIRECTORY, storyboard.filename);
        const remoteUrl = storyboard.getOriginFileUrl(storyboard.Video);
        try {
            await doRequestAndSaveToFile(remoteUrl, destPath);
            logger.debug('Fetched remote storyboard %s to %s.', remoteUrl, destPath);
            return { isOwned: false, path: destPath };
        }
        catch (err) {
            logger.info('Cannot fetch remote storyboard file %s.', remoteUrl, { err });
            return undefined;
        }
    }
}
export { VideoStoryboardsSimpleFileCache };
//# sourceMappingURL=video-storyboards-simple-file-cache.js.map