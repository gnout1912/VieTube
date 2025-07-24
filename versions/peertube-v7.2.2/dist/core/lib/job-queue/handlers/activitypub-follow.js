import { getLocalActorFollowActivityPubUrl } from '../../activitypub/url.js';
import { sanitizeHost } from '../../../helpers/core-utils.js';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { logger } from '../../../helpers/logger.js';
import { REMOTE_SCHEME, SERVER_ACTOR_NAME, WEBSERVER } from '../../../initializers/constants.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { ActorFollowModel } from '../../../models/actor/actor-follow.js';
import { getOrCreateAPActor, loadActorUrlOrGetFromWebfinger } from '../../activitypub/actors/index.js';
import { sendFollow } from '../../activitypub/send/index.js';
import { Notifier } from '../../notifier/index.js';
import { getApplicationActorOfHost } from '../../../helpers/activity-pub-utils.js';
async function processActivityPubFollow(job) {
    const payload = job.data;
    const host = payload.host;
    const identifier = [payload.name || SERVER_ACTOR_NAME, host]
        .filter(v => !!v).join('@');
    logger.info('Processing ActivityPub follow in job %s.', job.id);
    let targetActor;
    if (!host || host === WEBSERVER.HOST) {
        if (!payload.name)
            throw new Error('Payload name is mandatory for local follow');
        targetActor = await ActorModel.loadLocalByName(payload.name);
    }
    else {
        const sanitizedHost = sanitizeHost(host, REMOTE_SCHEME.HTTP);
        let actorUrl;
        try {
            if (!payload.name)
                actorUrl = await getApplicationActorOfHost(sanitizedHost);
            if (!actorUrl)
                actorUrl = await loadActorUrlOrGetFromWebfinger((payload.name || SERVER_ACTOR_NAME) + '@' + sanitizedHost);
            targetActor = await getOrCreateAPActor(actorUrl, 'all');
        }
        catch (err) {
            logger.warn(`Do not follow ${identifier} because we could not find the actor URL (in database or using webfinger)`, { err });
            return;
        }
    }
    if (!targetActor) {
        logger.warn(`Do not follow ${identifier} because we could not fetch/load the actor`);
        return;
    }
    if (payload.assertIsChannel && !targetActor.VideoChannel) {
        logger.warn(`Do not follow ${identifier} because it is not a channel.`);
        return;
    }
    const fromActor = await ActorModel.load(payload.followerActorId);
    return retryTransactionWrapper(follow, fromActor, targetActor, payload.isAutoFollow);
}
export { processActivityPubFollow };
async function follow(fromActor, targetActor, isAutoFollow = false) {
    if (fromActor.id === targetActor.id) {
        throw new Error('Follower is the same as target actor.');
    }
    const state = !fromActor.serverId && !targetActor.serverId ? 'accepted' : 'pending';
    const actorFollow = await sequelizeTypescript.transaction(async (t) => {
        const [actorFollow] = await ActorFollowModel.findOrCreateCustom({
            byActor: fromActor,
            state,
            targetActor,
            activityId: getLocalActorFollowActivityPubUrl(fromActor, targetActor),
            transaction: t
        });
        if (actorFollow.state !== 'accepted')
            sendFollow(actorFollow, t);
        return actorFollow;
    });
    const followerFull = await ActorModel.loadFull(fromActor.id);
    const actorFollowFull = Object.assign(actorFollow, {
        ActorFollowing: targetActor,
        ActorFollower: followerFull
    });
    if (actorFollow.state === 'accepted')
        Notifier.Instance.notifyOfNewUserFollow(actorFollowFull);
    if (isAutoFollow === true)
        Notifier.Instance.notifyOfAutoInstanceFollowing(actorFollowFull);
    return actorFollow;
}
//# sourceMappingURL=activitypub-follow.js.map