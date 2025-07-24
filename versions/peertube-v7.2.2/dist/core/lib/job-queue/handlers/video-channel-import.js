import { logger } from '../../../helpers/logger.js';
import { CONFIG } from '../../../initializers/config.js';
import { synchronizeChannel } from '../../sync-channel.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { VideoChannelSyncModel } from '../../../models/video/video-channel-sync.js';
export async function processVideoChannelImport(job) {
    const payload = job.data;
    logger.info('Processing video channel import in job %s.', job.id);
    if (!CONFIG.IMPORT.VIDEOS.HTTP.ENABLED) {
        throw new Error('Cannot import channel as the HTTP upload is disabled');
    }
    if (!CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.ENABLED) {
        throw new Error('Cannot import channel as the synchronization is disabled');
    }
    let channelSync;
    if (payload.partOfChannelSyncId) {
        channelSync = await VideoChannelSyncModel.loadWithChannel(payload.partOfChannelSyncId);
        if (!channelSync) {
            throw new Error('Unknown channel sync specified in videos channel import');
        }
    }
    const videoChannel = await VideoChannelModel.loadAndPopulateAccount(payload.videoChannelId);
    logger.info(`Starting importing videos from external channel "${payload.externalChannelUrl}" to "${videoChannel.name}" `);
    await synchronizeChannel({
        channel: videoChannel,
        externalChannelUrl: payload.externalChannelUrl,
        channelSync,
        videosCountLimit: CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.FULL_SYNC_VIDEOS_LIMIT
    });
}
//# sourceMappingURL=video-channel-import.js.map