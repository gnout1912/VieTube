import { YoutubeDLCLI } from '../../helpers/youtube-dl/index.js';
import { SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { AbstractScheduler } from './abstract-scheduler.js';
export class YoutubeDlUpdateScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.YOUTUBE_DL_UPDATE;
    }
    internalExecute() {
        return YoutubeDLCLI.updateYoutubeDLBinary();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=youtube-dl-update-scheduler.js.map