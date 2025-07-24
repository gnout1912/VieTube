import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { uploadx } from '../uploadx.js';
import { AbstractScheduler } from './abstract-scheduler.js';
const lTags = loggerTagsFactory('scheduler', 'resumable-upload', 'cleaner');
export class RemoveDanglingResumableUploadsScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.REMOVE_DANGLING_RESUMABLE_UPLOADS;
        this.lastExecutionTimeMs = new Date().getTime();
    }
    async internalExecute() {
        logger.debug('Removing dangling resumable uploads', lTags());
        const now = new Date().getTime();
        try {
            await uploadx.storage.purge(now - this.lastExecutionTimeMs);
        }
        catch (error) {
            logger.error('Failed to handle file during resumable video upload folder cleanup', Object.assign({ error }, lTags()));
        }
        finally {
            this.lastExecutionTimeMs = now;
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=remove-dangling-resumable-uploads-scheduler.js.map