import { VideosRedundancyScheduler } from '../../schedulers/videos-redundancy-scheduler.js';
import { logger } from '../../../helpers/logger.js';
async function processVideoRedundancy(job) {
    const payload = job.data;
    logger.info('Processing video redundancy in job %s.', job.id);
    return VideosRedundancyScheduler.Instance.createManualRedundancy(payload.videoId);
}
export { processVideoRedundancy };
//# sourceMappingURL=video-redundancy.js.map