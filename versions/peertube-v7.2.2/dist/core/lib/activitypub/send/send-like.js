import { logger } from '../../../helpers/logger.js';
import { audiencify, getAudience } from '../audience.js';
import { getVideoLikeActivityPubUrlByLocalActor } from '../url.js';
import { sendVideoActivityToOrigin } from './shared/send-utils.js';
function sendLike(byActor, video, transaction) {
    logger.info('Creating job to like %s.', video.url);
    const activityBuilder = (audience) => {
        const url = getVideoLikeActivityPubUrlByLocalActor(byActor, video);
        return buildLikeActivity(url, byActor, video, audience);
    };
    return sendVideoActivityToOrigin(activityBuilder, { byActor, video, transaction, contextType: 'Rate' });
}
function buildLikeActivity(url, byActor, video, audience) {
    if (!audience)
        audience = getAudience(byActor);
    return audiencify({
        id: url,
        type: 'Like',
        actor: byActor.url,
        object: video.url
    }, audience);
}
export { sendLike, buildLikeActivity };
//# sourceMappingURL=send-like.js.map