import { logger } from '../../../helpers/logger.js';
import { getLocalActorFollowAcceptActivityPubUrl } from '../url.js';
import { buildFollowActivity } from './send-follow.js';
import { unicastTo } from './shared/send-utils.js';
function sendAccept(actorFollow) {
    const follower = actorFollow.ActorFollower;
    const me = actorFollow.ActorFollowing;
    if (!follower.serverId) {
        logger.warn('Do not sending accept to local follower.');
        return;
    }
    logger.info('Creating job to accept follower %s.', follower.url);
    const followData = buildFollowActivity(actorFollow.url, follower, me);
    const url = getLocalActorFollowAcceptActivityPubUrl(actorFollow);
    const data = buildAcceptActivity(url, me, followData);
    return unicastTo({
        data,
        byActor: me,
        toActorUrl: follower.inboxUrl,
        contextType: 'Accept'
    });
}
export { sendAccept };
function buildAcceptActivity(url, byActor, followActivityData) {
    return {
        type: 'Accept',
        id: url,
        actor: byActor.url,
        object: followActivityData
    };
}
//# sourceMappingURL=send-accept.js.map