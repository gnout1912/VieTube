import { GeoIP } from '../../helpers/geo-ip.js';
import { SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { AbstractScheduler } from './abstract-scheduler.js';
export class GeoIPUpdateScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.GEO_IP_UPDATE;
    }
    internalExecute() {
        return GeoIP.Instance.updateDatabases();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=geo-ip-update-scheduler.js.map