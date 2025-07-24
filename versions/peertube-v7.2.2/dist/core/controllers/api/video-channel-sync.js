import { HttpStatusCode, VideoChannelSyncState } from '@peertube/peertube-models';
import { auditLoggerFactory, getAuditIdFromRes, VideoChannelSyncAuditView } from '../../helpers/audit-logger.js';
import { logger } from '../../helpers/logger.js';
import { apiRateLimiter, asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, ensureSyncExists, ensureSyncIsEnabled, videoChannelSyncValidator } from '../../middlewares/index.js';
import { VideoChannelSyncModel } from '../../models/video/video-channel-sync.js';
import express from 'express';
const videoChannelSyncRouter = express.Router();
const auditLogger = auditLoggerFactory('channel-syncs');
videoChannelSyncRouter.use(apiRateLimiter);
videoChannelSyncRouter.post('/', authenticate, ensureSyncIsEnabled, asyncMiddleware(videoChannelSyncValidator), asyncRetryTransactionMiddleware(createVideoChannelSync));
videoChannelSyncRouter.delete('/:id', authenticate, asyncMiddleware(ensureSyncExists), asyncRetryTransactionMiddleware(removeVideoChannelSync));
export { videoChannelSyncRouter };
async function createVideoChannelSync(req, res) {
    const syncCreated = new VideoChannelSyncModel({
        externalChannelUrl: req.body.externalChannelUrl,
        videoChannelId: req.body.videoChannelId,
        state: VideoChannelSyncState.WAITING_FIRST_RUN
    });
    await syncCreated.save();
    syncCreated.VideoChannel = res.locals.videoChannel;
    auditLogger.create(getAuditIdFromRes(res), new VideoChannelSyncAuditView(syncCreated.toFormattedJSON()));
    logger.info('Video synchronization for channel "%s" with external channel "%s" created.', syncCreated.VideoChannel.name, syncCreated.externalChannelUrl);
    return res.json({
        videoChannelSync: syncCreated.toFormattedJSON()
    });
}
async function removeVideoChannelSync(req, res) {
    const syncInstance = res.locals.videoChannelSync;
    await syncInstance.destroy();
    auditLogger.delete(getAuditIdFromRes(res), new VideoChannelSyncAuditView(syncInstance.toFormattedJSON()));
    logger.info('Video synchronization for channel "%s" with external channel "%s" deleted.', syncInstance.VideoChannel.name, syncInstance.externalChannelUrl);
    return res.type('json').status(HttpStatusCode.NO_CONTENT_204).end();
}
//# sourceMappingURL=video-channel-sync.js.map