import validator from 'validator';
import { ActorImageType } from '@peertube/peertube-models';
import { AbstractRunQuery } from '../../../../shared/abstract-run-query.js';
import { createSafeIn } from '../../../../shared/index.js';
import { VideoTableAttributes } from './video-table-attributes.js';
export class AbstractVideoQueryBuilder extends AbstractRunQuery {
    constructor(sequelize, mode) {
        super(sequelize);
        this.sequelize = sequelize;
        this.mode = mode;
        this.attributes = {};
        this.joins = '';
        this.tables = new VideoTableAttributes(this.mode);
    }
    buildSelect() {
        return 'SELECT ' + Object.keys(this.attributes).map(key => {
            const value = this.attributes[key];
            if (value)
                return `${key} AS ${value}`;
            return key;
        }).join(', ');
    }
    includeChannels() {
        this.addJoin('INNER JOIN "videoChannel" AS "VideoChannel" ON "video"."channelId" = "VideoChannel"."id"');
        this.addJoin('INNER JOIN "actor" AS "VideoChannel->Actor" ON "VideoChannel"."actorId" = "VideoChannel->Actor"."id"');
        this.addJoin('LEFT OUTER JOIN "server" AS "VideoChannel->Actor->Server" ON "VideoChannel->Actor"."serverId" = "VideoChannel->Actor->Server"."id"');
        this.addJoin('LEFT OUTER JOIN "actorImage" AS "VideoChannel->Actor->Avatars" ' +
            'ON "VideoChannel->Actor"."id" = "VideoChannel->Actor->Avatars"."actorId" ' +
            `AND "VideoChannel->Actor->Avatars"."type" = ${ActorImageType.AVATAR}`);
        this.attributes = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoChannel', this.tables.getChannelAttributes())), this.buildActorInclude('VideoChannel->Actor')), this.buildAvatarInclude('VideoChannel->Actor->Avatars')), this.buildServerInclude('VideoChannel->Actor->Server'));
    }
    includeAccounts() {
        this.addJoin('INNER JOIN "account" AS "VideoChannel->Account" ON "VideoChannel"."accountId" = "VideoChannel->Account"."id"');
        this.addJoin('INNER JOIN "actor" AS "VideoChannel->Account->Actor" ON "VideoChannel->Account"."actorId" = "VideoChannel->Account->Actor"."id"');
        this.addJoin('LEFT OUTER JOIN "server" AS "VideoChannel->Account->Actor->Server" ' +
            'ON "VideoChannel->Account->Actor"."serverId" = "VideoChannel->Account->Actor->Server"."id"');
        this.addJoin('LEFT OUTER JOIN "actorImage" AS "VideoChannel->Account->Actor->Avatars" ' +
            'ON "VideoChannel->Account"."actorId"= "VideoChannel->Account->Actor->Avatars"."actorId" ' +
            `AND "VideoChannel->Account->Actor->Avatars"."type" = ${ActorImageType.AVATAR}`);
        this.attributes = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoChannel->Account', this.tables.getAccountAttributes())), this.buildActorInclude('VideoChannel->Account->Actor')), this.buildAvatarInclude('VideoChannel->Account->Actor->Avatars')), this.buildServerInclude('VideoChannel->Account->Actor->Server'));
    }
    includeOwnerUser() {
        this.addJoin('INNER JOIN "videoChannel" AS "VideoChannel" ON "video"."channelId" = "VideoChannel"."id"');
        this.addJoin('INNER JOIN "account" AS "VideoChannel->Account" ON "VideoChannel"."accountId" = "VideoChannel->Account"."id"');
        this.attributes = Object.assign(Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoChannel', this.tables.getChannelAttributes())), this.buildAttributesObject('VideoChannel->Account', this.tables.getUserAccountAttributes()));
    }
    includeThumbnails() {
        this.addJoin('LEFT OUTER JOIN "thumbnail" AS "Thumbnails" ON "video"."id" = "Thumbnails"."videoId"');
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('Thumbnails', this.tables.getThumbnailAttributes()));
    }
    includeWebVideoFiles() {
        this.addJoin('LEFT JOIN "videoFile" AS "VideoFiles" ON "VideoFiles"."videoId" = "video"."id"');
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoFiles', this.tables.getFileAttributes()));
    }
    includeStreamingPlaylistFiles() {
        this.addJoin('LEFT JOIN "videoStreamingPlaylist" AS "VideoStreamingPlaylists" ON "VideoStreamingPlaylists"."videoId" = "video"."id"');
        this.addJoin('LEFT JOIN "videoFile" AS "VideoStreamingPlaylists->VideoFiles" ' +
            'ON "VideoStreamingPlaylists->VideoFiles"."videoStreamingPlaylistId" = "VideoStreamingPlaylists"."id"');
        this.attributes = Object.assign(Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoStreamingPlaylists', this.tables.getStreamingPlaylistAttributes())), this.buildAttributesObject('VideoStreamingPlaylists->VideoFiles', this.tables.getFileAttributes()));
    }
    includeUserHistory(userId) {
        this.addJoin('LEFT OUTER JOIN "userVideoHistory" ' +
            'ON "video"."id" = "userVideoHistory"."videoId" AND "userVideoHistory"."userId" = :userVideoHistoryId');
        this.replacements.userVideoHistoryId = userId;
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('userVideoHistory', this.tables.getUserHistoryAttributes()));
    }
    includePlaylist(playlistId) {
        this.addJoin('INNER JOIN "videoPlaylistElement" as "VideoPlaylistElement" ON "videoPlaylistElement"."videoId" = "video"."id" ' +
            'AND "VideoPlaylistElement"."videoPlaylistId" = :videoPlaylistId');
        this.replacements.videoPlaylistId = playlistId;
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoPlaylistElement', this.tables.getPlaylistAttributes()));
    }
    includeTags() {
        this.addJoin('LEFT OUTER JOIN (' +
            '"videoTag" AS "Tags->VideoTagModel" INNER JOIN "tag" AS "Tags" ON "Tags"."id" = "Tags->VideoTagModel"."tagId"' +
            ') ' +
            'ON "video"."id" = "Tags->VideoTagModel"."videoId"');
        this.attributes = Object.assign(Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('Tags', this.tables.getTagAttributes())), this.buildAttributesObject('Tags->VideoTagModel', this.tables.getVideoTagAttributes()));
    }
    includeBlacklisted() {
        this.addJoin('LEFT OUTER JOIN "videoBlacklist" AS "VideoBlacklist" ON "video"."id" = "VideoBlacklist"."videoId"');
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoBlacklist', this.tables.getBlacklistedAttributes()));
    }
    includeBlockedOwnerAndServer(serverAccountId, user) {
        const blockerIds = [serverAccountId];
        if (user)
            blockerIds.push(user.Account.id);
        const inClause = createSafeIn(this.sequelize, blockerIds);
        this.addJoin('LEFT JOIN "accountBlocklist" AS "VideoChannel->Account->AccountBlocklist" ' +
            'ON "VideoChannel->Account"."id" = "VideoChannel->Account->AccountBlocklist"."targetAccountId" ' +
            'AND "VideoChannel->Account->AccountBlocklist"."accountId" IN (' + inClause + ')');
        this.addJoin('LEFT JOIN "serverBlocklist" AS "VideoChannel->Account->Actor->Server->ServerBlocklist" ' +
            'ON "VideoChannel->Account->Actor->Server->ServerBlocklist"."targetServerId" = "VideoChannel->Account->Actor"."serverId" ' +
            'AND "VideoChannel->Account->Actor->Server->ServerBlocklist"."accountId" IN (' + inClause + ') ');
        this.attributes = Object.assign(Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoChannel->Account->AccountBlocklist', this.tables.getBlocklistAttributes())), this.buildAttributesObject('VideoChannel->Account->Actor->Server->ServerBlocklist', this.tables.getBlocklistAttributes()));
    }
    includeScheduleUpdate() {
        this.addJoin('LEFT OUTER JOIN "scheduleVideoUpdate" AS "ScheduleVideoUpdate" ON "video"."id" = "ScheduleVideoUpdate"."videoId"');
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('ScheduleVideoUpdate', this.tables.getScheduleUpdateAttributes()));
    }
    includeLive() {
        this.addJoin('LEFT OUTER JOIN "videoLive" AS "VideoLive" ON "video"."id" = "VideoLive"."videoId"');
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoLive', this.tables.getLiveAttributes()));
    }
    includeVideoSource() {
        this.addJoin('LEFT OUTER JOIN "videoSource" AS "VideoSource" ON "video"."id" = "VideoSource"."videoId"');
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoSource', this.tables.getVideoSourceAttributes()));
    }
    includeAutomaticTags(autoTagOfAccountId) {
        this.addJoin('LEFT JOIN (' +
            '"videoAutomaticTag" AS "VideoAutomaticTags" INNER JOIN "automaticTag" AS "VideoAutomaticTags->AutomaticTag" ' +
            'ON "VideoAutomaticTags->AutomaticTag"."id" = "VideoAutomaticTags"."automaticTagId" ' +
            ') ON "video"."id" = "VideoAutomaticTags"."videoId" AND "VideoAutomaticTags"."accountId" = :autoTagOfAccountId');
        this.replacements.autoTagOfAccountId = autoTagOfAccountId;
        this.attributes = Object.assign(Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoAutomaticTags', this.tables.getVideoAutoTagAttributes())), this.buildAttributesObject('VideoAutomaticTags->AutomaticTag', this.tables.getAutoTagAttributes()));
    }
    includeTrackers() {
        this.addJoin('LEFT OUTER JOIN (' +
            '"videoTracker" AS "Trackers->VideoTrackerModel" ' +
            'INNER JOIN "tracker" AS "Trackers" ON "Trackers"."id" = "Trackers->VideoTrackerModel"."trackerId"' +
            ') ON "video"."id" = "Trackers->VideoTrackerModel"."videoId"');
        this.attributes = Object.assign(Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('Trackers', this.tables.getTrackerAttributes())), this.buildAttributesObject('Trackers->VideoTrackerModel', this.tables.getVideoTrackerAttributes()));
    }
    includeStreamingPlaylistRedundancies() {
        this.addJoin('LEFT OUTER JOIN "videoRedundancy" AS "VideoStreamingPlaylists->RedundancyVideos" ' +
            'ON "VideoStreamingPlaylists"."id" = "VideoStreamingPlaylists->RedundancyVideos"."videoStreamingPlaylistId"');
        this.attributes = Object.assign(Object.assign({}, this.attributes), this.buildAttributesObject('VideoStreamingPlaylists->RedundancyVideos', this.tables.getRedundancyAttributes()));
    }
    buildActorInclude(prefixKey) {
        return this.buildAttributesObject(prefixKey, this.tables.getActorAttributes());
    }
    buildAvatarInclude(prefixKey) {
        return this.buildAttributesObject(prefixKey, this.tables.getAvatarAttributes());
    }
    buildServerInclude(prefixKey) {
        return this.buildAttributesObject(prefixKey, this.tables.getServerAttributes());
    }
    buildAttributesObject(prefixKey, attributeKeys) {
        const result = {};
        const prefixValue = prefixKey.replace(/->/g, '.');
        for (const attribute of attributeKeys) {
            result[`"${prefixKey}"."${attribute}"`] = `"${prefixValue}.${attribute}"`;
        }
        return result;
    }
    whereId(options) {
        if (options.ids) {
            this.where = `WHERE "video"."id" IN (${createSafeIn(this.sequelize, options.ids)})`;
            return;
        }
        if (options.url) {
            this.where = 'WHERE "video"."url" = :videoUrl';
            this.replacements.videoUrl = options.url;
            return;
        }
        if (validator.default.isInt('' + options.id)) {
            this.where = 'WHERE "video".id = :videoId';
        }
        else {
            this.where = 'WHERE uuid = :videoId';
        }
        this.replacements.videoId = options.id;
    }
    addJoin(join) {
        this.joins += join + ' ';
    }
}
//# sourceMappingURL=abstract-video-query-builder.js.map