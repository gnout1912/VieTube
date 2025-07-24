import { logger } from '../../../helpers/logger.js';
import { unicastTo } from './shared/send-utils.js';
function sendFollow(actorFollow, t) {
    const me = actorFollow.ActorFollower;
    const following = actorFollow.ActorFollowing;
    if (!following.serverId)
        return;
    logger.info('Creating job to send follow request to %s.', following.url);
    const data = buildFollowActivity(actorFollow.url, me, following);
    return t.afterCommit(() => {
        return unicastTo({ data, byActor: me, toActorUrl: following.inboxUrl, contextType: 'Follow' });
    });
}
function buildFollowActivity(url, byActor, targetActor) {
    return {
        type: 'Follow',
        id: url,
        actor: byActor.url,
        object: targetActor.url
    };
}
export { sendFollow, buildFollowActivity };
//# sourceMappingURL=send-follow.js.map