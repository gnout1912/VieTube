import { sequelizeTypescript } from '../../../initializers/database.js';
import { ActorFollowModel } from '../../../models/actor/actor-follow.js';
async function processRejectActivity(options) {
    const { byActor: targetActor, inboxActor } = options;
    if (inboxActor === undefined)
        throw new Error('Need to reject on explicit inbox.');
    return processReject(inboxActor, targetActor);
}
export { processRejectActivity };
async function processReject(follower, targetActor) {
    return sequelizeTypescript.transaction(async (t) => {
        const actorFollow = await ActorFollowModel.loadByActorAndTarget(follower.id, targetActor.id, t);
        if (!actorFollow)
            throw new Error(`'Unknown actor follow ${follower.id} -> ${targetActor.id}.`);
        actorFollow.state = 'rejected';
        await actorFollow.save({ transaction: t });
        return undefined;
    });
}
//# sourceMappingURL=process-reject.js.map