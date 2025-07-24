import { pick } from '@peertube/peertube-core-utils';
import { buildUUID } from '@peertube/peertube-node-utils';
import { logger } from '../../../helpers/logger.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import { generateRunnerTranscodingVideoInputFileUrl, generateRunnerTranscodingVideoPreviewFileUrl } from '../runner-urls.js';
import { AbstractVODTranscodingJobHandler } from './abstract-vod-transcoding-job-handler.js';
import { loadRunnerVideo, onVODWebVideoOrAudioMergeTranscodingJob } from './shared/utils.js';
export class VODAudioMergeTranscodingJobHandler extends AbstractVODTranscodingJobHandler {
    async create(options) {
        const { video, resolution, fps, priority, dependsOnRunnerJob } = options;
        const jobUUID = buildUUID();
        const payload = {
            input: {
                audioFileUrl: generateRunnerTranscodingVideoInputFileUrl(jobUUID, video.uuid),
                previewFileUrl: generateRunnerTranscodingVideoPreviewFileUrl(jobUUID, video.uuid)
            },
            output: {
                resolution,
                fps
            }
        };
        const privatePayload = Object.assign(Object.assign({}, pick(options, ['isNewVideo', 'deleteInputFileId'])), { videoUUID: video.uuid });
        const job = await this.createRunnerJob({
            type: 'vod-audio-merge-transcoding',
            jobUUID,
            payload,
            privatePayload,
            priority,
            dependsOnRunnerJob
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
        await onVODWebVideoOrAudioMergeTranscodingJob({ video, videoFilePath, privatePayload, wasAudioFile: true });
        logger.info('Runner VOD audio merge transcoding job %s for %s ended.', runnerJob.uuid, video.uuid, this.lTags(video.uuid, runnerJob.uuid));
    }
}
//# sourceMappingURL=vod-audio-merge-transcoding-job-handler.js.map