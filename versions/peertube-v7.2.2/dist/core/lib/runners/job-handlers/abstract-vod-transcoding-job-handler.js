import { RunnerJobState } from '@peertube/peertube-models';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { logger } from '../../../helpers/logger.js';
import { moveToFailedTranscodingState, moveToNextState } from '../../video-state.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import { AbstractJobHandler } from './abstract-job-handler.js';
import { loadRunnerVideo } from './shared/utils.js';
export class AbstractVODTranscodingJobHandler extends AbstractJobHandler {
    isAbortSupported() {
        return true;
    }
    specificUpdate(_options) {
    }
    specificAbort(_options) {
    }
    async specificError(options) {
        if (options.nextState !== RunnerJobState.ERRORED)
            return;
        const video = await loadRunnerVideo(options.runnerJob, this.lTags);
        if (!video)
            return;
        await moveToFailedTranscodingState(video);
        await VideoJobInfoModel.decrease(video.uuid, 'pendingTranscode');
    }
    async specificCancel(options) {
        const { runnerJob } = options;
        const video = await loadRunnerVideo(options.runnerJob, this.lTags);
        if (!video)
            return;
        const pending = await VideoJobInfoModel.decrease(video.uuid, 'pendingTranscode');
        logger.debug(`Pending transcode decreased to ${pending} after cancel`, this.lTags(video.uuid));
        if (pending === 0) {
            logger.info(`All transcoding jobs of ${video.uuid} have been processed or canceled, moving it to its next state`, this.lTags(video.uuid));
            const privatePayload = runnerJob.privatePayload;
            await retryTransactionWrapper(moveToNextState, { video, isNewVideo: privatePayload.isNewVideo });
        }
    }
}
//# sourceMappingURL=abstract-vod-transcoding-job-handler.js.map