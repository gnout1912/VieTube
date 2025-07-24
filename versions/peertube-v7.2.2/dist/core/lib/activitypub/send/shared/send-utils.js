import { ActorFollowHealthCache } from '../../../actor-follow-health-cache.js';
import { getServerActor } from '../../../../models/application/application.js';
import { afterCommitIfTransaction } from '../../../../helpers/database-utils.js';
import { logger } from '../../../../helpers/logger.js';
import { ActorFollowModel } from '../../../../models/actor/actor-follow.js';
import { ActorModel } from '../../../../models/actor/actor.js';
import { JobQueue } from '../../../job-queue/index.js';
import { getActorsInvolvedInVideo, getAudienceFromFollowersOf, getOriginVideoAudience } from './audience-utils.js';
import { arrayify } from '@peertube/peertube-core-utils';
async function sendVideoRelatedActivity(activityBuilder, options) {
    const { byActor, video, transaction, contextType, parallelizable } = options;
    if (video.isOwned() === false) {
        return sendVideoActivityToOrigin(activityBuilder, options);
    }
    const actorsInvolvedInVideo = await getActorsInvolvedInVideo(video, transaction);
    const audience = getAudienceFromFollowersOf(actorsInvolvedInVideo);
    const activity = activityBuilder(audience);
    const actorsException = [byActor];
    return broadcastToFollowers({
        data: activity,
        byActor,
        toFollowersOf: actorsInvolvedInVideo,
        transaction,
        actorsException,
        parallelizable,
        contextType
    });
}
async function sendVideoActivityToOrigin(activityBuilder, options) {
    var _a, _b;
    const { byActor, video, actorsInvolvedInVideo, transaction, contextType } = options;
    if (video.isOwned())
        throw new Error('Cannot send activity to owned video origin ' + video.url);
    let accountActor = (_b = (_a = video.VideoChannel) === null || _a === void 0 ? void 0 : _a.Account) === null || _b === void 0 ? void 0 : _b.Actor;
    if (!accountActor)
        accountActor = await ActorModel.loadAccountActorByVideoId(video.id, transaction);
    const audience = getOriginVideoAudience(accountActor, actorsInvolvedInVideo);
    const activity = activityBuilder(audience);
    return afterCommitIfTransaction(transaction, () => {
        return unicastTo({
            data: activity,
            byActor,
            toActorUrl: accountActor.getSharedInbox(),
            contextType
        });
    });
}
async function forwardVideoRelatedActivity(activity, t, followersException, video) {
    const additionalActors = await getActorsInvolvedInVideo(video, t);
    const additionalFollowerUrls = additionalActors.map(a => a.followersUrl);
    return forwardActivity(activity, t, followersException, additionalFollowerUrls);
}
async function forwardActivity(activity, t, followersException = [], additionalFollowerUrls = []) {
    logger.info('Forwarding activity %s.', activity.id);
    const to = arrayify(activity.to);
    const cc = arrayify(activity.cc);
    const followersUrls = additionalFollowerUrls;
    for (const dest of to.concat(cc)) {
        if (dest.endsWith('/followers')) {
            followersUrls.push(dest);
        }
    }
    const toActorFollowers = await ActorModel.listByFollowersUrls(followersUrls, t);
    const uris = await computeFollowerUris(toActorFollowers, followersException, t);
    if (uris.length === 0) {
        logger.info('0 followers for %s, no forwarding.', toActorFollowers.map(a => a.id).join(', '));
        return undefined;
    }
    logger.debug('Creating forwarding job.', { uris });
    const payload = {
        uris,
        body: activity,
        contextType: null
    };
    return afterCommitIfTransaction(t, () => JobQueue.Instance.createJobAsync({ type: 'activitypub-http-broadcast', payload }));
}
async function broadcastToFollowers(options) {
    const { data, byActor, toFollowersOf, transaction, contextType, actorsException = [], parallelizable } = options;
    const uris = await computeFollowerUris(toFollowersOf, actorsException, transaction);
    return afterCommitIfTransaction(transaction, () => {
        return broadcastTo({
            uris,
            data,
            byActor,
            parallelizable,
            contextType
        });
    });
}
async function broadcastToActors(options) {
    const { data, byActor, toActors, transaction, contextType, actorsException = [] } = options;
    const uris = await computeUris(toActors, actorsException);
    return afterCommitIfTransaction(transaction, () => {
        return broadcastTo({
            uris,
            data,
            byActor,
            contextType
        });
    });
}
function broadcastTo(options) {
    const { uris, data, byActor, contextType, parallelizable } = options;
    if (uris.length === 0)
        return undefined;
    const broadcastUris = [];
    const unicastUris = [];
    for (const uri of uris) {
        if (ActorFollowHealthCache.Instance.isBadInbox(uri)) {
            unicastUris.push(uri);
        }
        else {
            broadcastUris.push(uri);
        }
    }
    logger.debug('Creating broadcast job.', { broadcastUris, unicastUris });
    if (broadcastUris.length !== 0) {
        const payload = {
            uris: broadcastUris,
            signatureActorId: byActor.id,
            body: data,
            contextType
        };
        JobQueue.Instance.createJobAsync({
            type: parallelizable
                ? 'activitypub-http-broadcast-parallel'
                : 'activitypub-http-broadcast',
            payload
        });
    }
    for (const unicastUri of unicastUris) {
        const payload = {
            uri: unicastUri,
            signatureActorId: byActor.id,
            body: data,
            contextType
        };
        JobQueue.Instance.createJobAsync({ type: 'activitypub-http-unicast', payload });
    }
}
function unicastTo(options) {
    const { data, byActor, toActorUrl, contextType } = options;
    logger.debug('Creating unicast job.', { uri: toActorUrl });
    const payload = {
        uri: toActorUrl,
        signatureActorId: byActor.id,
        body: data,
        contextType
    };
    JobQueue.Instance.createJobAsync({ type: 'activitypub-http-unicast', payload });
}
export { broadcastToFollowers, unicastTo, broadcastToActors, sendVideoActivityToOrigin, forwardVideoRelatedActivity, sendVideoRelatedActivity };
async function computeFollowerUris(toFollowersOf, actorsException, t) {
    const toActorFollowerIds = toFollowersOf.map(a => a.id);
    const result = await ActorFollowModel.listAcceptedFollowerSharedInboxUrls(toActorFollowerIds, t);
    const sharedInboxesException = await buildSharedInboxesException(actorsException);
    return result.data.filter(sharedInbox => sharedInboxesException.includes(sharedInbox) === false);
}
async function computeUris(toActors, actorsException = []) {
    const serverActor = await getServerActor();
    const targetUrls = toActors
        .filter(a => a.id !== serverActor.id)
        .map(a => a.getSharedInbox());
    const toActorSharedInboxesSet = new Set(targetUrls);
    const sharedInboxesException = await buildSharedInboxesException(actorsException);
    return Array.from(toActorSharedInboxesSet)
        .filter(sharedInbox => sharedInboxesException.includes(sharedInbox) === false);
}
async function buildSharedInboxesException(actorsException) {
    const serverActor = await getServerActor();
    return actorsException
        .map(f => f.getSharedInbox())
        .concat([serverActor.sharedInboxUrl]);
}
//# sourceMappingURL=send-utils.js.map