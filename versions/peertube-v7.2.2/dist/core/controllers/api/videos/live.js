import express from 'express';
import { HttpStatusCode, ThumbnailType, UserRight, VideoState } from '@peertube/peertube-models';
import { exists } from '../../../helpers/custom-validators/misc.js';
import { createReqFiles } from '../../../helpers/express-utils.js';
import { getFormattedObjects } from '../../../helpers/utils.js';
import { ASSETS_PATH, MIMETYPES } from '../../../initializers/constants.js';
import { federateVideoIfNeeded } from '../../../lib/activitypub/videos/index.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { videoLiveAddValidator, videoLiveFindReplaySessionValidator, videoLiveGetValidator, videoLiveListSessionsValidator, videoLiveUpdateValidator } from '../../../middlewares/validators/videos/video-live.js';
import { VideoLiveReplaySettingModel } from '../../../models/video/video-live-replay-setting.js';
import { VideoLiveSessionModel } from '../../../models/video/video-live-session.js';
import { uuidToShort } from '@peertube/peertube-node-utils';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, optionalAuthenticate } from '../../../middlewares/index.js';
import { LocalVideoCreator } from '../../../lib/local-video-creator.js';
import { pick } from '@peertube/peertube-core-utils';
const lTags = loggerTagsFactory('api', 'live');
const liveRouter = express.Router();
const reqVideoFileLive = createReqFiles(['thumbnailfile', 'previewfile'], MIMETYPES.IMAGE.MIMETYPE_EXT);
liveRouter.post('/live', authenticate, reqVideoFileLive, asyncMiddleware(videoLiveAddValidator), asyncRetryTransactionMiddleware(addLiveVideo));
liveRouter.get('/live/:videoId/sessions', authenticate, asyncMiddleware(videoLiveGetValidator), videoLiveListSessionsValidator, asyncMiddleware(getLiveVideoSessions));
liveRouter.get('/live/:videoId', optionalAuthenticate, asyncMiddleware(videoLiveGetValidator), getLiveVideo);
liveRouter.put('/live/:videoId', authenticate, asyncMiddleware(videoLiveGetValidator), videoLiveUpdateValidator, asyncRetryTransactionMiddleware(updateLiveVideo));
liveRouter.get('/:videoId/live-session', asyncMiddleware(videoLiveFindReplaySessionValidator), getLiveReplaySession);
export { liveRouter };
function getLiveVideo(req, res) {
    const videoLive = res.locals.videoLive;
    return res.json(videoLive.toFormattedJSON(canSeePrivateLiveInformation(res)));
}
function getLiveReplaySession(req, res) {
    const session = res.locals.videoLiveSession;
    return res.json(session.toFormattedJSON());
}
async function getLiveVideoSessions(req, res) {
    const videoLive = res.locals.videoLive;
    const data = await VideoLiveSessionModel.listSessionsOfLiveForAPI({ videoId: videoLive.videoId, count: 100 });
    return res.json(getFormattedObjects(data, data.length));
}
function canSeePrivateLiveInformation(res) {
    var _a;
    const user = (_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.User;
    if (!user)
        return false;
    if (user.hasRight(UserRight.GET_ANY_LIVE))
        return true;
    const video = res.locals.videoAll;
    return video.VideoChannel.Account.userId === user.id;
}
async function updateLiveVideo(req, res) {
    const body = req.body;
    const video = res.locals.videoAll;
    const videoLive = res.locals.videoLive;
    const newReplaySettingModel = await updateReplaySettings(videoLive, body);
    if (newReplaySettingModel)
        videoLive.replaySettingId = newReplaySettingModel.id;
    else
        videoLive.replaySettingId = null;
    if (exists(body.permanentLive))
        videoLive.permanentLive = body.permanentLive;
    if (exists(body.latencyMode))
        videoLive.latencyMode = body.latencyMode;
    video.VideoLive = await videoLive.save();
    await federateVideoIfNeeded(video, false);
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function updateReplaySettings(videoLive, body) {
    if (exists(body.saveReplay))
        videoLive.saveReplay = body.saveReplay;
    if (!videoLive.saveReplay) {
        if (videoLive.replaySettingId) {
            await VideoLiveReplaySettingModel.removeSettings(videoLive.replaySettingId);
        }
        return undefined;
    }
    const settingModel = videoLive.replaySettingId
        ? await VideoLiveReplaySettingModel.load(videoLive.replaySettingId)
        : new VideoLiveReplaySettingModel();
    if (exists(body.replaySettings.privacy))
        settingModel.privacy = body.replaySettings.privacy;
    return settingModel.save();
}
async function addLiveVideo(req, res) {
    const videoInfo = req.body;
    const thumbnails = [{ type: ThumbnailType.MINIATURE, field: 'thumbnailfile' }, { type: ThumbnailType.PREVIEW, field: 'previewfile' }]
        .map(({ type, field }) => {
        var _a, _b;
        if ((_b = (_a = req.files) === null || _a === void 0 ? void 0 : _a[field]) === null || _b === void 0 ? void 0 : _b[0]) {
            return {
                path: req.files[field][0].path,
                type,
                automaticallyGenerated: false,
                keepOriginal: false
            };
        }
        return {
            path: ASSETS_PATH.DEFAULT_LIVE_BACKGROUND,
            type,
            automaticallyGenerated: true,
            keepOriginal: true
        };
    });
    const localVideoCreator = new LocalVideoCreator({
        channel: res.locals.videoChannel,
        chapters: undefined,
        fallbackChapters: {
            fromDescription: false,
            finalFallback: undefined
        },
        liveAttributes: pick(videoInfo, ['saveReplay', 'permanentLive', 'latencyMode', 'replaySettings']),
        videoAttributeResultHook: 'filter:api.video.live.video-attribute.result',
        lTags,
        videoAttributes: Object.assign(Object.assign({}, videoInfo), { duration: 0, state: VideoState.WAITING_FOR_LIVE, isLive: true, inputFilename: null }),
        videoFile: undefined,
        user: res.locals.oauth.token.User,
        thumbnails
    });
    const { video } = await localVideoCreator.create();
    logger.info('Video live %s with uuid %s created.', videoInfo.name, video.uuid, lTags());
    Hooks.runAction('action:api.live-video.created', { video, req, res });
    return res.json({
        video: {
            id: video.id,
            shortUUID: uuidToShort(video.uuid),
            uuid: video.uuid
        }
    });
}
//# sourceMappingURL=live.js.map