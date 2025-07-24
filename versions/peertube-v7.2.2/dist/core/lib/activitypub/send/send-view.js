import { VideoViewsManager } from '../../views/video-views-manager.js';
import { logger } from '../../../helpers/logger.js';
import { audiencify, getAudience } from '../audience.js';
import { getLocalVideoViewActivityPubUrl } from '../url.js';
import { sendVideoRelatedActivity } from './shared/send-utils.js';
async function sendView(options) {
    const { byActor, viewersCount, video, viewerIdentifier, transaction } = options;
    logger.info('Creating job to send %s of %s.', viewersCount !== undefined ? 'viewer' : 'view', video.url);
    const activityBuilder = (audience) => {
        const url = getLocalVideoViewActivityPubUrl(byActor, video, viewerIdentifier);
        return buildViewActivity({ url, byActor, video, audience, viewersCount });
    };
    return sendVideoRelatedActivity(activityBuilder, { byActor, video, transaction, contextType: 'View', parallelizable: true });
}
export { sendView };
function buildViewActivity(options) {
    const { url, byActor, viewersCount, video, audience = getAudience(byActor) } = options;
    const base = {
        id: url,
        type: 'View',
        actor: byActor.url,
        object: video.url
    };
    if (viewersCount === undefined) {
        return audiencify(base, audience);
    }
    return audiencify(Object.assign(Object.assign({}, base), { expires: new Date(VideoViewsManager.Instance.buildViewerExpireTime()).toISOString(), result: {
            interactionType: 'WatchAction',
            type: 'InteractionCounter',
            userInteractionCount: viewersCount
        } }), audience);
}
//# sourceMappingURL=send-view.js.map