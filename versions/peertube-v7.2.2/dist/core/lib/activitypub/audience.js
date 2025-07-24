import { getAPPublicValue } from '../../helpers/activity-pub-utils.js';
export function getAudience(actorSender, isPublic = true) {
    return buildAudience([actorSender.followersUrl], isPublic);
}
export function buildAudience(followerUrls, isPublic = true) {
    let to = [];
    let cc = [];
    if (isPublic) {
        to = [getAPPublicValue()];
        cc = followerUrls;
    }
    else {
        to = [];
        cc = [];
    }
    return { to, cc };
}
export function audiencify(object, audience) {
    return Object.assign(Object.assign({}, audience), object);
}
//# sourceMappingURL=audience.js.map