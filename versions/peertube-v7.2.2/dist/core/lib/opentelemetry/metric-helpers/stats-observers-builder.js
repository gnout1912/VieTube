import memoizee from 'memoizee';
import { MEMOIZE_TTL } from '../../../initializers/constants.js';
import { buildAvailableActivities } from '../../activitypub/activity.js';
import { StatsManager } from '../../stat-manager.js';
export class StatsObserversBuilder {
    constructor(meter) {
        this.meter = meter;
        this.getInstanceStats = memoizee(() => {
            return StatsManager.Instance.getStats();
        }, { maxAge: MEMOIZE_TTL.GET_STATS_FOR_OPEN_TELEMETRY_METRICS });
    }
    buildObservers() {
        this.buildUserStatsObserver();
        this.buildVideoStatsObserver();
        this.buildCommentStatsObserver();
        this.buildPlaylistStatsObserver();
        this.buildChannelStatsObserver();
        this.buildInstanceFollowsStatsObserver();
        this.buildRedundancyStatsObserver();
        this.buildActivityPubStatsObserver();
    }
    buildUserStatsObserver() {
        this.meter.createObservableGauge('peertube_users_total', {
            description: 'Total users on the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalUsers);
        });
        this.meter.createObservableGauge('peertube_active_users_total', {
            description: 'Total active users on the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalDailyActiveUsers, { activeInterval: 'daily' });
            observableResult.observe(stats.totalWeeklyActiveUsers, { activeInterval: 'weekly' });
            observableResult.observe(stats.totalMonthlyActiveUsers, { activeInterval: 'monthly' });
        });
    }
    buildChannelStatsObserver() {
        this.meter.createObservableGauge('peertube_channels_total', {
            description: 'Total channels on the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalLocalVideoChannels, { channelOrigin: 'local' });
        });
        this.meter.createObservableGauge('peertube_active_channels_total', {
            description: 'Total active channels on the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalLocalDailyActiveVideoChannels, { channelOrigin: 'local', activeInterval: 'daily' });
            observableResult.observe(stats.totalLocalWeeklyActiveVideoChannels, { channelOrigin: 'local', activeInterval: 'weekly' });
            observableResult.observe(stats.totalLocalMonthlyActiveVideoChannels, { channelOrigin: 'local', activeInterval: 'monthly' });
        });
    }
    buildVideoStatsObserver() {
        this.meter.createObservableGauge('peertube_videos_total', {
            description: 'Total videos on the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalLocalVideos, { videoOrigin: 'local' });
            observableResult.observe(stats.totalVideos - stats.totalLocalVideos, { videoOrigin: 'remote' });
        });
        this.meter.createObservableGauge('peertube_video_views_total', {
            description: 'Total video views made on the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalLocalVideoViews, { viewOrigin: 'local' });
        });
        this.meter.createObservableGauge('peertube_video_bytes_total', {
            description: 'Total bytes of videos'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalLocalVideoFilesSize, { videoOrigin: 'local' });
        });
    }
    buildCommentStatsObserver() {
        this.meter.createObservableGauge('peertube_comments_total', {
            description: 'Total comments on the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalLocalVideoComments, { accountOrigin: 'local' });
        });
    }
    buildPlaylistStatsObserver() {
        this.meter.createObservableGauge('peertube_playlists_total', {
            description: 'Total playlists on the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalLocalPlaylists, { playlistOrigin: 'local' });
        });
    }
    buildInstanceFollowsStatsObserver() {
        this.meter.createObservableGauge('peertube_instance_followers_total', {
            description: 'Total followers of the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalInstanceFollowers);
        });
        this.meter.createObservableGauge('peertube_instance_following_total', {
            description: 'Total following of the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalInstanceFollowing);
        });
    }
    buildRedundancyStatsObserver() {
        this.meter.createObservableGauge('peertube_redundancy_used_bytes_total', {
            description: 'Total redundancy used of the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            for (const r of stats.videosRedundancy) {
                observableResult.observe(r.totalUsed, { strategy: r.strategy });
            }
        });
        this.meter.createObservableGauge('peertube_redundancy_available_bytes_total', {
            description: 'Total redundancy available of the instance'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            for (const r of stats.videosRedundancy) {
                observableResult.observe(r.totalSize, { strategy: r.strategy });
            }
        });
    }
    buildActivityPubStatsObserver() {
        const availableActivities = buildAvailableActivities();
        this.meter.createObservableGauge('peertube_ap_inbox_success_total', {
            description: 'Total inbox messages processed with success'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            for (const type of availableActivities) {
                observableResult.observe(stats[`totalActivityPub${type}MessagesSuccesses`], { activityType: type });
            }
        });
        this.meter.createObservableGauge('peertube_ap_inbox_error_total', {
            description: 'Total inbox messages processed with error'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            for (const type of availableActivities) {
                observableResult.observe(stats[`totalActivityPub${type}MessagesErrors`], { activityType: type });
            }
        });
        this.meter.createObservableGauge('peertube_ap_inbox_waiting_total', {
            description: 'Total inbox messages waiting for being processed'
        }).addCallback(async (observableResult) => {
            const stats = await this.getInstanceStats();
            observableResult.observe(stats.totalActivityPubMessagesWaiting);
        });
    }
}
//# sourceMappingURL=stats-observers-builder.js.map