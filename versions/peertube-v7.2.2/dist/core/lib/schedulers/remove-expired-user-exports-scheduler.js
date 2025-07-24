import { logger } from '../../helpers/logger.js';
import { AbstractScheduler } from './abstract-scheduler.js';
import { SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { CONFIG } from '../../initializers/config.js';
import { UserExportModel } from '../../models/user/user-export.js';
export class RemoveExpiredUserExportsScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.REMOVE_EXPIRED_USER_EXPORTS;
    }
    async internalExecute() {
        const expired = await UserExportModel.listExpired(CONFIG.EXPORT.USERS.EXPORT_EXPIRATION);
        for (const userExport of expired) {
            logger.info('Removing expired user exports ' + userExport.filename);
            await userExport.destroy();
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=remove-expired-user-exports-scheduler.js.map