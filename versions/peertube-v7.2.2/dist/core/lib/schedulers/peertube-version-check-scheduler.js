import { doJSONRequest } from '../../helpers/requests.js';
import { ApplicationModel } from '../../models/application/application.js';
import { compareSemVer } from '@peertube/peertube-core-utils';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { PEERTUBE_VERSION, SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { Notifier } from '../notifier/index.js';
import { AbstractScheduler } from './abstract-scheduler.js';
export class PeerTubeVersionCheckScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.CHECK_PEERTUBE_VERSION;
    }
    async internalExecute() {
        return this.checkLatestVersion();
    }
    async checkLatestVersion() {
        var _a;
        if (CONFIG.PEERTUBE.CHECK_LATEST_VERSION.ENABLED === false)
            return;
        logger.info('Checking latest PeerTube version.');
        const { body } = await doJSONRequest(CONFIG.PEERTUBE.CHECK_LATEST_VERSION.URL, { preventSSRF: false });
        if (!((_a = body === null || body === void 0 ? void 0 : body.peertube) === null || _a === void 0 ? void 0 : _a.latestVersion)) {
            logger.warn('Cannot check latest PeerTube version: body is invalid.', { body });
            return;
        }
        const latestVersion = body.peertube.latestVersion;
        const application = await ApplicationModel.load();
        if (application.latestPeerTubeVersion === latestVersion)
            return;
        if (compareSemVer(PEERTUBE_VERSION, latestVersion) < 0) {
            application.latestPeerTubeVersion = latestVersion;
            await application.save();
            Notifier.Instance.notifyOfNewPeerTubeVersion(application, latestVersion);
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=peertube-version-check-scheduler.js.map