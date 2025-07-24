import { Notifier } from '../../notifier/index.js';
import { VideoModel } from '../../../models/video/video.js';
import { logger } from '../../../helpers/logger.js';
async function processNotify(job) {
    const payload = job.data;
    logger.info('Processing %s notification in job %s.', payload.action, job.id);
    if (payload.action === 'new-video')
        return doNotifyNewVideo(payload);
}
export { processNotify };
async function doNotifyNewVideo(payload) {
    const refreshedVideo = await VideoModel.loadFull(payload.videoUUID);
    if (!refreshedVideo)
        return;
    Notifier.Instance.notifyOnNewVideoOrLiveIfNeeded(refreshedVideo);
}
//# sourceMappingURL=notify.js.map