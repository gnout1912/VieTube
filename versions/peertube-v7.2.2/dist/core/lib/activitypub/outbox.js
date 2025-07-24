import { logger } from '../../helpers/logger.js';
import { getServerActor } from '../../models/application/application.js';
import { JobQueue } from '../job-queue/index.js';
async function addFetchOutboxJob(actor) {
    const serverActor = await getServerActor();
    if (serverActor.id === actor.id) {
        logger.error('Cannot fetch our own outbox!');
        return undefined;
    }
    const payload = {
        uri: actor.outboxUrl,
        type: 'activity'
    };
    return JobQueue.Instance.createJobAsync({ type: 'activitypub-http-fetcher', payload });
}
export { addFetchOutboxJob };
//# sourceMappingURL=outbox.js.map