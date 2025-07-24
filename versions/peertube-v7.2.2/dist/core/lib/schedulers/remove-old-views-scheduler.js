import { VideoViewModel } from '../../models/view/video-view.js';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { AbstractScheduler } from './abstract-scheduler.js';
export class RemoveOldViewsScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.REMOVE_OLD_VIEWS;
    }
    internalExecute() {
        if (CONFIG.VIEWS.VIDEOS.REMOTE.MAX_AGE === -1)
            return;
        logger.info('Removing old videos views.');
        const now = new Date();
        const beforeDate = new Date(now.getTime() - CONFIG.VIEWS.VIDEOS.REMOTE.MAX_AGE).toISOString();
        return VideoViewModel.removeOldRemoteViewsHistory(beforeDate);
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=remove-old-views-scheduler.js.map