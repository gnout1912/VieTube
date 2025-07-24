import express from 'express';
import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { InboxManager } from '../../../lib/activitypub/inbox-manager.js';
import { RemoveDanglingResumableUploadsScheduler } from '../../../lib/schedulers/remove-dangling-resumable-uploads-scheduler.js';
import { UpdateVideosScheduler } from '../../../lib/schedulers/update-videos-scheduler.js';
import { VideoChannelSyncLatestScheduler } from '../../../lib/schedulers/video-channel-sync-latest-scheduler.js';
import { VideoViewsBufferScheduler } from '../../../lib/schedulers/video-views-buffer-scheduler.js';
import { VideoViewsManager } from '../../../lib/views/video-views-manager.js';
import { authenticate, ensureUserHasRight } from '../../../middlewares/index.js';
import { RemoveExpiredUserExportsScheduler } from '../../../lib/schedulers/remove-expired-user-exports-scheduler.js';
const debugRouter = express.Router();
debugRouter.get('/debug', authenticate, ensureUserHasRight(UserRight.MANAGE_DEBUG), getDebug);
debugRouter.post('/debug/run-command', authenticate, ensureUserHasRight(UserRight.MANAGE_DEBUG), runCommand);
export { debugRouter };
function getDebug(req, res) {
    return res.json({
        ip: req.ip,
        activityPubMessagesWaiting: InboxManager.Instance.getActivityPubMessagesWaiting()
    });
}
async function runCommand(req, res) {
    const body = req.body;
    const processors = {
        'remove-dandling-resumable-uploads': () => RemoveDanglingResumableUploadsScheduler.Instance.execute(),
        'remove-expired-user-exports': () => RemoveExpiredUserExportsScheduler.Instance.execute(),
        'process-video-views-buffer': () => VideoViewsBufferScheduler.Instance.execute(),
        'process-video-viewers': () => VideoViewsManager.Instance.processViewerStats(),
        'process-update-videos-scheduler': () => UpdateVideosScheduler.Instance.execute(),
        'process-video-channel-sync-latest': () => VideoChannelSyncLatestScheduler.Instance.execute()
    };
    if (!processors[body.command]) {
        return res.fail({ message: 'Invalid command' });
    }
    await processors[body.command]();
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
//# sourceMappingURL=debug.js.map