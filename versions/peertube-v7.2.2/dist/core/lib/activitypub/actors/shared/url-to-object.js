import { sanitizeAndCheckActorObject } from '../../../../helpers/custom-validators/activitypub/actor.js';
import { isUrlValid } from '../../../../helpers/custom-validators/activitypub/misc.js';
import { logger } from '../../../../helpers/logger.js';
import { fetchAP } from '../../activity.js';
import { checkUrlsSameHost } from '../../url.js';
export async function fetchRemoteActor(actorUrl, canRefetchPublicKeyOwner = true) {
    logger.info('Fetching remote actor %s.', actorUrl);
    const { body, statusCode } = await fetchAP(actorUrl);
    if (sanitizeAndCheckActorObject(body) === false) {
        logger.debug('Remote actor JSON is not valid.', { actorJSON: body });
        if (canRefetchPublicKeyOwner && hasPublicKeyOwner(actorUrl, body)) {
            logger.debug('Retrying with public key owner ' + body.publicKey.owner);
            return fetchRemoteActor(body.publicKey.owner, false);
        }
        return { actorObject: undefined, statusCode };
    }
    if (checkUrlsSameHost(body.id, actorUrl) !== true) {
        logger.warn('Actor url %s has not the same host than its AP id %s', actorUrl, body.id);
        return { actorObject: undefined, statusCode };
    }
    return {
        statusCode,
        actorObject: body
    };
}
export async function fetchActorFollowsCount(actorObject) {
    let followersCount = 0;
    let followingCount = 0;
    if (actorObject.followers)
        followersCount = await fetchActorTotalItems(actorObject.followers);
    if (actorObject.following)
        followingCount = await fetchActorTotalItems(actorObject.following);
    return { followersCount, followingCount };
}
async function fetchActorTotalItems(url) {
    try {
        const { body } = await fetchAP(url);
        return body.totalItems || 0;
    }
    catch (err) {
        logger.info('Cannot fetch remote actor count %s.', url, { err });
        return 0;
    }
}
function hasPublicKeyOwner(actorUrl, actor) {
    var _a;
    return isUrlValid((_a = actor === null || actor === void 0 ? void 0 : actor.publicKey) === null || _a === void 0 ? void 0 : _a.owner) && checkUrlsSameHost(actorUrl, actor.publicKey.owner);
}
//# sourceMappingURL=url-to-object.js.map