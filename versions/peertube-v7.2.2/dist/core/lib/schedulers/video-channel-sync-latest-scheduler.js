import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { VideoChannelModel } from '../../models/video/video-channel.js';
import { VideoChannelSyncModel } from '../../models/video/video-channel-sync.js';
import { SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { synchronizeChannel } from '../sync-channel.js';
import { AbstractScheduler } from './abstract-scheduler.js';
export class VideoChannelSyncLatestScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.CHANNEL_SYNC_CHECK_INTERVAL;
    }
    async internalExecute() {
        if (!CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.ENABLED) {
            logger.debug('Discard channels synchronization as the feature is disabled');
            return;
        }
        logger.info('Checking channels to synchronize');
        const channelSyncs = await VideoChannelSyncModel.listSyncs();
        for (const sync of channelSyncs) {
            const channel = await VideoChannelModel.loadAndPopulateAccount(sync.videoChannelId);
            logger.info('Creating video import jobs for "%s" sync with external channel "%s"', channel.Actor.preferredUsername, sync.externalChannelUrl);
            const onlyAfter = sync.lastSyncAt || sync.createdAt;
            await synchronizeChannel({
                channel,
                externalChannelUrl: sync.externalChannelUrl,
                videosCountLimit: CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.VIDEOS_LIMIT_PER_SYNCHRONIZATION,
                channelSync: sync,
                onlyAfter
            });
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=video-channel-sync-latest-scheduler.js.map