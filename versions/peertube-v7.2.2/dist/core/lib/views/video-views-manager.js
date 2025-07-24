import { sha256 } from '@peertube/peertube-node-utils';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { VideoViewerCounters, VideoViewerStats, VideoViews } from './shared/index.js';
const lTags = loggerTagsFactory('views');
export class VideoViewsManager {
    constructor() {
    }
    init() {
        this.videoViewerStats = new VideoViewerStats();
        this.videoViewerCounters = new VideoViewerCounters();
        this.videoViews = new VideoViews();
    }
    async processLocalView(options) {
        const { video, ip, viewEvent, currentTime, client, operatingSystem, device } = options;
        let sessionId = options.sessionId;
        if (!sessionId || CONFIG.VIEWS.VIDEOS.TRUST_VIEWER_SESSION_ID !== true) {
            sessionId = sha256(CONFIG.SECRETS + '-' + ip);
        }
        logger.debug(`Processing local view for ${video.url}, ip ${ip} and session id ${sessionId}.`, lTags());
        await this.videoViewerStats.addLocalViewer({ video, ip, sessionId, viewEvent, currentTime, client, operatingSystem, device });
        const successViewer = await this.videoViewerCounters.addLocalViewer({ video, sessionId });
        const watchTime = await this.videoViewerStats.getWatchTime(video.id, sessionId);
        const successView = await this.videoViews.addLocalView({ video, watchTime, sessionId });
        return { successView, successViewer };
    }
    async processRemoteView(options) {
        const { video, viewerId, viewerExpires, viewerResultCounter } = options;
        logger.debug('Processing remote view for %s.', video.url, Object.assign({ viewerExpires, viewerId }, lTags()));
        if (viewerExpires) {
            if (video.remote === false) {
                this.videoViewerCounters.addRemoteViewerOnLocalVideo({ video, viewerId, viewerExpires });
                return;
            }
            this.videoViewerCounters.addRemoteViewerOnRemoteVideo({ video, viewerId, viewerExpires, viewerResultCounter });
            return;
        }
        await this.videoViews.addRemoteView({ video });
    }
    getTotalViewersOf(video) {
        return this.videoViewerCounters.getTotalViewersOf(video);
    }
    getTotalViewers(options) {
        return this.videoViewerCounters.getTotalViewers(options);
    }
    buildViewerExpireTime() {
        return this.videoViewerCounters.buildViewerExpireTime();
    }
    processViewerStats() {
        return this.videoViewerStats.processViewerStats();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=video-views-manager.js.map