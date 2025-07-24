import { buildUUID } from '@peertube/peertube-node-utils';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { VIEW_LIFETIME } from '../../../initializers/constants.js';
import { sendView } from '../../activitypub/send/send-view.js';
import { getCachedVideoDuration } from '../../video.js';
import { getServerActor } from '../../../models/application/application.js';
import { LRUCache } from 'lru-cache';
import { Redis } from '../../redis.js';
import { CONFIG } from '../../../initializers/config.js';
const lTags = loggerTagsFactory('views');
export class VideoViews {
    constructor() {
        this.viewsCache = new LRUCache({
            max: 10000,
            ttl: VIEW_LIFETIME.VIEW
        });
    }
    async addLocalView(options) {
        const { video, sessionId, watchTime } = options;
        logger.debug('Adding local view to video %s.', video.uuid, Object.assign({ watchTime }, lTags(video.uuid)));
        if (!await this.hasEnoughWatchTime(video, watchTime))
            return false;
        const viewExists = await this.doesVideoSessionIdViewExist(sessionId, video.uuid);
        if (viewExists)
            return false;
        await this.setSessionIdVideoView(sessionId, video.uuid);
        await this.addView(video);
        await sendView({ byActor: await getServerActor(), video, viewerIdentifier: buildUUID() });
        return true;
    }
    async addRemoteView(options) {
        const { video } = options;
        logger.debug('Adding remote view to video %s.', video.uuid, Object.assign({}, lTags(video.uuid)));
        await this.addView(video);
        return true;
    }
    async addView(video) {
        const promises = [];
        if (video.isOwned()) {
            promises.push(Redis.Instance.addLocalVideoView(video.id));
        }
        promises.push(Redis.Instance.addVideoViewStats(video.id));
        await Promise.all(promises);
    }
    async hasEnoughWatchTime(video, watchTime) {
        const { duration, isLive } = await getCachedVideoDuration(video.id);
        const countViewAfterSeconds = CONFIG.VIEWS.VIDEOS.COUNT_VIEW_AFTER / 1000;
        if (isLive || duration >= countViewAfterSeconds)
            return watchTime >= countViewAfterSeconds;
        return duration / watchTime < 2;
    }
    doesVideoSessionIdViewExist(sessionId, videoUUID) {
        const key = Redis.Instance.generateSessionIdViewKey(sessionId, videoUUID);
        const value = this.viewsCache.has(key);
        if (value === true)
            return Promise.resolve(true);
        return Redis.Instance.doesVideoSessionIdViewExist(sessionId, videoUUID);
    }
    setSessionIdVideoView(sessionId, videoUUID) {
        const key = Redis.Instance.generateSessionIdViewKey(sessionId, videoUUID);
        this.viewsCache.set(key, true);
        return Redis.Instance.setSessionIdVideoView(sessionId, videoUUID);
    }
}
//# sourceMappingURL=video-views.js.map