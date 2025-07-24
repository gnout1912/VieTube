import { HttpStatusCode } from '@peertube/peertube-models';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { VideoViewsManager } from '../../../lib/views/video-views-manager.js';
import express from 'express';
import { asyncMiddleware, methodsValidator, openapiOperationDoc, optionalAuthenticate, videoViewValidator } from '../../../middlewares/index.js';
import { UserVideoHistoryModel } from '../../../models/user/user-video-history.js';
const viewRouter = express.Router();
viewRouter.all(['/:videoId/views', '/:videoId/watching'], openapiOperationDoc({ operationId: 'addView' }), methodsValidator(['PUT', 'POST']), optionalAuthenticate, asyncMiddleware(videoViewValidator), asyncMiddleware(viewVideo));
export { viewRouter };
async function viewVideo(req, res) {
    const video = res.locals.onlyImmutableVideo;
    const body = req.body;
    const ip = req.ip;
    const { successView } = await VideoViewsManager.Instance.processLocalView({
        video,
        ip,
        currentTime: body.currentTime,
        viewEvent: body.viewEvent,
        sessionId: body.sessionId,
        client: body.client,
        operatingSystem: body.operatingSystem,
        device: body.device
    });
    if (successView) {
        Hooks.runAction('action:api.video.viewed', { video, ip, req, res });
    }
    await updateUserHistoryIfNeeded(body, video, res);
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function updateUserHistoryIfNeeded(body, video, res) {
    var _a;
    const user = (_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.User;
    if (!user)
        return;
    if (user.videosHistoryEnabled !== true)
        return;
    await UserVideoHistoryModel.upsert({
        videoId: video.id,
        userId: user.id,
        currentTime: body.currentTime
    });
}
//# sourceMappingURL=view.js.map