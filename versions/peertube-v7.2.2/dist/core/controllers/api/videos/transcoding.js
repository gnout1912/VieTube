import { HttpStatusCode, UserRight, VideoState } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { createTranscodingJobs } from '../../../lib/transcoding/create-transcoding-job.js';
import { computeResolutionsToTranscode } from '../../../lib/transcoding/transcoding-resolutions.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import express from 'express';
import { asyncMiddleware, authenticate, createTranscodingValidator, ensureUserHasRight } from '../../../middlewares/index.js';
const lTags = loggerTagsFactory('api', 'video');
const transcodingRouter = express.Router();
transcodingRouter.post('/:videoId/transcoding', authenticate, ensureUserHasRight(UserRight.RUN_VIDEO_TRANSCODING), asyncMiddleware(createTranscodingValidator), asyncMiddleware(createTranscoding));
export { transcodingRouter };
async function createTranscoding(req, res) {
    const video = res.locals.videoAll;
    logger.info('Creating %s transcoding job for %s.', req.body.transcodingType, video.url, lTags());
    const body = req.body;
    await VideoJobInfoModel.abortAllTasks(video.uuid, 'pendingTranscode');
    const maxResolution = video.getMaxResolution();
    const hasAudio = video.hasAudio();
    const resolutions = await Hooks.wrapObject(computeResolutionsToTranscode({ input: maxResolution, type: 'vod', includeInput: true, strictLower: false, hasAudio }), 'filter:transcoding.manual.resolutions-to-transcode.result', body);
    if (resolutions.length === 0) {
        return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
    }
    video.state = VideoState.TO_TRANSCODE;
    await video.save();
    await createTranscodingJobs({
        video,
        resolutions,
        transcodingType: body.transcodingType,
        isNewVideo: false,
        user: null
    });
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
//# sourceMappingURL=transcoding.js.map