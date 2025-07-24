import PQueue from 'p-queue';
import { logger } from '../../helpers/logger.js';
import { SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { StatsManager } from '../stat-manager.js';
import { processActivities } from './process/index.js';
export class InboxManager {
    constructor() {
        this.inboxQueue = new PQueue({ concurrency: 1 });
        setInterval(() => {
            StatsManager.Instance.updateInboxWaiting(this.getActivityPubMessagesWaiting());
        }, SCHEDULER_INTERVALS_MS.UPDATE_INBOX_STATS);
    }
    addInboxMessage(param) {
        this.inboxQueue.add(() => {
            const options = { signatureActor: param.signatureActor, inboxActor: param.inboxActor };
            return processActivities(param.activities, options);
        }).catch(err => logger.error('Error with inbox queue.', { err }));
    }
    getActivityPubMessagesWaiting() {
        return this.inboxQueue.size + this.inboxQueue.pending;
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=inbox-manager.js.map