import { logger } from '../../helpers/logger.js';
export class AbstractScheduler {
    constructor() {
        this.isRunning = false;
    }
    enable() {
        if (!this.schedulerIntervalMs)
            throw new Error('Interval is not correctly set.');
        this.interval = setInterval(() => this.execute(), this.schedulerIntervalMs);
    }
    disable() {
        clearInterval(this.interval);
    }
    async execute() {
        if (this.isRunning === true)
            return;
        this.isRunning = true;
        try {
            await this.internalExecute();
        }
        catch (err) {
            logger.error('Cannot execute %s scheduler.', this.constructor.name, { err });
        }
        finally {
            this.isRunning = false;
        }
    }
}
//# sourceMappingURL=abstract-scheduler.js.map