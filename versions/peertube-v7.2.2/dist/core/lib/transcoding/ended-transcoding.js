import { retryTransactionWrapper } from '../../helpers/database-utils.js';
import { VideoJobInfoModel } from '../../models/video/video-job-info.js';
import { moveToNextState } from '../video-state.js';
export async function onTranscodingEnded(options) {
    const { video, isNewVideo, moveVideoToNextState } = options;
    await VideoJobInfoModel.decrease(video.uuid, 'pendingTranscode');
    if (moveVideoToNextState) {
        await retryTransactionWrapper(moveToNextState, { video, isNewVideo });
    }
}
//# sourceMappingURL=ended-transcoding.js.map