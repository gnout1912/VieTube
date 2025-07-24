import { logger } from '../../../helpers/logger.js';
import { audiencify, getAudience } from '../audience.js';
import { getLocalAbuseActivityPubUrl } from '../url.js';
import { unicastTo } from './shared/send-utils.js';
function sendAbuse(byActor, abuse, flaggedAccount, t) {
    if (!flaggedAccount.Actor.serverId)
        return;
    const url = getLocalAbuseActivityPubUrl(abuse);
    logger.info('Creating job to send abuse %s.', url);
    const audience = { to: [flaggedAccount.Actor.url], cc: [] };
    const flagActivity = buildFlagActivity(url, byActor, abuse, audience);
    return t.afterCommit(() => {
        return unicastTo({
            data: flagActivity,
            byActor,
            toActorUrl: flaggedAccount.Actor.getSharedInbox(),
            contextType: 'Flag'
        });
    });
}
function buildFlagActivity(url, byActor, abuse, audience) {
    if (!audience)
        audience = getAudience(byActor);
    const activity = Object.assign({ id: url, actor: byActor.url }, abuse.toActivityPubObject());
    return audiencify(activity, audience);
}
export { sendAbuse };
//# sourceMappingURL=send-flag.js.map