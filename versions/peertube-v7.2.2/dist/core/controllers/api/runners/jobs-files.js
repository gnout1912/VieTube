import { FileStorage, RunnerJobState, VideoFileStream } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { proxifyHLS, proxifyWebVideoFile } from '../../../lib/object-storage/index.js';
import { VideoPathManager } from '../../../lib/video-path-manager.js';
import { getStudioTaskFilePath } from '../../../lib/video-studio.js';
import { apiRateLimiter, asyncMiddleware } from '../../../middlewares/index.js';
import { jobOfRunnerGetValidatorFactory } from '../../../middlewares/validators/runners/index.js';
import { runnerJobGetVideoStudioTaskFileValidator, runnerJobGetVideoTranscodingFileValidator } from '../../../middlewares/validators/runners/job-files.js';
import express from 'express';
const lTags = loggerTagsFactory('api', 'runner');
const runnerJobFilesRouter = express.Router();
runnerJobFilesRouter.post('/jobs/:jobUUID/files/videos/:videoId/max-quality/audio', apiRateLimiter, asyncMiddleware(jobOfRunnerGetValidatorFactory([RunnerJobState.PROCESSING])), asyncMiddleware(runnerJobGetVideoTranscodingFileValidator), asyncMiddleware(getMaxQualitySeparatedAudioFile));
runnerJobFilesRouter.post('/jobs/:jobUUID/files/videos/:videoId/max-quality', apiRateLimiter, asyncMiddleware(jobOfRunnerGetValidatorFactory([RunnerJobState.PROCESSING])), asyncMiddleware(runnerJobGetVideoTranscodingFileValidator), asyncMiddleware(getMaxQualityVideoFile));
runnerJobFilesRouter.post('/jobs/:jobUUID/files/videos/:videoId/previews/max-quality', apiRateLimiter, asyncMiddleware(jobOfRunnerGetValidatorFactory([RunnerJobState.PROCESSING])), asyncMiddleware(runnerJobGetVideoTranscodingFileValidator), getMaxQualityVideoPreview);
runnerJobFilesRouter.post('/jobs/:jobUUID/files/videos/:videoId/studio/task-files/:filename', apiRateLimiter, asyncMiddleware(jobOfRunnerGetValidatorFactory([RunnerJobState.PROCESSING])), asyncMiddleware(runnerJobGetVideoTranscodingFileValidator), runnerJobGetVideoStudioTaskFileValidator, getVideoStudioTaskFile);
export { runnerJobFilesRouter };
async function getMaxQualitySeparatedAudioFile(req, res) {
    const runnerJob = res.locals.runnerJob;
    const runner = runnerJob.Runner;
    const video = res.locals.videoAll;
    logger.info('Get max quality separated audio file of video %s of job %s for runner %s', video.uuid, runnerJob.uuid, runner.name, lTags(runner.name, runnerJob.id, runnerJob.type));
    const file = video.getMaxQualityFile(VideoFileStream.AUDIO) || video.getMaxQualityFile(VideoFileStream.VIDEO);
    return serveVideoFile({ video, file, req, res });
}
async function getMaxQualityVideoFile(req, res) {
    const runnerJob = res.locals.runnerJob;
    const runner = runnerJob.Runner;
    const video = res.locals.videoAll;
    logger.info('Get max quality file of video %s of job %s for runner %s', video.uuid, runnerJob.uuid, runner.name, lTags(runner.name, runnerJob.id, runnerJob.type));
    const file = video.getMaxQualityFile(VideoFileStream.VIDEO) || video.getMaxQualityFile(VideoFileStream.AUDIO);
    return serveVideoFile({ video, file, req, res });
}
async function serveVideoFile(options) {
    const { video, file, req, res } = options;
    if (file.storage === FileStorage.OBJECT_STORAGE) {
        if (file.isHLS()) {
            return proxifyHLS({
                req,
                res,
                filename: file.filename,
                playlist: video.getHLSPlaylist(),
                reinjectVideoFileToken: false,
                video
            });
        }
        return proxifyWebVideoFile({
            req,
            res,
            filename: file.filename
        });
    }
    return VideoPathManager.Instance.makeAvailableVideoFile(file, videoPath => {
        return res.sendFile(videoPath);
    });
}
function getMaxQualityVideoPreview(req, res) {
    const runnerJob = res.locals.runnerJob;
    const runner = runnerJob.Runner;
    const video = res.locals.videoAll;
    logger.info('Get max quality preview file of video %s of job %s for runner %s', video.uuid, runnerJob.uuid, runner.name, lTags(runner.name, runnerJob.id, runnerJob.type));
    const file = video.getPreview();
    return res.sendFile(file.getPath());
}
function getVideoStudioTaskFile(req, res) {
    const runnerJob = res.locals.runnerJob;
    const runner = runnerJob.Runner;
    const video = res.locals.videoAll;
    const filename = req.params.filename;
    logger.info('Get video studio task file %s of video %s of job %s for runner %s', filename, video.uuid, runnerJob.uuid, runner.name, lTags(runner.name, runnerJob.id, runnerJob.type));
    return res.sendFile(getStudioTaskFilePath(filename));
}
//# sourceMappingURL=jobs-files.js.map