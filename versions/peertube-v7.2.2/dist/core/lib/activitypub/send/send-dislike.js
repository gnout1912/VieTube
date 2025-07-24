import { logger } from '../../../helpers/logger.js';
import { audiencify, getAudience } from '../audience.js';
import { getVideoDislikeActivityPubUrlByLocalActor } from '../url.js';
import { sendVideoActivityToOrigin } from './shared/send-utils.js';
function sendDislike(byActor, video, transaction) {
    logger.info('Creating job to dislike %s.', video.url);
    const activityBuilder = (audience) => {
        const url = getVideoDislikeActivityPubUrlByLocalActor(byActor, video);
        return buildDislikeActivity(url, byActor, video, audience);
    };
    return sendVideoActivityToOrigin(activityBuilder, { byActor, video, transaction, contextType: 'Rate' });
}
function buildDislikeActivity(url, byActor, video, audience) {
    if (!audience)
        audience = getAudience(byActor);
    return audiencify({
        id: url,
        type: 'Dislike',
        actor: byActor.url,
        object: video.url
    }, audience);
}
export { sendDislike, buildDislikeActivity };
//# sourceMappingURL=send-dislike.js.map