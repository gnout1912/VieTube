import { isBlockedByServerOrAccount } from '../../blocklist.js';
import { AccountModel } from '../../../models/account/account.js';
import { getServerActor } from '../../../models/application/application.js';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { logger } from '../../../helpers/logger.js';
import { CONFIG } from '../../../initializers/config.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { getAPId } from '../activity.js';
import { ActorFollowModel } from '../../../models/actor/actor-follow.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { Notifier } from '../../notifier/index.js';
import { autoFollowBackIfNeeded } from '../follow.js';
import { sendAccept, sendReject } from '../send/index.js';
async function processFollowActivity(options) {
    const { activity, byActor } = options;
    const activityId = activity.id;
    const objectId = getAPId(activity.object);
    return retryTransactionWrapper(processFollow, byActor, activityId, objectId);
}
export { processFollowActivity };
async function processFollow(byActor, activityId, targetActorURL) {
    const { actorFollow, created, targetActor } = await sequelizeTypescript.transaction(async (t) => {
        const targetActor = await ActorModel.loadByUrlAndPopulateAccountAndChannel(targetActorURL, t);
        if (!targetActor)
            throw new Error('Unknown actor');
        if (targetActor.isOwned() === false)
            throw new Error('This is not a local actor.');
        if (await rejectIfInstanceFollowDisabled(byActor, activityId, targetActor))
            return { actorFollow: undefined };
        if (await rejectIfMuted(byActor, activityId, targetActor))
            return { actorFollow: undefined };
        const [actorFollow, created] = await ActorFollowModel.findOrCreateCustom({
            byActor,
            targetActor,
            activityId,
            state: await isFollowingInstance(targetActor) && CONFIG.FOLLOWERS.INSTANCE.MANUAL_APPROVAL
                ? 'pending'
                : 'accepted',
            transaction: t
        });
        if (rejectIfAlreadyRejected(actorFollow, byActor, activityId, targetActor))
            return { actorFollow: undefined };
        await acceptIfNeeded(actorFollow, targetActor, t);
        await fixFollowURLIfNeeded(actorFollow, activityId, t);
        actorFollow.ActorFollower = byActor;
        actorFollow.ActorFollowing = targetActor;
        if (actorFollow.state === 'accepted') {
            sendAccept(actorFollow);
            await autoFollowBackIfNeeded(actorFollow, t);
        }
        return { actorFollow, created, targetActor };
    });
    if (!actorFollow)
        return;
    if (created) {
        const follower = await ActorModel.loadFull(byActor.id);
        const actorFollowFull = Object.assign(actorFollow, { ActorFollowing: targetActor, ActorFollower: follower });
        if (await isFollowingInstance(targetActor)) {
            Notifier.Instance.notifyOfNewInstanceFollow(actorFollowFull);
        }
        else {
            Notifier.Instance.notifyOfNewUserFollow(actorFollowFull);
        }
    }
    logger.info('Actor %s is followed by actor %s.', targetActorURL, byActor.url);
}
async function rejectIfInstanceFollowDisabled(byActor, activityId, targetActor) {
    if (await isFollowingInstance(targetActor) && CONFIG.FOLLOWERS.INSTANCE.ENABLED === false) {
        logger.info('Rejecting %s because instance followers are disabled.', targetActor.url);
        sendReject(activityId, byActor, targetActor);
        return true;
    }
    return false;
}
async function rejectIfMuted(byActor, activityId, targetActor) {
    const followerAccount = await AccountModel.load(byActor.Account.id);
    const followingAccountId = targetActor.Account;
    if (followerAccount && await isBlockedByServerOrAccount(followerAccount, followingAccountId)) {
        logger.info('Rejecting %s because follower is muted.', byActor.url);
        sendReject(activityId, byActor, targetActor);
        return true;
    }
    return false;
}
function rejectIfAlreadyRejected(actorFollow, byActor, activityId, targetActor) {
    if (actorFollow.state === 'rejected') {
        logger.info('Rejecting %s because follow is already rejected.', byActor.url);
        sendReject(activityId, byActor, targetActor);
        return true;
    }
    return false;
}
async function acceptIfNeeded(actorFollow, targetActor, transaction) {
    if (actorFollow.state === 'accepted')
        return;
    if (!await isFollowingInstance(targetActor))
        return;
    if (CONFIG.FOLLOWERS.INSTANCE.MANUAL_APPROVAL === true && await isFollowingInstance(targetActor))
        return;
    actorFollow.state = 'accepted';
    await actorFollow.save({ transaction });
}
async function fixFollowURLIfNeeded(actorFollow, activityId, transaction) {
    if (!actorFollow.url) {
        actorFollow.url = activityId;
        await actorFollow.save({ transaction });
    }
}
async function isFollowingInstance(targetActor) {
    const serverActor = await getServerActor();
    return targetActor.id === serverActor.id;
}
//# sourceMappingURL=process-follow.js.map