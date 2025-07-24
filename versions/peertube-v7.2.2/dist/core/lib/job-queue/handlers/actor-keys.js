import { generateAndSaveActorKeys } from '../../activitypub/actors/index.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { logger } from '../../../helpers/logger.js';
async function processActorKeys(job) {
    const payload = job.data;
    logger.info('Processing actor keys in job %s.', job.id);
    const actor = await ActorModel.load(payload.actorId);
    await generateAndSaveActorKeys(actor);
}
export { processActorKeys };
//# sourceMappingURL=actor-keys.js.map