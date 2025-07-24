import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { VideoModel } from '../../../models/video/video.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { ActorFollowHealthCache } from '../../actor-follow-health-cache.js';
import { fetchRemoteVideo, syncVideoExternalAttributes } from './shared/index.js';
import { APVideoUpdater } from './updater.js';
async function refreshVideoIfNeeded(options) {
    if (!options.video.isOutdated())
        return options.video;
    const video = options.fetchedType === 'all'
        ? options.video
        : await VideoModel.loadByUrlAndPopulateAccountAndFiles(options.video.url);
    const lTags = loggerTagsFactory('ap', 'video', 'refresh', video.uuid, video.url);
    logger.info('Refreshing video %s.', video.url, lTags());
    try {
        const { videoObject } = await fetchRemoteVideo(video.url);
        if (videoObject === undefined) {
            logger.warn('Cannot refresh remote video %s: invalid body.', video.url, lTags());
            await video.setAsRefreshed();
            return video;
        }
        const videoUpdater = new APVideoUpdater(videoObject, video);
        await videoUpdater.update();
        await syncVideoExternalAttributes(video, videoObject, options.syncParam);
        ActorFollowHealthCache.Instance.addGoodServerId(video.VideoChannel.Actor.serverId);
        return video;
    }
    catch (err) {
        const statusCode = err.statusCode;
        if (statusCode === HttpStatusCode.NOT_FOUND_404 || statusCode === HttpStatusCode.GONE_410) {
            logger.info('Cannot refresh remote video %s: video does not exist anymore (404/410 error code). Deleting it.', video.url, lTags());
            await video.destroy();
            return undefined;
        }
        logger.warn('Cannot refresh video %s.', options.video.url, Object.assign({ err }, lTags()));
        ActorFollowHealthCache.Instance.addBadServerId(video.VideoChannel.Actor.serverId);
        await video.setAsRefreshed();
        return video;
    }
}
export { refreshVideoIfNeeded };
//# sourceMappingURL=refresh.js.map