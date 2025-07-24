import { isTestOrDevInstance } from '@peertube/peertube-node-utils';
import { GeoIP } from '../../../helpers/geo-ip.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { MAX_LOCAL_VIEWER_WATCH_SECTIONS, VIEWER_SYNC_REDIS, VIEW_LIFETIME } from '../../../initializers/constants.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { sendCreateWatchAction } from '../../activitypub/send/index.js';
import { getLocalVideoViewerActivityPubUrl } from '../../activitypub/url.js';
import { Redis } from '../../redis.js';
import { VideoModel } from '../../../models/video/video.js';
import { LocalVideoViewerWatchSectionModel } from '../../../models/view/local-video-viewer-watch-section.js';
import { LocalVideoViewerModel } from '../../../models/view/local-video-viewer.js';
const lTags = loggerTagsFactory('views');
export class VideoViewerStats {
    constructor() {
        this.processingViewersStats = false;
        this.processingRedisWrites = false;
        this.viewerCache = new Map();
        this.redisPendingWrites = new Map();
        setInterval(() => this.processViewerStats(), VIEW_LIFETIME.VIEWER_STATS);
        setInterval(() => this.syncRedisWrites(), VIEWER_SYNC_REDIS);
    }
    async addLocalViewer(options) {
        const { video, ip, viewEvent, currentTime, sessionId, client, operatingSystem, device } = options;
        logger.debug('Adding local viewer to video stats %s.', video.uuid, Object.assign({ currentTime, viewEvent, sessionId, client, operatingSystem, device }, lTags(video.uuid)));
        const nowMs = new Date().getTime();
        let stats = await this.getLocalVideoViewer({ sessionId, videoId: video.id });
        if (stats && stats.watchSections.length >= MAX_LOCAL_VIEWER_WATCH_SECTIONS) {
            logger.warn('Too much watch section to store for a viewer, skipping this one', Object.assign({ currentTime, viewEvent, sessionId, client, operatingSystem, device }, lTags(video.uuid)));
            return;
        }
        if (!stats) {
            const { country, subdivisionName } = await GeoIP.Instance.safeIPISOLookup(ip);
            stats = {
                firstUpdated: nowMs,
                lastUpdated: nowMs,
                watchSections: [],
                watchTime: 0,
                client,
                device,
                operatingSystem,
                country,
                subdivisionName,
                videoId: video.id
            };
        }
        stats.lastUpdated = nowMs;
        if (viewEvent === 'seek' || stats.watchSections.length === 0) {
            stats.watchSections.push({
                start: currentTime,
                end: currentTime
            });
        }
        else {
            const lastSection = stats.watchSections[stats.watchSections.length - 1];
            if (lastSection.start > currentTime) {
                logger.debug('Invalid end watch section %d. Last start record was at %d. Starting a new section.', currentTime, lastSection.start);
                stats.watchSections.push({
                    start: currentTime,
                    end: currentTime
                });
            }
            else {
                lastSection.end = currentTime;
            }
        }
        stats.watchTime = this.buildWatchTimeFromSections(stats.watchSections);
        logger.debug('Set local video viewer stats for video %s.', video.uuid, Object.assign({ stats }, lTags(video.uuid)));
        this.setLocalVideoViewer(sessionId, video.id, stats);
    }
    async getWatchTime(videoId, sessionId) {
        const stats = await this.getLocalVideoViewer({ sessionId, videoId });
        return (stats === null || stats === void 0 ? void 0 : stats.watchTime) || 0;
    }
    async processViewerStats() {
        if (this.processingViewersStats)
            return;
        this.processingViewersStats = true;
        if (!isTestOrDevInstance())
            logger.info('Processing viewer statistics.', lTags());
        const now = new Date().getTime();
        try {
            await this.syncRedisWrites();
            const allKeys = await Redis.Instance.listLocalVideoViewerKeys();
            for (const key of allKeys) {
                const stats = await this.getLocalVideoViewerByKey(key);
                if (stats.lastUpdated > now - VIEW_LIFETIME.VIEWER_STATS) {
                    continue;
                }
                try {
                    await sequelizeTypescript.transaction(async (t) => {
                        const video = await VideoModel.load(stats.videoId, t);
                        if (!video)
                            return;
                        const statsModel = await this.saveViewerStats(video, stats, t);
                        if (statsModel && video.remote) {
                            await sendCreateWatchAction(statsModel, t);
                        }
                    });
                    await this.deleteLocalVideoViewersKeys(key);
                }
                catch (err) {
                    logger.error('Cannot process viewer stats for Redis key %s.', key, Object.assign({ err, stats }, lTags()));
                }
            }
        }
        catch (err) {
            logger.error('Error in video save viewers stats scheduler.', Object.assign({ err }, lTags()));
        }
        this.processingViewersStats = false;
    }
    async saveViewerStats(video, stats, transaction) {
        if (stats.watchTime === 0)
            return;
        const statsModel = new LocalVideoViewerModel({
            startDate: new Date(stats.firstUpdated),
            endDate: new Date(stats.lastUpdated),
            watchTime: stats.watchTime,
            client: stats.client,
            device: stats.device,
            operatingSystem: stats.operatingSystem,
            country: stats.country,
            subdivisionName: stats.subdivisionName,
            videoId: video.id
        });
        statsModel.url = getLocalVideoViewerActivityPubUrl(statsModel);
        statsModel.Video = video;
        await statsModel.save({ transaction });
        statsModel.WatchSections = await LocalVideoViewerWatchSectionModel.bulkCreateSections({
            localVideoViewerId: statsModel.id,
            watchSections: stats.watchSections,
            transaction
        });
        return statsModel;
    }
    buildWatchTimeFromSections(sections) {
        return sections.reduce((p, current) => p + (current.end - current.start), 0);
    }
    getLocalVideoViewer(options) {
        const { viewerKey } = Redis.Instance.generateLocalVideoViewerKeys(options.sessionId, options.videoId);
        return this.getLocalVideoViewerByKey(viewerKey);
    }
    getLocalVideoViewerByKey(key) {
        const viewer = this.viewerCache.get(key);
        if (viewer)
            return Promise.resolve(viewer);
        return Redis.Instance.getLocalVideoViewer({ key });
    }
    setLocalVideoViewer(sessionId, videoId, stats) {
        const { viewerKey } = Redis.Instance.generateLocalVideoViewerKeys(sessionId, videoId);
        this.viewerCache.set(viewerKey, stats);
        this.redisPendingWrites.set(viewerKey, { sessionId, videoId, stats });
    }
    deleteLocalVideoViewersKeys(key) {
        this.viewerCache.delete(key);
        return Redis.Instance.deleteLocalVideoViewersKeys(key);
    }
    async syncRedisWrites() {
        if (this.processingRedisWrites)
            return;
        this.processingRedisWrites = true;
        for (const [key, pendingWrite] of this.redisPendingWrites) {
            const { sessionId, videoId, stats } = pendingWrite;
            this.redisPendingWrites.delete(key);
            try {
                await Redis.Instance.setLocalVideoViewer(sessionId, videoId, stats);
            }
            catch (err) {
                logger.error('Cannot write viewer into redis', { sessionId, videoId, stats, err });
            }
        }
        this.processingRedisWrites = false;
    }
}
//# sourceMappingURL=video-viewer-stats.js.map