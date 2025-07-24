import { VODAudioMergeTranscodingJobHandler, VODHLSTranscodingJobHandler, VODWebVideoTranscodingJobHandler } from '../../../runners/job-handlers/index.js';
import { getTranscodingJobPriority } from '../../transcoding-priority.js';
import { AbstractJobBuilder } from './abstract-job-builder.js';
export class TranscodingRunnerJobBuilder extends AbstractJobBuilder {
    async createJobs(options) {
        const { payloads, user } = options;
        const parent = payloads[0][0];
        payloads.shift();
        const priority = await getTranscodingJobPriority({ user, type: 'vod', fallback: 0 });
        const parentJob = await this.createJob({
            payload: parent,
            priority: parent.higherPriority ? priority - 1 : priority
        });
        for (const parallelPayloads of payloads) {
            let lastJob = parentJob;
            for (const parallelPayload of parallelPayloads) {
                lastJob = await this.createJob({
                    payload: parallelPayload,
                    priority: parallelPayload.higherPriority ? priority - 1 : priority,
                    dependsOnRunnerJob: lastJob
                });
            }
            lastJob = undefined;
        }
    }
    createJob(options) {
        const { dependsOnRunnerJob, payload, priority } = options;
        const builder = new payload.Builder();
        return builder.create(Object.assign(Object.assign({}, payload.options), { dependsOnRunnerJob,
            priority }));
    }
    buildHLSJobPayload(options) {
        const { video, resolution, fps, isNewVideo, separatedAudio, deleteWebVideoFiles = false } = options;
        return {
            Builder: VODHLSTranscodingJobHandler,
            options: {
                video,
                resolution,
                fps,
                isNewVideo,
                separatedAudio,
                deleteWebVideoFiles
            }
        };
    }
    buildWebVideoJobPayload(options) {
        const { video, resolution, fps, isNewVideo } = options;
        return {
            Builder: VODWebVideoTranscodingJobHandler,
            options: {
                video,
                resolution,
                fps,
                isNewVideo,
                deleteInputFileId: null
            }
        };
    }
    buildMergeAudioPayload(options) {
        const { video, isNewVideo, inputFile, resolution, fps } = options;
        return {
            Builder: VODAudioMergeTranscodingJobHandler,
            options: {
                video,
                resolution,
                fps,
                isNewVideo,
                deleteInputFileId: inputFile.id
            }
        };
    }
    buildOptimizePayload(options) {
        const { video, isNewVideo, inputFile, fps, resolution } = options;
        return {
            Builder: VODWebVideoTranscodingJobHandler,
            options: {
                video,
                resolution,
                fps,
                isNewVideo,
                deleteInputFileId: inputFile.id
            }
        };
    }
}
//# sourceMappingURL=transcoding-runner-job-builder.js.map