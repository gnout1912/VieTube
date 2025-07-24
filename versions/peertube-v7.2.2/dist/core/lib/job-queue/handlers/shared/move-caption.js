import { retryTransactionWrapper } from '../../../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../../../helpers/logger.js';
import { sequelizeTypescript } from '../../../../initializers/database.js';
import { federateVideoIfNeeded } from '../../../activitypub/videos/federate.js';
import { VideoPathManager } from '../../../video-path-manager.js';
import { VideoCaptionModel } from '../../../../models/video/video-caption.js';
import { VideoStreamingPlaylistModel } from '../../../../models/video/video-streaming-playlist.js';
import { VideoModel } from '../../../../models/video/video.js';
export async function moveCaptionToStorageJob(options) {
    const { jobId, loggerTags, captionId, moveCaptionFiles } = options;
    const lTagsBase = loggerTagsFactory(...loggerTags);
    const caption = await VideoCaptionModel.loadWithVideo(captionId);
    if (!caption) {
        logger.info(`Can't process job ${jobId}, caption does not exist anymore.`, lTagsBase());
        return;
    }
    const fileMutexReleaser = await VideoPathManager.Instance.lockFiles(caption.Video.uuid);
    const hls = await VideoStreamingPlaylistModel.loadHLSByVideoWithVideo(caption.videoId);
    try {
        await moveCaptionFiles([caption], hls);
        await retryTransactionWrapper(() => {
            return sequelizeTypescript.transaction(async (t) => {
                const videoFull = await VideoModel.loadFull(caption.Video.id, t);
                await federateVideoIfNeeded(videoFull, false, t);
            });
        });
    }
    finally {
        fileMutexReleaser();
    }
}
//# sourceMappingURL=move-caption.js.map