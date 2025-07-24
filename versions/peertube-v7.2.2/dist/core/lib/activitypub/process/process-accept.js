import { ActorFollowModel } from '../../../models/actor/actor-follow.js';
import { addFetchOutboxJob } from '../outbox.js';
async function processAcceptActivity(options) {
    const { byActor: targetActor, inboxActor } = options;
    if (inboxActor === undefined)
        throw new Error('Need to accept on explicit inbox.');
    return processAccept(inboxActor, targetActor);
}
export { processAcceptActivity };
async function processAccept(actor, targetActor) {
    const follow = await ActorFollowModel.loadByActorAndTarget(actor.id, targetActor.id);
    if (!follow)
        throw new Error('Cannot find associated follow.');
    if (follow.state !== 'accepted') {
        follow.state = 'accepted';
        await follow.save();
        await addFetchOutboxJob(targetActor);
    }
}
//# sourceMappingURL=process-accept.js.map