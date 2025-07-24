import { JobQueue } from '../../../job-queue/index.js';
import { VideoJobInfoModel } from '../../../../models/video/video-job-info.js';
import { getTranscodingJobPriority } from '../../transcoding-priority.js';
import { AbstractJobBuilder } from './abstract-job-builder.js';
export class TranscodingJobQueueBuilder extends AbstractJobBuilder {
    async createJobs(options) {
        const { video, payloads, user } = options;
        const priority = await getTranscodingJobPriority({ user, type: 'vod', fallback: undefined });
        const parent = payloads[0][0];
        payloads.shift();
        const nextTranscodingSequentialJobs = payloads.map(p => {
            return p.map(payload => {
                return this.buildTranscodingJob({
                    payload,
                    priority: payload.higherPriority ? priority - 1 : priority
                });
            });
        });
        const transcodingJobBuilderJob = {
            type: 'transcoding-job-builder',
            payload: {
                videoUUID: video.uuid,
                sequentialJobs: nextTranscodingSequentialJobs
            }
        };
        const parentJob = this.buildTranscodingJob({
            payload: parent,
            priority: parent.higherPriority ? priority - 1 : priority,
            hasChildren: payloads.length !== 0
        });
        await JobQueue.Instance.createSequentialJobFlow(parentJob, transcodingJobBuilderJob);
        await VideoJobInfoModel.increaseOrCreate(video.uuid, 'pendingTranscode');
    }
    buildTranscodingJob(options) {
        const { priority, payload, hasChildren = false } = options;
        return {
            type: 'video-transcoding',
            priority,
            payload: Object.assign(Object.assign({}, payload), { hasChildren })
        };
    }
    buildHLSJobPayload(options) {
        const { video, resolution, fps, isNewVideo, separatedAudio, deleteWebVideoFiles = false, copyCodecs = false } = options;
        return {
            type: 'new-resolution-to-hls',
            videoUUID: video.uuid,
            resolution,
            fps,
            copyCodecs,
            isNewVideo,
            separatedAudio,
            deleteWebVideoFiles
        };
    }
    buildWebVideoJobPayload(options) {
        const { video, resolution, fps, isNewVideo } = options;
        return {
            type: 'new-resolution-to-web-video',
            videoUUID: video.uuid,
            isNewVideo,
            resolution,
            fps
        };
    }
    buildMergeAudioPayload(options) {
        const { video, isNewVideo, resolution, fps } = options;
        return {
            type: 'merge-audio-to-web-video',
            resolution,
            fps,
            videoUUID: video.uuid,
            hasChildren: undefined,
            isNewVideo
        };
    }
    buildOptimizePayload(options) {
        const { video, quickTranscode, isNewVideo } = options;
        return {
            type: 'optimize-to-web-video',
            videoUUID: video.uuid,
            isNewVideo,
            hasChildren: undefined,
            quickTranscode
        };
    }
}
//# sourceMappingURL=transcoding-job-queue-builder.js.map