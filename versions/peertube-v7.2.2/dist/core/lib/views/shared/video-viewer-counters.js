import { isTestOrDevInstance } from '@peertube/peertube-node-utils';
import { exists } from '../../../helpers/custom-validators/misc.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { VIEW_LIFETIME } from '../../../initializers/constants.js';
import { sendView } from '../../activitypub/send/send-view.js';
import { PeerTubeSocket } from '../../peertube-socket.js';
import { getServerActor } from '../../../models/application/application.js';
import { VideoModel } from '../../../models/video/video.js';
const lTags = loggerTagsFactory('views');
export class VideoViewerCounters {
    constructor() {
        this.viewersPerVideo = new Map();
        this.idToViewer = new Map();
        this.processingViewerCounters = false;
        setInterval(() => this.updateVideoViewersCount(), VIEW_LIFETIME.VIEWER_COUNTER);
    }
    async addLocalViewer(options) {
        const { video, sessionId } = options;
        logger.debug('Adding local viewer to video viewers counter %s.', video.uuid, Object.assign({}, lTags(video.uuid)));
        const viewerId = sessionId + '-' + video.uuid;
        const viewer = this.idToViewer.get(viewerId);
        if (viewer) {
            viewer.expires = this.buildViewerExpireTime();
            await this.federateViewerIfNeeded(video, viewer);
            return false;
        }
        const newViewer = this.addViewerToVideo({ viewerId, video, viewerScope: 'local', viewerCount: 1 });
        await this.federateViewerIfNeeded(video, newViewer);
        return true;
    }
    addRemoteViewerOnLocalVideo(options) {
        const { video, viewerExpires, viewerId } = options;
        logger.debug('Adding remote viewer to local video %s.', video.uuid, Object.assign({ viewerId, viewerExpires }, lTags(video.uuid)));
        const viewer = this.idToViewer.get(viewerId);
        if (viewer) {
            viewer.expires = viewerExpires.getTime();
            return false;
        }
        this.addViewerToVideo({ video, viewerExpires, viewerId, viewerScope: 'remote', viewerCount: 1 });
        return true;
    }
    addRemoteViewerOnRemoteVideo(options) {
        const { video, viewerExpires, viewerId, viewerResultCounter } = options;
        logger.debug('Adding remote viewer to remote video %s.', video.uuid, Object.assign({ viewerId, viewerResultCounter, viewerExpires }, lTags(video.uuid)));
        this.addViewerToVideo({
            video,
            viewerExpires,
            viewerId,
            viewerScope: 'remote',
            replaceCurrentViewers: exists(viewerResultCounter),
            viewerCount: viewerResultCounter !== null && viewerResultCounter !== void 0 ? viewerResultCounter : 1
        });
        return true;
    }
    getTotalViewers(options) {
        let total = 0;
        for (const viewers of this.viewersPerVideo.values()) {
            total += viewers.filter(v => v.viewerScope === options.viewerScope && v.videoScope === options.videoScope)
                .reduce((p, c) => p + c.viewerCount, 0);
        }
        return total;
    }
    getTotalViewersOf(video) {
        const viewers = this.viewersPerVideo.get(video.id);
        return (viewers === null || viewers === void 0 ? void 0 : viewers.reduce((p, c) => p + c.viewerCount, 0)) || 0;
    }
    buildViewerExpireTime() {
        return new Date().getTime() + VIEW_LIFETIME.VIEWER_COUNTER;
    }
    addViewerToVideo(options) {
        const { video, viewerExpires, viewerId, viewerScope, viewerCount, replaceCurrentViewers } = options;
        let watchers = this.viewersPerVideo.get(video.id);
        if (!watchers || replaceCurrentViewers) {
            watchers = [];
            this.viewersPerVideo.set(video.id, watchers);
        }
        const expires = viewerExpires
            ? viewerExpires.getTime()
            : this.buildViewerExpireTime();
        const videoScope = video.remote
            ? 'remote'
            : 'local';
        const viewer = { id: viewerId, expires, videoScope, viewerScope, viewerCount };
        watchers.push(viewer);
        this.idToViewer.set(viewerId, viewer);
        this.notifyClients(video);
        return viewer;
    }
    async updateVideoViewersCount() {
        if (this.processingViewerCounters)
            return;
        this.processingViewerCounters = true;
        if (!isTestOrDevInstance()) {
            logger.debug('Updating video viewer counters.', lTags());
        }
        try {
            for (const videoId of this.viewersPerVideo.keys()) {
                const notBefore = new Date().getTime();
                const viewers = this.viewersPerVideo.get(videoId);
                const newViewers = [];
                for (const viewer of viewers) {
                    if (viewer.expires > notBefore) {
                        newViewers.push(viewer);
                    }
                    else {
                        this.idToViewer.delete(viewer.id);
                    }
                }
                if (newViewers.length === 0)
                    this.viewersPerVideo.delete(videoId);
                else
                    this.viewersPerVideo.set(videoId, newViewers);
                const video = await VideoModel.loadImmutableAttributes(videoId);
                if (video) {
                    this.notifyClients(video);
                    if (video.remote === false && newViewers.length !== 0) {
                        await this.federateTotalViewers(video);
                    }
                }
            }
        }
        catch (err) {
            logger.error('Error in video clean viewers scheduler.', Object.assign({ err }, lTags()));
        }
        this.processingViewerCounters = false;
    }
    notifyClients(video) {
        const totalViewers = this.getTotalViewersOf(video);
        PeerTubeSocket.Instance.sendVideoViewsUpdate(video, totalViewers);
        logger.debug('Video viewers update for %s is %d.', video.url, totalViewers, lTags());
    }
    async federateViewerIfNeeded(video, viewer) {
        const now = new Date().getTime();
        const federationLimit = now - (VIEW_LIFETIME.VIEWER_COUNTER * 0.75);
        if (viewer.lastFederation && viewer.lastFederation > federationLimit)
            return;
        if (video.remote === false)
            return;
        await sendView({
            byActor: await getServerActor(),
            video,
            viewersCount: 1,
            viewerIdentifier: viewer.id
        });
        viewer.lastFederation = now;
    }
    async federateTotalViewers(video) {
        await sendView({
            byActor: await getServerActor(),
            video,
            viewersCount: this.getTotalViewersOf(video),
            viewerIdentifier: video.uuid
        });
    }
}
//# sourceMappingURL=video-viewer-counters.js.map