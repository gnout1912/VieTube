import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { federateVideoIfNeeded } from '../../activitypub/videos/index.js';
import { VideoModel } from '../../../models/video/video.js';
import { logger } from '../../../helpers/logger.js';
function processFederateVideo(job) {
    const payload = job.data;
    logger.info('Processing video federation in job %s.', job.id);
    return retryTransactionWrapper(() => {
        return sequelizeTypescript.transaction(async (t) => {
            const video = await VideoModel.loadFull(payload.videoUUID, t);
            if (!video)
                return;
            return federateVideoIfNeeded(video, payload.isNewVideoForFederation, t);
        });
    });
}
export { processFederateVideo };
//# sourceMappingURL=federate-video.js.map