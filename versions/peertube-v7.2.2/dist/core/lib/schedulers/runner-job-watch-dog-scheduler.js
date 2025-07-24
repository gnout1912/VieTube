import { CONFIG } from '../../initializers/config.js';
import { RunnerJobModel } from '../../models/runner/runner-job.js';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { getRunnerJobHandlerClass } from '../runners/index.js';
import { AbstractScheduler } from './abstract-scheduler.js';
const lTags = loggerTagsFactory('runner');
export class RunnerJobWatchDogScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.RUNNER_JOB_WATCH_DOG;
    }
    async internalExecute() {
        const vodStalledJobs = await RunnerJobModel.listStalledJobs({
            staleTimeMS: CONFIG.REMOTE_RUNNERS.STALLED_JOBS.VOD,
            types: ['vod-audio-merge-transcoding', 'vod-hls-transcoding', 'vod-web-video-transcoding']
        });
        const liveStalledJobs = await RunnerJobModel.listStalledJobs({
            staleTimeMS: CONFIG.REMOTE_RUNNERS.STALLED_JOBS.LIVE,
            types: ['live-rtmp-hls-transcoding']
        });
        for (const stalled of [...vodStalledJobs, ...liveStalledJobs]) {
            logger.info('Abort stalled runner job %s (%s)', stalled.uuid, stalled.type, lTags(stalled.uuid, stalled.type));
            const Handler = getRunnerJobHandlerClass(stalled);
            await new Handler().abort({
                runnerJob: stalled,
                abortNotSupportedErrorMessage: 'Stalled runner job'
            });
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=runner-job-watch-dog-scheduler.js.map