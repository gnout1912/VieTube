import { pick } from '@peertube/peertube-core-utils';
import { buildUUID } from '@peertube/peertube-node-utils';
import { logger } from '../../../helpers/logger.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import { generateRunnerTranscodingAudioInputFileUrl, generateRunnerTranscodingVideoInputFileUrl } from '../runner-urls.js';
import { AbstractVODTranscodingJobHandler } from './abstract-vod-transcoding-job-handler.js';
import { loadRunnerVideo, onVODWebVideoOrAudioMergeTranscodingJob } from './shared/utils.js';
export class VODWebVideoTranscodingJobHandler extends AbstractVODTranscodingJobHandler {
    async create(options) {
        const { video, resolution, fps, priority, dependsOnRunnerJob } = options;
        const jobUUID = buildUUID();
        const { separatedAudioFile } = video.getMaxQualityAudioAndVideoFiles();
        const payload = {
            input: {
                videoFileUrl: generateRunnerTranscodingVideoInputFileUrl(jobUUID, video.uuid),
                separatedAudioFileUrl: separatedAudioFile
                    ? [generateRunnerTranscodingAudioInputFileUrl(jobUUID, video.uuid)]
                    : []
            },
            output: {
                resolution,
                fps
            }
        };
        const privatePayload = Object.assign(Object.assign({}, pick(options, ['isNewVideo', 'deleteInputFileId'])), { videoUUID: video.uuid });
        const job = await this.createRunnerJob({
            type: 'vod-web-video-transcoding',
            jobUUID,
            payload,
            privatePayload,
            dependsOnRunnerJob,
            priority
        });
        await VideoJobInfoModel.increaseOrCreate(video.uuid, 'pendingTranscode');
        return job;
    }
    async specificComplete(options) {
        const { runnerJob, resultPayload } = options;
        const privatePayload = runnerJob.privatePayload;
        const video = await loadRunnerVideo(runnerJob, this.lTags);
        if (!video)
            return;
        const videoFilePath = resultPayload.videoFile;
        await onVODWebVideoOrAudioMergeTranscodingJob({ video, videoFilePath, privatePayload, wasAudioFile: false });
        logger.info('Runner VOD web video transcoding job %s for %s ended.', runnerJob.uuid, video.uuid, this.lTags(video.uuid, runnerJob.uuid));
    }
}
//# sourceMappingURL=vod-web-video-transcoding-job-handler.js.map