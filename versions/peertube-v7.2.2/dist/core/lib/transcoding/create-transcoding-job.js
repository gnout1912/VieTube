import { CONFIG } from '../../initializers/config.js';
import { TranscodingJobQueueBuilder, TranscodingRunnerJobBuilder } from './shared/index.js';
export function createOptimizeOrMergeAudioJobs(options) {
    return getJobBuilder().createOptimizeOrMergeAudioJobs(options);
}
export function createTranscodingJobs(options) {
    return getJobBuilder().createTranscodingJobs(options);
}
function getJobBuilder() {
    if (CONFIG.TRANSCODING.REMOTE_RUNNERS.ENABLED === true) {
        return new TranscodingRunnerJobBuilder();
    }
    return new TranscodingJobQueueBuilder();
}
//# sourceMappingURL=create-transcoding-job.js.map