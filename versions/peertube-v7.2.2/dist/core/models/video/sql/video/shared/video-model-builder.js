import { VideoInclude } from '@peertube/peertube-models';
import { AccountBlocklistModel } from '../../../../account/account-blocklist.js';
import { AccountModel } from '../../../../account/account.js';
import { ActorImageModel } from '../../../../actor/actor-image.js';
import { ActorModel } from '../../../../actor/actor.js';
import { AutomaticTagModel } from '../../../../automatic-tag/automatic-tag.js';
import { VideoAutomaticTagModel } from '../../../../automatic-tag/video-automatic-tag.js';
import { VideoRedundancyModel } from '../../../../redundancy/video-redundancy.js';
import { ServerBlocklistModel } from '../../../../server/server-blocklist.js';
import { ServerModel } from '../../../../server/server.js';
import { TrackerModel } from '../../../../server/tracker.js';
import { UserVideoHistoryModel } from '../../../../user/user-video-history.js';
import { VideoSourceModel } from '../../../video-source.js';
import { ScheduleVideoUpdateModel } from '../../../schedule-video-update.js';
import { TagModel } from '../../../tag.js';
import { ThumbnailModel } from '../../../thumbnail.js';
import { VideoBlacklistModel } from '../../../video-blacklist.js';
import { VideoChannelModel } from '../../../video-channel.js';
import { VideoFileModel } from '../../../video-file.js';
import { VideoLiveModel } from '../../../video-live.js';
import { VideoStreamingPlaylistModel } from '../../../video-streaming-playlist.js';
import { VideoModel } from '../../../video.js';
export class VideoModelBuilder {
    constructor(mode, tables) {
        this.mode = mode;
        this.tables = tables;
        this.buildOpts = { raw: true, isNewRecord: false };
    }
    buildVideosFromRows(options) {
        var _a, _b, _c;
        const { rows, rowsWebVideoFiles, rowsStreamingPlaylist, include } = options;
        this.reinit();
        for (const row of rows) {
            this.buildVideoAndAccount(row);
            const videoModel = this.videosMemo[row.id];
            this.setUserHistory(row, videoModel);
            this.addThumbnail(row, videoModel);
            const channelActor = (_a = videoModel.VideoChannel) === null || _a === void 0 ? void 0 : _a.Actor;
            if (channelActor) {
                this.addActorAvatar(row, 'VideoChannel.Actor', channelActor);
            }
            const accountActor = (_c = (_b = videoModel.VideoChannel) === null || _b === void 0 ? void 0 : _b.Account) === null || _c === void 0 ? void 0 : _c.Actor;
            if (accountActor) {
                this.addActorAvatar(row, 'VideoChannel.Account.Actor', accountActor);
            }
            if (!rowsWebVideoFiles) {
                this.addWebVideoFile(row, videoModel);
            }
            if (!rowsStreamingPlaylist) {
                this.addStreamingPlaylist(row, videoModel);
                this.addStreamingPlaylistFile(row);
            }
            if (this.mode === 'get') {
                this.addTag(row, videoModel);
                this.addTracker(row, videoModel);
                this.setBlacklisted(row, videoModel);
                this.setScheduleVideoUpdate(row, videoModel);
                this.setLive(row, videoModel);
            }
            else {
                if (include & VideoInclude.BLACKLISTED) {
                    this.setBlacklisted(row, videoModel);
                }
                if (include & VideoInclude.BLOCKED_OWNER) {
                    this.setBlockedOwner(row, videoModel);
                    this.setBlockedServer(row, videoModel);
                }
                if (include & VideoInclude.NOT_PUBLISHED_STATE) {
                    this.setScheduleVideoUpdate(row, videoModel);
                }
                if (include & VideoInclude.SOURCE) {
                    this.setSource(row, videoModel);
                }
                if (include & VideoInclude.AUTOMATIC_TAGS) {
                    this.addAutoTag(row, videoModel);
                }
                if (include & VideoInclude.TAGS) {
                    this.addTag(row, videoModel);
                }
            }
        }
        this.grabSeparateWebVideoFiles(rowsWebVideoFiles);
        this.grabSeparateStreamingPlaylistFiles(rowsStreamingPlaylist);
        return this.videos;
    }
    reinit() {
        this.videosMemo = {};
        this.videoStreamingPlaylistMemo = {};
        this.videoFileMemo = {};
        this.thumbnailsDone = new Set();
        this.actorImagesDone = new Set();
        this.historyDone = new Set();
        this.blacklistDone = new Set();
        this.liveDone = new Set();
        this.sourceDone = new Set();
        this.redundancyDone = new Set();
        this.scheduleVideoUpdateDone = new Set();
        this.accountBlocklistDone = new Set();
        this.serverBlocklistDone = new Set();
        this.trackersDone = new Set();
        this.tagsDone = new Set();
        this.autoTagsDone = new Set();
        this.videos = [];
    }
    grabSeparateWebVideoFiles(rowsWebVideoFiles) {
        if (!rowsWebVideoFiles)
            return;
        for (const row of rowsWebVideoFiles) {
            const id = row['VideoFiles.id'];
            if (!id)
                continue;
            const videoModel = this.videosMemo[row.id];
            this.addWebVideoFile(row, videoModel);
        }
    }
    grabSeparateStreamingPlaylistFiles(rowsStreamingPlaylist) {
        if (!rowsStreamingPlaylist)
            return;
        for (const row of rowsStreamingPlaylist) {
            const id = row['VideoStreamingPlaylists.id'];
            if (!id)
                continue;
            const videoModel = this.videosMemo[row.id];
            this.addStreamingPlaylist(row, videoModel);
            this.addStreamingPlaylistFile(row);
            this.addRedundancy(row, 'VideoStreamingPlaylists', this.videoStreamingPlaylistMemo[id]);
        }
    }
    buildVideoAndAccount(row) {
        if (this.videosMemo[row.id])
            return;
        const videoModel = new VideoModel(this.grab(row, this.tables.getVideoAttributes(), ''), this.buildOpts);
        videoModel.UserVideoHistories = [];
        videoModel.Thumbnails = [];
        videoModel.VideoFiles = [];
        videoModel.VideoStreamingPlaylists = [];
        videoModel.Tags = [];
        videoModel.VideoAutomaticTags = [];
        videoModel.Trackers = [];
        this.buildAccount(row, videoModel);
        this.videosMemo[row.id] = videoModel;
        this.videos.push(videoModel);
    }
    buildAccount(row, videoModel) {
        const id = row['VideoChannel.Account.id'];
        if (!id)
            return;
        const channelModel = new VideoChannelModel(this.grab(row, this.tables.getChannelAttributes(), 'VideoChannel'), this.buildOpts);
        channelModel.Actor = this.buildActor(row, 'VideoChannel');
        const accountModel = new AccountModel(this.grab(row, this.tables.getAccountAttributes(), 'VideoChannel.Account'), this.buildOpts);
        accountModel.Actor = this.buildActor(row, 'VideoChannel.Account');
        accountModel.BlockedBy = [];
        channelModel.Account = accountModel;
        videoModel.VideoChannel = channelModel;
    }
    buildActor(row, prefix) {
        const actorPrefix = `${prefix}.Actor`;
        const serverPrefix = `${actorPrefix}.Server`;
        const serverModel = row[`${serverPrefix}.id`] !== null
            ? new ServerModel(this.grab(row, this.tables.getServerAttributes(), serverPrefix), this.buildOpts)
            : null;
        if (serverModel)
            serverModel.BlockedBy = [];
        const actorModel = new ActorModel(this.grab(row, this.tables.getActorAttributes(), actorPrefix), this.buildOpts);
        actorModel.Server = serverModel;
        actorModel.Avatars = [];
        return actorModel;
    }
    setUserHistory(row, videoModel) {
        const id = row['userVideoHistory.id'];
        if (!id || this.historyDone.has(id))
            return;
        const attributes = this.grab(row, this.tables.getUserHistoryAttributes(), 'userVideoHistory');
        const historyModel = new UserVideoHistoryModel(attributes, this.buildOpts);
        videoModel.UserVideoHistories.push(historyModel);
        this.historyDone.add(id);
    }
    addActorAvatar(row, actorPrefix, actor) {
        const avatarPrefix = `${actorPrefix}.Avatars`;
        const id = row[`${avatarPrefix}.id`];
        const key = `${row.id}${id}`;
        if (!id || this.actorImagesDone.has(key))
            return;
        const attributes = this.grab(row, this.tables.getAvatarAttributes(), avatarPrefix);
        const avatarModel = new ActorImageModel(attributes, this.buildOpts);
        actor.Avatars.push(avatarModel);
        this.actorImagesDone.add(key);
    }
    addThumbnail(row, videoModel) {
        const id = row['Thumbnails.id'];
        if (!id || this.thumbnailsDone.has(id))
            return;
        const attributes = this.grab(row, this.tables.getThumbnailAttributes(), 'Thumbnails');
        const thumbnailModel = new ThumbnailModel(attributes, this.buildOpts);
        videoModel.Thumbnails.push(thumbnailModel);
        this.thumbnailsDone.add(id);
    }
    addWebVideoFile(row, videoModel) {
        const id = row['VideoFiles.id'];
        if (!id || this.videoFileMemo[id])
            return;
        const attributes = this.grab(row, this.tables.getFileAttributes(), 'VideoFiles');
        const videoFileModel = new VideoFileModel(attributes, this.buildOpts);
        videoModel.VideoFiles.push(videoFileModel);
        this.videoFileMemo[id] = videoFileModel;
    }
    addStreamingPlaylist(row, videoModel) {
        const id = row['VideoStreamingPlaylists.id'];
        if (!id || this.videoStreamingPlaylistMemo[id])
            return;
        const attributes = this.grab(row, this.tables.getStreamingPlaylistAttributes(), 'VideoStreamingPlaylists');
        const streamingPlaylist = new VideoStreamingPlaylistModel(attributes, this.buildOpts);
        streamingPlaylist.VideoFiles = [];
        videoModel.VideoStreamingPlaylists.push(streamingPlaylist);
        this.videoStreamingPlaylistMemo[id] = streamingPlaylist;
    }
    addStreamingPlaylistFile(row) {
        const id = row['VideoStreamingPlaylists.VideoFiles.id'];
        if (!id || this.videoFileMemo[id])
            return;
        const streamingPlaylist = this.videoStreamingPlaylistMemo[row['VideoStreamingPlaylists.id']];
        const attributes = this.grab(row, this.tables.getFileAttributes(), 'VideoStreamingPlaylists.VideoFiles');
        const videoFileModel = new VideoFileModel(attributes, this.buildOpts);
        streamingPlaylist.VideoFiles.push(videoFileModel);
        this.videoFileMemo[id] = videoFileModel;
    }
    addRedundancy(row, prefix, to) {
        if (!to.RedundancyVideos)
            to.RedundancyVideos = [];
        const redundancyPrefix = `${prefix}.RedundancyVideos`;
        const id = row[`${redundancyPrefix}.id`];
        if (!id || this.redundancyDone.has(id))
            return;
        const attributes = this.grab(row, this.tables.getRedundancyAttributes(), redundancyPrefix);
        const redundancyModel = new VideoRedundancyModel(attributes, this.buildOpts);
        to.RedundancyVideos.push(redundancyModel);
        this.redundancyDone.add(id);
    }
    addTag(row, videoModel) {
        if (!row['Tags.name'])
            return;
        const key = `${row['Tags.VideoTagModel.videoId']}-${row['Tags.VideoTagModel.tagId']}`;
        if (this.tagsDone.has(key))
            return;
        const attributes = this.grab(row, this.tables.getTagAttributes(), 'Tags');
        const tagModel = new TagModel(attributes, this.buildOpts);
        videoModel.Tags.push(tagModel);
        this.tagsDone.add(key);
    }
    addAutoTag(row, videoModel) {
        if (!row['VideoAutomaticTags.AutomaticTag.id'])
            return;
        const key = `${row['VideoAutomaticTags.videoId']}-${row['VideoAutomaticTags.accountId']}-${row['VideoAutomaticTags.automaticTagId']}`;
        if (this.autoTagsDone.has(key))
            return;
        const videoAutomaticTagAttributes = this.grab(row, this.tables.getVideoAutoTagAttributes(), 'VideoAutomaticTags');
        const automaticTagModel = new VideoAutomaticTagModel(videoAutomaticTagAttributes, this.buildOpts);
        const automaticTagAttributes = this.grab(row, this.tables.getAutoTagAttributes(), 'VideoAutomaticTags.AutomaticTag');
        automaticTagModel.AutomaticTag = new AutomaticTagModel(automaticTagAttributes, this.buildOpts);
        videoModel.VideoAutomaticTags.push(automaticTagModel);
        this.autoTagsDone.add(key);
    }
    addTracker(row, videoModel) {
        if (!row['Trackers.id'])
            return;
        const key = `${row['Trackers.VideoTrackerModel.videoId']}-${row['Trackers.VideoTrackerModel.trackerId']}`;
        if (this.trackersDone.has(key))
            return;
        const attributes = this.grab(row, this.tables.getTrackerAttributes(), 'Trackers');
        const trackerModel = new TrackerModel(attributes, this.buildOpts);
        videoModel.Trackers.push(trackerModel);
        this.trackersDone.add(key);
    }
    setBlacklisted(row, videoModel) {
        const id = row['VideoBlacklist.id'];
        if (!id || this.blacklistDone.has(id))
            return;
        const attributes = this.grab(row, this.tables.getBlacklistedAttributes(), 'VideoBlacklist');
        videoModel.VideoBlacklist = new VideoBlacklistModel(attributes, this.buildOpts);
        this.blacklistDone.add(id);
    }
    setBlockedOwner(row, videoModel) {
        const id = row['VideoChannel.Account.AccountBlocklist.id'];
        if (!id)
            return;
        const key = `${videoModel.id}-${id}`;
        if (this.accountBlocklistDone.has(key))
            return;
        const attributes = this.grab(row, this.tables.getBlocklistAttributes(), 'VideoChannel.Account.AccountBlocklist');
        videoModel.VideoChannel.Account.BlockedBy.push(new AccountBlocklistModel(attributes, this.buildOpts));
        this.accountBlocklistDone.add(key);
    }
    setBlockedServer(row, videoModel) {
        const id = row['VideoChannel.Account.Actor.Server.ServerBlocklist.id'];
        if (!id || this.serverBlocklistDone.has(id))
            return;
        const key = `${videoModel.id}-${id}`;
        if (this.serverBlocklistDone.has(key))
            return;
        const attributes = this.grab(row, this.tables.getBlocklistAttributes(), 'VideoChannel.Account.Actor.Server.ServerBlocklist');
        videoModel.VideoChannel.Account.Actor.Server.BlockedBy.push(new ServerBlocklistModel(attributes, this.buildOpts));
        this.serverBlocklistDone.add(key);
    }
    setScheduleVideoUpdate(row, videoModel) {
        const id = row['ScheduleVideoUpdate.id'];
        if (!id || this.scheduleVideoUpdateDone.has(id))
            return;
        const attributes = this.grab(row, this.tables.getScheduleUpdateAttributes(), 'ScheduleVideoUpdate');
        videoModel.ScheduleVideoUpdate = new ScheduleVideoUpdateModel(attributes, this.buildOpts);
        this.scheduleVideoUpdateDone.add(id);
    }
    setLive(row, videoModel) {
        const id = row['VideoLive.id'];
        if (!id || this.liveDone.has(id))
            return;
        const attributes = this.grab(row, this.tables.getLiveAttributes(), 'VideoLive');
        videoModel.VideoLive = new VideoLiveModel(attributes, this.buildOpts);
        this.liveDone.add(id);
    }
    setSource(row, videoModel) {
        const id = row['VideoSource.id'];
        if (!id || this.sourceDone.has(id))
            return;
        const attributes = this.grab(row, this.tables.getVideoSourceAttributes(), 'VideoSource');
        videoModel.VideoSource = new VideoSourceModel(attributes, this.buildOpts);
        this.sourceDone.add(id);
    }
    grab(row, attributes, prefix) {
        const result = {};
        for (const a of attributes) {
            const key = prefix
                ? prefix + '.' + a
                : a;
            result[a] = row[key];
        }
        return result;
    }
}
//# sourceMappingURL=video-model-builder.js.map