import { VideoViewsManager } from '../../views/video-views-manager.js';
import { forwardVideoRelatedActivity } from '../send/shared/send-utils.js';
import { getOrCreateAPVideo } from '../videos/index.js';
async function processViewActivity(options) {
    const { activity, byActor } = options;
    return processCreateView(activity, byActor);
}
export { processViewActivity };
async function processCreateView(activity, byActor) {
    const videoObject = activity.object;
    const { video } = await getOrCreateAPVideo({
        videoObject,
        fetchType: 'only-video-and-blacklist',
        allowRefresh: false
    });
    await VideoViewsManager.Instance.processRemoteView({
        video,
        viewerId: activity.id,
        viewerExpires: getExpires(activity)
            ? new Date(getExpires(activity))
            : undefined,
        viewerResultCounter: getViewerResultCounter(activity)
    });
    if (video.isOwned()) {
        const exceptions = [byActor];
        await forwardVideoRelatedActivity(activity, undefined, exceptions, video);
    }
}
function getViewerResultCounter(activity) {
    const result = activity.result;
    if (!getExpires(activity) || (result === null || result === void 0 ? void 0 : result.interactionType) !== 'WatchAction' || (result === null || result === void 0 ? void 0 : result.type) !== 'InteractionCounter')
        return undefined;
    const counter = parseInt(result.userInteractionCount + '');
    if (isNaN(counter))
        return undefined;
    return counter;
}
function getExpires(activity) {
    return activity.expires || activity['expiration'];
}
//# sourceMappingURL=process-view.js.map