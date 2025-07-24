import { RunnerJobState, VideoState, isVideoStudioTaskIntro, isVideoStudioTaskOutro, isVideoStudioTaskWatermark } from '@peertube/peertube-models';
import { buildUUID } from '@peertube/peertube-node-utils';
import { logger } from '../../../helpers/logger.js';
import { onVideoStudioEnded, safeCleanupStudioTMPFiles } from '../../video-studio.js';
import { basename } from 'path';
import { generateRunnerEditionTranscodingVideoInputFileUrl, generateRunnerTranscodingAudioInputFileUrl, generateRunnerTranscodingVideoInputFileUrl } from '../runner-urls.js';
import { AbstractJobHandler } from './abstract-job-handler.js';
import { loadRunnerVideo } from './shared/utils.js';
export class VideoStudioTranscodingJobHandler extends AbstractJobHandler {
    async create(options) {
        const { video, priority, tasks } = options;
        const jobUUID = buildUUID();
        const { separatedAudioFile } = video.getMaxQualityAudioAndVideoFiles();
        const payload = {
            input: {
                videoFileUrl: generateRunnerTranscodingVideoInputFileUrl(jobUUID, video.uuid),
                separatedAudioFileUrl: separatedAudioFile
                    ? [generateRunnerTranscodingAudioInputFileUrl(jobUUID, video.uuid)]
                    : []
            },
            output: {},
            tasks: tasks.map(t => {
                if (isVideoStudioTaskIntro(t) || isVideoStudioTaskOutro(t)) {
                    return Object.assign(Object.assign({}, t), { options: Object.assign(Object.assign({}, t.options), { file: generateRunnerEditionTranscodingVideoInputFileUrl(jobUUID, video.uuid, basename(t.options.file)) }) });
                }
                if (isVideoStudioTaskWatermark(t)) {
                    return Object.assign(Object.assign({}, t), { options: Object.assign(Object.assign({}, t.options), { file: generateRunnerEditionTranscodingVideoInputFileUrl(jobUUID, video.uuid, basename(t.options.file)) }) });
                }
                return t;
            })
        };
        const privatePayload = {
            videoUUID: video.uuid,
            originalTasks: tasks
        };
        const job = await this.createRunnerJob({
            type: 'video-studio-transcoding',
            jobUUID,
            payload,
            privatePayload,
            priority
        });
        return job;
    }
    isAbortSupported() {
        return true;
    }
    specificUpdate(_options) {
    }
    specificAbort(_options) {
    }
    async specificComplete(options) {
        const { runnerJob, resultPayload } = options;
        const privatePayload = runnerJob.privatePayload;
        const video = await loadRunnerVideo(runnerJob, this.lTags);
        if (!video) {
            await safeCleanupStudioTMPFiles(privatePayload.originalTasks);
        }
        const videoFilePath = resultPayload.videoFile;
        await onVideoStudioEnded({ video, editionResultPath: videoFilePath, tasks: privatePayload.originalTasks });
        logger.info('Runner video edition transcoding job %s for %s ended.', runnerJob.uuid, video.uuid, this.lTags(video.uuid, runnerJob.uuid));
    }
    specificError(options) {
        if (options.nextState === RunnerJobState.ERRORED) {
            return this.specificErrorOrCancel(options);
        }
        return Promise.resolve();
    }
    specificCancel(options) {
        return this.specificErrorOrCancel(options);
    }
    async specificErrorOrCancel(options) {
        const { runnerJob } = options;
        const payload = runnerJob.privatePayload;
        await safeCleanupStudioTMPFiles(payload.originalTasks);
        const video = await loadRunnerVideo(options.runnerJob, this.lTags);
        if (!video)
            return;
        return video.setNewState(VideoState.PUBLISHED, false, undefined);
    }
}
//# sourceMappingURL=video-studio-transcoding-job-handler.js.map