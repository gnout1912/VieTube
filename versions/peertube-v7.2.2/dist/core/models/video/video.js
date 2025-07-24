var VideoModel_1;
import { __decorate, __metadata } from "tslib";
import { buildVideoEmbedPath, buildVideoWatchPath, maxBy, pick, sortBy, wait } from '@peertube/peertube-core-utils';
import { FileStorage, ThumbnailType, UserRight, VideoFileStream, VideoInclude, VideoPrivacy, VideoState, VideoStreamingPlaylistType } from '@peertube/peertube-models';
import { uuidToShort } from '@peertube/peertube-node-utils';
import { getPrivaciesForFederation } from '../../helpers/video.js';
import { InternalEventEmitter } from '../../lib/internal-event-emitter.js';
import { LiveManager } from '../../lib/live/live-manager.js';
import { removeHLSFileObjectStorageByFilename, removeHLSObjectStorage, removeOriginalFileObjectStorage, removeWebVideoObjectStorage } from '../../lib/object-storage/index.js';
import { tracer } from '../../lib/opentelemetry/tracing.js';
import { getHLSDirectory, getHLSRedundancyDirectory, getHLSResolutionPlaylistFilename } from '../../lib/paths.js';
import { Hooks } from '../../lib/plugins/hooks.js';
import { VideoPathManager } from '../../lib/video-path-manager.js';
import { isVideoInPrivateDirectory } from '../../lib/video-privacy.js';
import { getServerActor } from '../application/application.js';
import { ModelCache } from '../shared/model-cache.js';
import Bluebird from 'bluebird';
import { remove } from 'fs-extra/esm';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import { AfterCreate, AfterDestroy, AfterUpdate, AllowNull, BeforeDestroy, BelongsTo, BelongsToMany, Column, CreatedAt, DataType, Default, ForeignKey, HasMany, HasOne, Is, IsInt, IsUUID, Min, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { peertubeTruncate } from '../../helpers/core-utils.js';
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { isArray, isBooleanValid, isUUIDValid } from '../../helpers/custom-validators/misc.js';
import { isNSFWFlagsValid, isNSFWSummaryValid, isVideoDescriptionValid, isVideoDurationValid, isVideoNameValid, isVideoPrivacyValid, isVideoStateValid, isVideoSupportValid } from '../../helpers/custom-validators/videos.js';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { ACTIVITY_PUB, API_VERSION, CONSTRAINTS_FIELDS, WEBSERVER } from '../../initializers/constants.js';
import { sendDeleteVideo } from '../../lib/activitypub/send/index.js';
import { VideoAbuseModel } from '../abuse/video-abuse.js';
import { AccountVideoRateModel } from '../account/account-video-rate.js';
import { AccountModel } from '../account/account.js';
import { ActorImageModel } from '../actor/actor-image.js';
import { ActorModel } from '../actor/actor.js';
import { VideoAutomaticTagModel } from '../automatic-tag/video-automatic-tag.js';
import { ServerModel } from '../server/server.js';
import { TrackerModel } from '../server/tracker.js';
import { VideoTrackerModel } from '../server/video-tracker.js';
import { SequelizeModel, buildTrigramSearchIndex, buildWhereIdOrUUID, doesExist, getVideoSort, isOutdated, setAsUpdated, throwIfNotValid } from '../shared/index.js';
import { UserVideoHistoryModel } from '../user/user-video-history.js';
import { UserModel } from '../user/user.js';
import { VideoViewModel } from '../view/video-view.js';
import { videoModelToActivityPubObject } from './formatter/video-activity-pub-format.js';
import { videoFilesModelToFormattedJSON, videoModelToFormattedDetailsJSON, videoModelToFormattedJSON } from './formatter/video-api-format.js';
import { ScheduleVideoUpdateModel } from './schedule-video-update.js';
import { VideoModelGetQueryBuilder, VideosIdListQueryBuilder, VideosModelListQueryBuilder } from './sql/video/index.js';
import { StoryboardModel } from './storyboard.js';
import { TagModel } from './tag.js';
import { ThumbnailModel } from './thumbnail.js';
import { VideoBlacklistModel } from './video-blacklist.js';
import { VideoCaptionModel } from './video-caption.js';
import { VideoChannelModel, ScopeNames as VideoChannelScopeNames } from './video-channel.js';
import { VideoCommentModel } from './video-comment.js';
import { VideoFileModel } from './video-file.js';
import { VideoImportModel } from './video-import.js';
import { VideoJobInfoModel } from './video-job-info.js';
import { VideoLiveModel } from './video-live.js';
import { VideoPasswordModel } from './video-password.js';
import { VideoPlaylistElementModel } from './video-playlist-element.js';
import { VideoShareModel } from './video-share.js';
import { VideoSourceModel } from './video-source.js';
import { VideoStreamingPlaylistModel } from './video-streaming-playlist.js';
import { VideoTagModel } from './video-tag.js';
const lTags = loggerTagsFactory('video');
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["FOR_API"] = "FOR_API";
    ScopeNames["WITH_ACCOUNT_DETAILS"] = "WITH_ACCOUNT_DETAILS";
    ScopeNames["WITH_TAGS"] = "WITH_TAGS";
    ScopeNames["WITH_WEB_VIDEO_FILES"] = "WITH_WEB_VIDEO_FILES";
    ScopeNames["WITH_BLACKLISTED"] = "WITH_BLACKLISTED";
    ScopeNames["WITH_STREAMING_PLAYLISTS"] = "WITH_STREAMING_PLAYLISTS";
    ScopeNames["WITH_IMMUTABLE_ATTRIBUTES"] = "WITH_IMMUTABLE_ATTRIBUTES";
    ScopeNames["WITH_USER_HISTORY"] = "WITH_USER_HISTORY";
    ScopeNames["WITH_THUMBNAILS"] = "WITH_THUMBNAILS";
})(ScopeNames || (ScopeNames = {}));
let VideoModel = VideoModel_1 = class VideoModel extends SequelizeModel {
    static notifyCreate(video) {
        InternalEventEmitter.Instance.emit('video-created', { video });
    }
    static notifyUpdate(video) {
        InternalEventEmitter.Instance.emit('video-updated', { video });
    }
    static notifyDestroy(video) {
        InternalEventEmitter.Instance.emit('video-deleted', { video });
    }
    static stopLiveIfNeeded(instance) {
        if (!instance.isLive)
            return;
        logger.info('Stopping live of video %s after video deletion.', instance.uuid);
        LiveManager.Instance.stopSessionOfVideo({ videoUUID: instance.uuid, error: null });
    }
    static invalidateCache(instance) {
        ModelCache.Instance.invalidateCache('video', instance.id);
    }
    static async sendDelete(instance, options) {
        if (!instance.isOwned())
            return undefined;
        if (!instance.VideoChannel) {
            instance.VideoChannel = await instance.$get('VideoChannel', {
                include: [
                    ActorModel,
                    AccountModel
                ],
                transaction: options.transaction
            });
        }
        return sendDeleteVideo(instance, options.transaction);
    }
    static async removeFiles(instance, options) {
        const tasks = [];
        logger.info('Removing files of video ' + instance.url);
        if (instance.isOwned()) {
            if (!Array.isArray(instance.VideoFiles)) {
                instance.VideoFiles = await instance.$get('VideoFiles', { transaction: options.transaction });
            }
            instance.VideoFiles.forEach(file => {
                tasks.push(instance.removeWebVideoFile(file));
            });
            if (!Array.isArray(instance.VideoStreamingPlaylists)) {
                instance.VideoStreamingPlaylists = await instance.$get('VideoStreamingPlaylists', { transaction: options.transaction });
            }
            for (const p of instance.VideoStreamingPlaylists) {
                tasks.push(instance.removeAllStreamingPlaylistFiles({ playlist: p, deleteCaptionPlaylists: false }));
            }
            const promiseRemoveSources = VideoSourceModel.listAll(instance.id, options.transaction)
                .then(sources => Promise.all(sources.map(s => instance.removeOriginalFile(s))));
            tasks.push(promiseRemoveSources);
        }
        Promise.all(tasks)
            .then(() => logger.info('Removed files of video %s.', instance.url))
            .catch(err => logger.error('Some errors when removing files of video %s in before destroy hook.', instance.uuid, { err }));
        return undefined;
    }
    static async saveEssentialDataToAbuses(instance, options) {
        const tasks = [];
        if (!Array.isArray(instance.VideoAbuses)) {
            instance.VideoAbuses = await instance.$get('VideoAbuses', { transaction: options.transaction });
            if (instance.VideoAbuses.length === 0)
                return undefined;
        }
        logger.info('Saving video abuses details of video %s.', instance.url);
        if (!instance.Trackers)
            instance.Trackers = await instance.$get('Trackers', { transaction: options.transaction });
        const details = instance.toFormattedDetailsJSON();
        for (const abuse of instance.VideoAbuses) {
            abuse.deletedVideo = details;
            tasks.push(abuse.save({ transaction: options.transaction }));
        }
        await Promise.all(tasks);
    }
    static listLocalIds() {
        const query = {
            attributes: ['id'],
            raw: true,
            where: {
                remote: false
            }
        };
        return VideoModel_1.findAll(query)
            .then(rows => rows.map(r => r.id));
    }
    static listAllAndSharedByActorForOutbox(actorId, start, count) {
        function getRawQuery(select) {
            const queryVideo = 'SELECT ' + select + ' FROM "video" AS "Video" ' +
                'INNER JOIN "videoChannel" AS "VideoChannel" ON "VideoChannel"."id" = "Video"."channelId" ' +
                'INNER JOIN "account" AS "Account" ON "Account"."id" = "VideoChannel"."accountId" ' +
                'WHERE "Account"."actorId" = ' + actorId;
            const queryVideoShare = 'SELECT ' + select + ' FROM "videoShare" AS "VideoShare" ' +
                'INNER JOIN "video" AS "Video" ON "Video"."id" = "VideoShare"."videoId" ' +
                'WHERE "VideoShare"."actorId" = ' + actorId;
            return `(${queryVideo}) UNION (${queryVideoShare})`;
        }
        const rawQuery = getRawQuery('"Video"."id"');
        const rawCountQuery = getRawQuery('COUNT("Video"."id") as "total"');
        const query = {
            distinct: true,
            offset: start,
            limit: count,
            order: getVideoSort('-createdAt', ['Tags', 'name', 'ASC']),
            where: {
                id: {
                    [Op.in]: Sequelize.literal('(' + rawQuery + ')')
                },
                [Op.or]: getPrivaciesForFederation()
            },
            include: [
                {
                    attributes: ['filename', 'language', 'storage', 'fileUrl'],
                    model: VideoCaptionModel.unscoped(),
                    required: false
                },
                {
                    model: StoryboardModel.unscoped(),
                    required: false
                },
                {
                    attributes: ['id', 'url'],
                    model: VideoShareModel.unscoped(),
                    required: false,
                    where: {
                        [Op.and]: [
                            {
                                id: {
                                    [Op.not]: null
                                }
                            },
                            {
                                actorId
                            }
                        ]
                    },
                    include: [
                        {
                            attributes: ['id', 'url'],
                            model: ActorModel.unscoped()
                        }
                    ]
                },
                {
                    model: VideoChannelModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: ['name'],
                            model: AccountModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    attributes: ['id', 'url', 'followersUrl'],
                                    model: ActorModel.unscoped(),
                                    required: true
                                }
                            ]
                        },
                        {
                            attributes: ['id', 'url', 'followersUrl'],
                            model: ActorModel.unscoped(),
                            required: true
                        }
                    ]
                },
                {
                    model: VideoStreamingPlaylistModel.unscoped(),
                    required: false,
                    include: [
                        {
                            model: VideoFileModel,
                            required: false
                        }
                    ]
                },
                VideoLiveModel.unscoped(),
                VideoFileModel,
                TagModel
            ]
        };
        return Bluebird.all([
            VideoModel_1.scope(ScopeNames.WITH_THUMBNAILS).findAll(query),
            VideoModel_1.sequelize.query(rawCountQuery, { type: QueryTypes.SELECT })
        ]).then(([rows, totals]) => {
            let totalVideos = 0;
            let totalVideoShares = 0;
            if (totals[0])
                totalVideos = parseInt(totals[0].total, 10);
            if (totals[1])
                totalVideoShares = parseInt(totals[1].total, 10);
            const total = totalVideos + totalVideoShares;
            return {
                data: rows,
                total
            };
        });
    }
    static async listPublishedLiveUUIDs() {
        const options = {
            attributes: ['uuid'],
            where: {
                isLive: true,
                remote: false,
                state: VideoState.PUBLISHED
            }
        };
        const result = await VideoModel_1.findAll(options);
        return result.map(v => v.uuid);
    }
    static async listForApi(options) {
        VideoModel_1.throwIfPrivateIncludeWithoutUser(options);
        VideoModel_1.throwIfPrivacyOneOfWithoutUser(options);
        const serverActor = await getServerActor();
        const queryOptions = Object.assign(Object.assign({}, pick(options, [
            'start',
            'count',
            'sort',
            'nsfw',
            'nsfwFlagsIncluded',
            'nsfwFlagsExcluded',
            'isLive',
            'categoryOneOf',
            'licenceOneOf',
            'languageOneOf',
            'host',
            'autoTagOneOf',
            'tagsOneOf',
            'tagsAllOf',
            'privacyOneOf',
            'isLocal',
            'include',
            'displayOnlyForFollower',
            'hasFiles',
            'accountId',
            'videoChannelId',
            'channelNameOneOf',
            'videoPlaylistId',
            'user',
            'historyOfUser',
            'hasHLSFiles',
            'hasWebVideoFiles',
            'search',
            'excludeAlreadyWatched'
        ])), { serverAccountIdForBlock: serverActor.Account.id, trendingDays: CONFIG.TRENDING.VIDEOS.INTERVAL_DAYS });
        return VideoModel_1.getAvailableForApi(queryOptions, options.countVideos);
    }
    static async searchAndPopulateAccountAndServer(options) {
        VideoModel_1.throwIfPrivateIncludeWithoutUser(options);
        VideoModel_1.throwIfPrivacyOneOfWithoutUser(options);
        const serverActor = await getServerActor();
        const queryOptions = Object.assign(Object.assign({}, pick(options, [
            'include',
            'nsfw',
            'nsfwFlagsIncluded',
            'nsfwFlagsExcluded',
            'isLive',
            'categoryOneOf',
            'licenceOneOf',
            'languageOneOf',
            'autoTagOneOf',
            'tagsOneOf',
            'tagsAllOf',
            'privacyOneOf',
            'user',
            'isLocal',
            'host',
            'start',
            'count',
            'sort',
            'startDate',
            'endDate',
            'originallyPublishedStartDate',
            'originallyPublishedEndDate',
            'durationMin',
            'durationMax',
            'hasHLSFiles',
            'hasWebVideoFiles',
            'uuids',
            'search',
            'displayOnlyForFollower',
            'excludeAlreadyWatched'
        ])), { trendingDays: CONFIG.TRENDING.VIDEOS.INTERVAL_DAYS, serverAccountIdForBlock: serverActor.Account.id });
        return VideoModel_1.getAvailableForApi(queryOptions, options.countVideos);
    }
    static countLives(options) {
        const query = {
            where: {
                remote: options.remote,
                isLive: true,
                state: options.mode === 'not-ended'
                    ? { [Op.ne]: VideoState.LIVE_ENDED }
                    : { [Op.eq]: VideoState.PUBLISHED }
            }
        };
        return VideoModel_1.count(query);
    }
    static countVideosUploadedByUserSince(userId, since) {
        const options = {
            include: [
                {
                    model: VideoChannelModel.unscoped(),
                    required: true,
                    include: [
                        {
                            model: AccountModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    model: UserModel.unscoped(),
                                    required: true,
                                    where: {
                                        id: userId
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            where: {
                createdAt: {
                    [Op.gte]: since
                }
            }
        };
        return VideoModel_1.unscoped().count(options);
    }
    static countLivesOfAccount(accountId) {
        const options = {
            where: {
                remote: false,
                isLive: true,
                state: {
                    [Op.ne]: VideoState.LIVE_ENDED
                }
            },
            include: [
                {
                    required: true,
                    model: VideoChannelModel.unscoped(),
                    where: {
                        accountId
                    }
                }
            ]
        };
        return VideoModel_1.count(options);
    }
    static load(id, transaction) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ id, transaction, type: 'thumbnails' });
    }
    static loadWithBlacklist(id, transaction) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ id, transaction, type: 'thumbnails-blacklist' });
    }
    static loadAndPopulateAccountAndFiles(id, transaction) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ id, transaction, type: 'account-blacklist-files' });
    }
    static loadImmutableAttributes(id, t) {
        const fun = () => {
            const query = {
                where: buildWhereIdOrUUID(id),
                transaction: t
            };
            return VideoModel_1.scope(ScopeNames.WITH_IMMUTABLE_ATTRIBUTES).findOne(query);
        };
        return ModelCache.Instance.doCache({
            cacheType: 'load-video-immutable-id',
            key: '' + id,
            deleteKey: 'video',
            fun
        });
    }
    static loadByUrlImmutableAttributes(url, transaction) {
        const fun = () => {
            const query = {
                where: {
                    url
                },
                transaction
            };
            return VideoModel_1.scope(ScopeNames.WITH_IMMUTABLE_ATTRIBUTES).findOne(query);
        };
        return ModelCache.Instance.doCache({
            cacheType: 'load-video-immutable-url',
            key: url,
            deleteKey: 'video',
            fun
        });
    }
    static loadOnlyId(id, transaction) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ id, transaction, type: 'id' });
    }
    static loadWithFiles(id, transaction, logging) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ id, transaction, type: 'all-files', logging });
    }
    static loadByUrl(url, transaction) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ url, transaction, type: 'thumbnails' });
    }
    static loadByUrlWithBlacklist(url, transaction) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ url, transaction, type: 'thumbnails-blacklist' });
    }
    static loadByUrlAndPopulateAccount(url, transaction) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ url, transaction, type: 'account' });
    }
    static loadByUrlAndPopulateAccountAndFiles(url, transaction) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ url, transaction, type: 'account-blacklist-files' });
    }
    static loadFull(id, t, userId) {
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ id, transaction: t, type: 'full', userId });
    }
    static loadForGetAPI(parameters) {
        const { id, transaction, userId } = parameters;
        const queryBuilder = new VideoModelGetQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideo({ id, transaction, type: 'api', userId });
    }
    static async getStats() {
        const serverActor = await getServerActor();
        let totalLocalVideoViews = await VideoModel_1.sum('views', {
            where: {
                remote: false
            }
        });
        if (!totalLocalVideoViews)
            totalLocalVideoViews = 0;
        const baseOptions = {
            start: 0,
            count: 0,
            sort: '-publishedAt',
            nsfw: null,
            displayOnlyForFollower: {
                actorId: serverActor.id,
                orLocalVideos: true
            }
        };
        const { total: totalLocalVideos } = await VideoModel_1.listForApi(Object.assign(Object.assign({}, baseOptions), { isLocal: true }));
        const { total: totalVideos } = await VideoModel_1.listForApi(baseOptions);
        return {
            totalLocalVideos,
            totalLocalVideoViews,
            totalVideos
        };
    }
    static loadByNameAndChannel(channel, name) {
        return VideoModel_1.unscoped().findOne({
            where: {
                name,
                channelId: channel.id
            }
        });
    }
    static incrementViews(id, views) {
        return VideoModel_1.increment('views', {
            by: views,
            where: {
                id
            }
        });
    }
    static updateRatesOf(videoId, type, count, t) {
        const field = type === 'like'
            ? 'likes'
            : 'dislikes';
        const rawQuery = `UPDATE "video" SET "${field}" = :count WHERE "video"."id" = :videoId`;
        return AccountVideoRateModel.sequelize.query(rawQuery, {
            transaction: t,
            replacements: { videoId, rateType: type, count },
            type: QueryTypes.UPDATE
        });
    }
    static syncLocalRates(videoId, type, t) {
        const field = type === 'like'
            ? 'likes'
            : 'dislikes';
        const rawQuery = `UPDATE "video" SET "${field}" = ` +
            '(' +
            'SELECT COUNT(id) FROM "accountVideoRate" WHERE "accountVideoRate"."videoId" = "video"."id" AND type = :rateType' +
            ') ' +
            'WHERE "video"."id" = :videoId';
        return AccountVideoRateModel.sequelize.query(rawQuery, {
            transaction: t,
            replacements: { videoId, rateType: type },
            type: QueryTypes.UPDATE
        });
    }
    static checkVideoHasInstanceFollow(videoId, followerActorId) {
        const query = 'SELECT 1 FROM "videoShare" ' +
            'INNER JOIN "actorFollow" ON "actorFollow"."targetActorId" = "videoShare"."actorId" ' +
            'WHERE "actorFollow"."actorId" = $followerActorId AND "actorFollow"."state" = \'accepted\' AND "videoShare"."videoId" = $videoId ' +
            'UNION ' +
            'SELECT 1 FROM "video" ' +
            'INNER JOIN "videoChannel" ON "videoChannel"."id" = "video"."channelId" ' +
            'INNER JOIN "account" ON "account"."id" = "videoChannel"."accountId" ' +
            'INNER JOIN "actorFollow" ON "actorFollow"."targetActorId" = "account"."actorId" ' +
            'WHERE "actorFollow"."actorId" = $followerActorId AND "actorFollow"."state" = \'accepted\' AND "video"."id" = $videoId ' +
            'LIMIT 1';
        const options = {
            type: QueryTypes.SELECT,
            bind: { followerActorId, videoId },
            raw: true
        };
        return VideoModel_1.sequelize.query(query, options)
            .then(results => results.length === 1);
    }
    static bulkUpdateSupportField(ofChannel, t) {
        const options = {
            where: {
                channelId: ofChannel.id
            },
            transaction: t
        };
        return VideoModel_1.update({ support: ofChannel.support }, options);
    }
    static async getAllIdsFromChannel(videoChannel, limit) {
        const videos = await VideoModel_1.findAll({
            attributes: ['id'],
            where: {
                channelId: videoChannel.id
            },
            limit
        });
        return videos.map(v => v.id);
    }
    static async getRandomFieldSamples(field, threshold, count) {
        const serverActor = await getServerActor();
        const queryOptions = {
            attributes: [`"${field}"`],
            group: `GROUP BY "${field}"`,
            having: `HAVING COUNT("${field}") >= ${threshold}`,
            start: 0,
            sort: 'random',
            count,
            serverAccountIdForBlock: serverActor.Account.id,
            displayOnlyForFollower: {
                actorId: serverActor.id,
                orLocalVideos: true
            },
            trendingDays: CONFIG.TRENDING.VIDEOS.INTERVAL_DAYS
        };
        const queryBuilder = new VideosIdListQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideoIds(queryOptions)
            .then(rows => rows.map(r => r[field]));
    }
    static buildTrendingQuery(trendingDays) {
        return {
            attributes: [],
            subQuery: false,
            model: VideoViewModel,
            required: false,
            where: {
                startDate: {
                    [Op.gte]: new Date(new Date().getTime() - (24 * 3600 * 1000) * trendingDays)
                }
            }
        };
    }
    static guessLanguageOrCategoryOfChannel(channelId, type) {
        const queryOptions = {
            attributes: [`COUNT("${type}") AS "total"`, `"${type}"`],
            group: `GROUP BY "${type}"`,
            having: `HAVING COUNT("${type}") > 0`,
            start: 0,
            count: 1,
            sort: '-total',
            videoChannelId: channelId,
            displayOnlyForFollower: null,
            serverAccountIdForBlock: null,
            trendingDays: CONFIG.TRENDING.VIDEOS.INTERVAL_DAYS
        };
        const queryBuilder = new VideosIdListQueryBuilder(VideoModel_1.sequelize);
        return queryBuilder.queryVideoIds(queryOptions)
            .then(rows => {
            var _a;
            const result = (_a = rows[0]) === null || _a === void 0 ? void 0 : _a[type];
            if (!result)
                return undefined;
            if (type === 'category')
                return parseInt(result, 10);
            return result;
        });
    }
    static channelHasNSFWContent(channelId) {
        const query = 'SELECT 1 FROM "video" WHERE "nsfw" IS TRUE AND "channelId" = $channelId LIMIT 1';
        return doesExist({ sequelize: this.sequelize, query, bind: { channelId } });
    }
    static async getAvailableForApi(options, countVideos = true) {
        const span = tracer.startSpan('peertube.VideoModel.getAvailableForApi');
        function getCount() {
            if (countVideos !== true)
                return Promise.resolve(undefined);
            const countOptions = Object.assign({}, options, { isCount: true });
            const queryBuilder = new VideosIdListQueryBuilder(VideoModel_1.sequelize);
            return queryBuilder.countVideoIds(countOptions);
        }
        function getModels() {
            if (options.count === 0)
                return Promise.resolve([]);
            const queryBuilder = new VideosModelListQueryBuilder(VideoModel_1.sequelize);
            return queryBuilder.queryVideos(options);
        }
        const [count, rows] = await Promise.all([getCount(), getModels()]);
        span.end();
        return {
            data: rows,
            total: count
        };
    }
    static throwIfPrivateIncludeWithoutUser(options) {
        const { include, user, accountId } = options;
        if (!VideoModel_1.isPrivateInclude(include))
            return;
        if (user === null || user === void 0 ? void 0 : user.hasRight(UserRight.SEE_ALL_VIDEOS))
            return;
        if (user.Account.id === accountId)
            return;
        throw new Error('Try to include protected videos but user cannot see all videos');
    }
    static throwIfPrivacyOneOfWithoutUser(options) {
        const { user, privacyOneOf, accountId } = options;
        if (!privacyOneOf)
            return;
        if (user === null || user === void 0 ? void 0 : user.hasRight(UserRight.SEE_ALL_VIDEOS))
            return;
        if (user.Account.id === accountId)
            return;
        throw new Error('Try to choose video privacies but user cannot see all videos');
    }
    static isPrivateInclude(include) {
        return !!(include & VideoInclude.BLACKLISTED ||
            include & VideoInclude.BLOCKED_OWNER ||
            include & VideoInclude.NOT_PUBLISHED_STATE);
    }
    isBlacklisted() {
        return !!this.VideoBlacklist;
    }
    isBlocked() {
        var _a;
        return ((_a = this.VideoChannel.Account.Actor.Server) === null || _a === void 0 ? void 0 : _a.isBlocked()) || this.VideoChannel.Account.isBlocked();
    }
    getMaxQualityAudioAndVideoFiles() {
        const videoFile = this.getMaxQualityFile(VideoFileStream.VIDEO);
        if (!videoFile) {
            const audioOnly = this.getMaxQualityFile(VideoFileStream.AUDIO);
            if (audioOnly)
                return { videoFile: audioOnly };
            return { videoFile: undefined };
        }
        if (videoFile.hasAudio())
            return { videoFile };
        const separatedAudioFile = this.getMaxQualityFile(VideoFileStream.AUDIO);
        if (!separatedAudioFile)
            return { videoFile };
        return { videoFile, separatedAudioFile };
    }
    getMaxQualityFile(streamFilter) {
        return this.getQualityFileBy(streamFilter, maxBy);
    }
    getMaxQualityBytes() {
        const { videoFile, separatedAudioFile } = this.getMaxQualityAudioAndVideoFiles();
        let size = (videoFile === null || videoFile === void 0 ? void 0 : videoFile.size) || 0;
        if (separatedAudioFile)
            size += separatedAudioFile.size;
        return size;
    }
    getQualityFileBy(streamFilter, fun) {
        const files = this.getAllFiles().filter(f => f.streams & streamFilter);
        const file = fun(files, 'resolution');
        if (!file)
            return undefined;
        if (file.videoId) {
            return Object.assign(file, { Video: this });
        }
        if (file.videoStreamingPlaylistId) {
            const streamingPlaylistWithVideo = Object.assign(this.VideoStreamingPlaylists[0], { Video: this });
            return Object.assign(file, { VideoStreamingPlaylist: streamingPlaylistWithVideo });
        }
        throw new Error('File is not associated to a video of a playlist');
    }
    getMaxFPS() {
        var _a;
        return ((_a = this.getMaxQualityFile(VideoFileStream.VIDEO)) === null || _a === void 0 ? void 0 : _a.fps) || 0;
    }
    getMaxResolution() {
        var _a, _b;
        return ((_a = this.getMaxQualityFile(VideoFileStream.VIDEO)) === null || _a === void 0 ? void 0 : _a.resolution) || ((_b = this.getMaxQualityFile(VideoFileStream.AUDIO)) === null || _b === void 0 ? void 0 : _b.resolution);
    }
    hasAudio() {
        return !!this.getMaxQualityFile(VideoFileStream.AUDIO);
    }
    hasVideo() {
        return !!this.getMaxQualityFile(VideoFileStream.VIDEO);
    }
    getWebVideoFileMinResolution(resolution) {
        if (Array.isArray(this.VideoFiles) === false)
            return undefined;
        for (const file of sortBy(this.VideoFiles, 'resolution')) {
            if (file.resolution < resolution)
                continue;
            return Object.assign(file, { Video: this });
        }
        return undefined;
    }
    hasWebVideoFiles() {
        return Array.isArray(this.VideoFiles) === true && this.VideoFiles.length !== 0;
    }
    async addAndSaveThumbnail(thumbnail, transaction) {
        thumbnail.videoId = this.id;
        const savedThumbnail = await thumbnail.save({ transaction });
        if (Array.isArray(this.Thumbnails) === false)
            this.Thumbnails = [];
        this.Thumbnails = this.Thumbnails.filter(t => t.id !== savedThumbnail.id);
        this.Thumbnails.push(savedThumbnail);
    }
    hasMiniature() {
        return !!this.getMiniature();
    }
    getMiniature() {
        if (Array.isArray(this.Thumbnails) === false)
            return undefined;
        return this.Thumbnails.find(t => t.type === ThumbnailType.MINIATURE);
    }
    hasPreview() {
        return !!this.getPreview();
    }
    getPreview() {
        if (Array.isArray(this.Thumbnails) === false)
            return undefined;
        return this.Thumbnails.find(t => t.type === ThumbnailType.PREVIEW);
    }
    isOwned() {
        return this.remote === false;
    }
    getWatchStaticPath() {
        return buildVideoWatchPath({ shortUUID: uuidToShort(this.uuid) });
    }
    getEmbedStaticPath() {
        return buildVideoEmbedPath({ shortUUID: uuidToShort(this.uuid) });
    }
    getMiniatureStaticPath() {
        const thumbnail = this.getMiniature();
        if (!thumbnail)
            return null;
        return thumbnail.getLocalStaticPath();
    }
    getPreviewStaticPath() {
        const preview = this.getPreview();
        if (!preview)
            return null;
        return preview.getLocalStaticPath();
    }
    toFormattedJSON(options) {
        return videoModelToFormattedJSON(this, options);
    }
    toFormattedDetailsJSON() {
        return videoModelToFormattedDetailsJSON(this);
    }
    getFormattedWebVideoFilesJSON(includeMagnet = true) {
        return videoFilesModelToFormattedJSON(this, this.VideoFiles, { includeMagnet });
    }
    getFormattedHLSVideoFilesJSON(includeMagnet = true) {
        let acc = [];
        for (const p of this.VideoStreamingPlaylists) {
            acc = acc.concat(videoFilesModelToFormattedJSON(this, p.VideoFiles, { includeMagnet }));
        }
        return acc;
    }
    getFormattedAllVideoFilesJSON(includeMagnet = true) {
        let files = [];
        if (Array.isArray(this.VideoFiles)) {
            files = files.concat(this.getFormattedWebVideoFilesJSON(includeMagnet));
        }
        if (Array.isArray(this.VideoStreamingPlaylists)) {
            files = files.concat(this.getFormattedHLSVideoFilesJSON(includeMagnet));
        }
        return files;
    }
    toActivityPubObject() {
        return Hooks.wrapObject(videoModelToActivityPubObject(this), 'filter:activity-pub.video.json-ld.build.result', { video: this });
    }
    async lightAPToFullAP(transaction) {
        const videoAP = this;
        const getCaptions = () => {
            if (isArray(videoAP.VideoCaptions))
                return videoAP.VideoCaptions;
            return this.$get('VideoCaptions', {
                attributes: ['filename', 'language', 'fileUrl', 'storage', 'automaticallyGenerated', 'm3u8Filename', 'm3u8Url'],
                transaction
            });
        };
        const getStoryboard = () => {
            if (videoAP.Storyboard)
                return videoAP.Storyboard;
            return this.$get('Storyboard', { transaction });
        };
        const [captions, storyboard] = await Promise.all([getCaptions(), getStoryboard()]);
        return Object.assign(this, {
            VideoCaptions: captions,
            Storyboard: storyboard
        });
    }
    getTruncatedDescription() {
        if (!this.description)
            return null;
        const maxLength = CONSTRAINTS_FIELDS.VIDEOS.TRUNCATED_DESCRIPTION.max;
        return peertubeTruncate(this.description, { length: maxLength });
    }
    getAllFiles() {
        let files = [];
        if (Array.isArray(this.VideoFiles)) {
            files = files.concat(this.VideoFiles);
        }
        if (Array.isArray(this.VideoStreamingPlaylists)) {
            for (const p of this.VideoStreamingPlaylists) {
                if (Array.isArray(p.VideoFiles)) {
                    files = files.concat(p.VideoFiles);
                }
            }
        }
        return files;
    }
    getDescriptionAPIPath() {
        return `/api/${API_VERSION}/videos/${this.uuid}/description`;
    }
    getHLSPlaylist() {
        if (!this.VideoStreamingPlaylists)
            return undefined;
        const playlist = this.VideoStreamingPlaylists.find(p => p.type === VideoStreamingPlaylistType.HLS);
        if (!playlist)
            return undefined;
        return playlist.withVideo(this);
    }
    setHLSPlaylist(playlist) {
        const toAdd = [playlist];
        if (Array.isArray(this.VideoStreamingPlaylists) === false || this.VideoStreamingPlaylists.length === 0) {
            this.VideoStreamingPlaylists = toAdd;
            return;
        }
        this.VideoStreamingPlaylists = this.VideoStreamingPlaylists
            .filter(s => s.type !== VideoStreamingPlaylistType.HLS)
            .concat(toAdd);
    }
    removeWebVideoFile(videoFile) {
        const filePath = VideoPathManager.Instance.getFSVideoFileOutputPath(this, videoFile);
        const promises = [
            remove(filePath),
            videoFile.removeTorrent()
        ];
        if (videoFile.storage === FileStorage.OBJECT_STORAGE) {
            promises.push(removeWebVideoObjectStorage(videoFile));
        }
        logger.debug(`Removing files associated to web video ${videoFile.filename}`, Object.assign({ videoFile }, lTags(this.uuid)));
        return Promise.all(promises);
    }
    async removeAllStreamingPlaylistFiles(options) {
        const { playlist, deleteCaptionPlaylists = true, isRedundancy = false } = options;
        const directoryPath = isRedundancy
            ? getHLSRedundancyDirectory(this)
            : getHLSDirectory(this);
        const removeDirectory = async () => {
            try {
                await remove(directoryPath);
            }
            catch (err) {
                if (err.code === 'ENOTEMPTY') {
                    await wait(1000);
                    await remove(directoryPath);
                    return;
                }
                throw err;
            }
        };
        if (isRedundancy) {
            await removeDirectory();
        }
        else {
            if (deleteCaptionPlaylists) {
                const captions = await VideoCaptionModel.listVideoCaptions(playlist.videoId);
                for (const caption of captions) {
                    try {
                        await caption.removeCaptionPlaylist();
                        await caption.save();
                    }
                    catch (err) {
                        logger.error(`Cannot remove caption ${caption.filename} (${caption.language}) playlist files associated to video ${this.name}`, Object.assign({ video: this }, lTags(this.uuid)));
                    }
                }
            }
            await removeDirectory();
            const playlistWithFiles = playlist;
            playlistWithFiles.Video = this;
            if (!Array.isArray(playlistWithFiles.VideoFiles)) {
                playlistWithFiles.VideoFiles = await playlistWithFiles.$get('VideoFiles');
            }
            await Promise.all(playlistWithFiles.VideoFiles.map(file => file.removeTorrent()));
            if (playlist.storage === FileStorage.OBJECT_STORAGE) {
                await removeHLSObjectStorage(playlist.withVideo(this));
            }
        }
        logger.debug(`Removing files associated to streaming playlist of video ${this.url}`, Object.assign({ playlist, isRedundancy }, lTags(this.uuid)));
    }
    async removeStreamingPlaylistVideoFile(streamingPlaylist, videoFile) {
        const filePath = VideoPathManager.Instance.getFSHLSOutputPath(this, videoFile.filename);
        await videoFile.removeTorrent();
        await remove(filePath);
        const resolutionFilename = getHLSResolutionPlaylistFilename(videoFile.filename);
        await remove(VideoPathManager.Instance.getFSHLSOutputPath(this, resolutionFilename));
        if (videoFile.storage === FileStorage.OBJECT_STORAGE) {
            await removeHLSFileObjectStorageByFilename(streamingPlaylist.withVideo(this), videoFile.filename);
            await removeHLSFileObjectStorageByFilename(streamingPlaylist.withVideo(this), resolutionFilename);
        }
        logger.debug(`Removing files associated to streaming playlist video file ${videoFile.filename}`, Object.assign({ streamingPlaylist }, lTags(this.uuid)));
    }
    async removeStreamingPlaylistFile(streamingPlaylist, filename) {
        const filePath = VideoPathManager.Instance.getFSHLSOutputPath(this, filename);
        await remove(filePath);
        if (streamingPlaylist.storage === FileStorage.OBJECT_STORAGE) {
            await removeHLSFileObjectStorageByFilename(streamingPlaylist.withVideo(this), filename);
        }
        logger.debug(`Removing streaming playlist file ${filename}`, lTags(this.uuid));
    }
    async removeOriginalFile(videoSource) {
        if (!videoSource.keptOriginalFilename)
            return;
        const filePath = VideoPathManager.Instance.getFSOriginalVideoFilePath(videoSource.keptOriginalFilename);
        await remove(filePath);
        if (videoSource.storage === FileStorage.OBJECT_STORAGE) {
            await removeOriginalFileObjectStorage(videoSource);
        }
        logger.debug(`Removing original video file ${videoSource.keptOriginalFilename}`, lTags(this.uuid));
    }
    isOutdated() {
        if (this.isOwned())
            return false;
        return isOutdated(this, ACTIVITY_PUB.VIDEO_REFRESH_INTERVAL);
    }
    setAsRefreshed(transaction) {
        return setAsUpdated({ sequelize: this.sequelize, table: 'video', id: this.id, transaction });
    }
    requiresUserAuth(options) {
        const { urlParamId, checkBlacklist } = options;
        if (checkBlacklist && this.VideoBlacklist)
            return true;
        if (this.privacy === VideoPrivacy.PRIVATE || this.privacy === VideoPrivacy.INTERNAL) {
            return true;
        }
        if (this.privacy === VideoPrivacy.UNLISTED) {
            if (urlParamId && !isUUIDValid(urlParamId))
                return true;
            return false;
        }
        if (this.privacy === VideoPrivacy.PUBLIC || this.privacy === VideoPrivacy.PASSWORD_PROTECTED) {
            return false;
        }
        throw new Error(`Unknown video privacy ${this.privacy} to know if the video requires auth`);
    }
    hasPrivateStaticPath() {
        return isVideoInPrivateDirectory(this.privacy);
    }
    async setNewState(newState, isNewVideo, transaction) {
        if (this.state === newState)
            throw new Error('Cannot use same state ' + newState);
        this.state = newState;
        if (this.state === VideoState.PUBLISHED && isNewVideo) {
            this.publishedAt = new Date();
        }
        await this.save({ transaction });
    }
    getBandwidthBits(videoFile) {
        if (!this.duration)
            return videoFile.size;
        return Math.ceil((videoFile.size * 8) / this.duration);
    }
    getTrackerUrls() {
        if (this.isOwned()) {
            return [
                WEBSERVER.URL + '/tracker/announce',
                WEBSERVER.WS + '://' + WEBSERVER.HOSTNAME + ':' + WEBSERVER.PORT + '/tracker/socket'
            ];
        }
        return this.Trackers.map(t => t.url);
    }
};
__decorate([
    AllowNull(false),
    Default(DataType.UUIDV4),
    IsUUID(4),
    Column(DataType.UUID),
    __metadata("design:type", String)
], VideoModel.prototype, "uuid", void 0);
__decorate([
    AllowNull(false),
    Is('VideoName', value => throwIfNotValid(value, isVideoNameValid, 'name')),
    Column,
    __metadata("design:type", String)
], VideoModel.prototype, "name", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "category", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "licence", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEOS.LANGUAGE.max)),
    __metadata("design:type", String)
], VideoModel.prototype, "language", void 0);
__decorate([
    AllowNull(false),
    Is('VideoPrivacy', value => throwIfNotValid(value, isVideoPrivacyValid, 'privacy')),
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], VideoModel.prototype, "privacy", void 0);
__decorate([
    AllowNull(false),
    Is('VideoNSFW', value => throwIfNotValid(value, isBooleanValid, 'NSFW boolean')),
    Column,
    __metadata("design:type", Boolean)
], VideoModel.prototype, "nsfw", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    Is('VideoNSFWFlags', value => throwIfNotValid(value, isNSFWFlagsValid, 'NSFW flags')),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "nsfwFlags", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('VideoNSFWSummary', value => throwIfNotValid(value, isNSFWSummaryValid, 'NSFW summary')),
    Column,
    __metadata("design:type", String)
], VideoModel.prototype, "nsfwSummary", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('VideoDescription', value => throwIfNotValid(value, isVideoDescriptionValid, 'description', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEOS.DESCRIPTION.max)),
    __metadata("design:type", String)
], VideoModel.prototype, "description", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('VideoSupport', value => throwIfNotValid(value, isVideoSupportValid, 'support', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEOS.SUPPORT.max)),
    __metadata("design:type", String)
], VideoModel.prototype, "support", void 0);
__decorate([
    AllowNull(false),
    Is('VideoDuration', value => throwIfNotValid(value, isVideoDurationValid, 'duration')),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "duration", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    IsInt,
    Min(0),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "views", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    IsInt,
    Min(0),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "likes", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    IsInt,
    Min(0),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "dislikes", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    IsInt,
    Min(0),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "comments", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoModel.prototype, "remote", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Column,
    __metadata("design:type", Boolean)
], VideoModel.prototype, "isLive", void 0);
__decorate([
    AllowNull(false),
    Is('VideoUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEOS.URL.max)),
    __metadata("design:type", String)
], VideoModel.prototype, "url", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "commentsPolicy", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoModel.prototype, "downloadEnabled", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoModel.prototype, "waitTranscoding", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('VideoState', value => throwIfNotValid(value, isVideoStateValid, 'state')),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "state", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.FLOAT),
    __metadata("design:type", Number)
], VideoModel.prototype, "aspectRatio", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Date)
], VideoModel.prototype, "inputFileUpdatedAt", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Default(DataType.NOW),
    Column,
    __metadata("design:type", Date)
], VideoModel.prototype, "publishedAt", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Date)
], VideoModel.prototype, "originallyPublishedAt", void 0);
__decorate([
    ForeignKey(() => VideoChannelModel),
    Column,
    __metadata("design:type", Number)
], VideoModel.prototype, "channelId", void 0);
__decorate([
    BelongsTo(() => VideoChannelModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoModel.prototype, "VideoChannel", void 0);
__decorate([
    BelongsToMany(() => TagModel, {
        foreignKey: 'videoId',
        through: () => VideoTagModel,
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "Tags", void 0);
__decorate([
    BelongsToMany(() => TrackerModel, {
        foreignKey: 'videoId',
        through: () => VideoTrackerModel,
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "Trackers", void 0);
__decorate([
    HasMany(() => ThumbnailModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: true
        },
        hooks: true,
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "Thumbnails", void 0);
__decorate([
    HasMany(() => VideoPlaylistElementModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoPlaylistElements", void 0);
__decorate([
    HasOne(() => VideoSourceModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoModel.prototype, "VideoSource", void 0);
__decorate([
    HasMany(() => VideoAbuseModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoAbuses", void 0);
__decorate([
    HasMany(() => VideoFileModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoFiles", void 0);
__decorate([
    HasMany(() => VideoStreamingPlaylistModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoStreamingPlaylists", void 0);
__decorate([
    HasMany(() => VideoShareModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoShares", void 0);
__decorate([
    HasMany(() => AccountVideoRateModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "AccountVideoRates", void 0);
__decorate([
    HasMany(() => VideoCommentModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoComments", void 0);
__decorate([
    HasMany(() => VideoViewModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoViews", void 0);
__decorate([
    HasMany(() => UserVideoHistoryModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "UserVideoHistories", void 0);
__decorate([
    HasOne(() => ScheduleVideoUpdateModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoModel.prototype, "ScheduleVideoUpdate", void 0);
__decorate([
    HasOne(() => VideoBlacklistModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoModel.prototype, "VideoBlacklist", void 0);
__decorate([
    HasOne(() => VideoLiveModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        hooks: true,
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoModel.prototype, "VideoLive", void 0);
__decorate([
    HasOne(() => VideoImportModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoModel.prototype, "VideoImport", void 0);
__decorate([
    HasMany(() => VideoCaptionModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade',
        hooks: true,
        ['separate']: true
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoCaptions", void 0);
__decorate([
    HasMany(() => VideoPasswordModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoPasswords", void 0);
__decorate([
    HasMany(() => VideoAutomaticTagModel, {
        foreignKey: 'videoId',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], VideoModel.prototype, "VideoAutomaticTags", void 0);
__decorate([
    HasOne(() => VideoJobInfoModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoModel.prototype, "VideoJobInfo", void 0);
__decorate([
    HasOne(() => StoryboardModel, {
        foreignKey: {
            name: 'videoId',
            allowNull: false
        },
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Object)
], VideoModel.prototype, "Storyboard", void 0);
__decorate([
    AfterCreate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideoModel, "notifyCreate", null);
__decorate([
    AfterUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideoModel, "notifyUpdate", null);
__decorate([
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideoModel, "notifyDestroy", null);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoModel]),
    __metadata("design:returntype", void 0)
], VideoModel, "stopLiveIfNeeded", null);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoModel]),
    __metadata("design:returntype", void 0)
], VideoModel, "invalidateCache", null);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VideoModel, "sendDelete", null);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoModel, Object]),
    __metadata("design:returntype", Promise)
], VideoModel, "removeFiles", null);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoModel, Object]),
    __metadata("design:returntype", Promise)
], VideoModel, "saveEssentialDataToAbuses", null);
VideoModel = VideoModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.WITH_IMMUTABLE_ATTRIBUTES]: {
            attributes: ['id', 'url', 'uuid', 'remote']
        },
        [ScopeNames.FOR_API]: (options) => {
            const include = [
                {
                    model: VideoChannelModel.scope({
                        method: [
                            VideoChannelScopeNames.SUMMARY,
                            {
                                withAccount: true,
                                withAccountBlockerIds: options.withAccountBlockerIds
                            }
                        ]
                    }),
                    required: true
                },
                {
                    attributes: ['type', 'filename'],
                    model: ThumbnailModel,
                    required: false
                }
            ];
            const query = {};
            if (options.ids) {
                query.where = {
                    id: {
                        [Op.in]: options.ids
                    }
                };
            }
            if (options.videoPlaylistId) {
                include.push({
                    model: VideoPlaylistElementModel.unscoped(),
                    required: true,
                    where: {
                        videoPlaylistId: options.videoPlaylistId
                    }
                });
            }
            query.include = include;
            return query;
        },
        [ScopeNames.WITH_THUMBNAILS]: {
            include: [
                {
                    model: ThumbnailModel,
                    required: false
                }
            ]
        },
        [ScopeNames.WITH_ACCOUNT_DETAILS]: {
            include: [
                {
                    model: VideoChannelModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: {
                                exclude: ['privateKey', 'publicKey']
                            },
                            model: ActorModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    attributes: ['host'],
                                    model: ServerModel.unscoped(),
                                    required: false
                                },
                                {
                                    model: ActorImageModel,
                                    as: 'Avatars',
                                    required: false
                                }
                            ]
                        },
                        {
                            model: AccountModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    model: ActorModel.unscoped(),
                                    attributes: {
                                        exclude: ['privateKey', 'publicKey']
                                    },
                                    required: true,
                                    include: [
                                        {
                                            attributes: ['host'],
                                            model: ServerModel.unscoped(),
                                            required: false
                                        },
                                        {
                                            model: ActorImageModel,
                                            as: 'Avatars',
                                            required: false
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        [ScopeNames.WITH_TAGS]: {
            include: [TagModel]
        },
        [ScopeNames.WITH_BLACKLISTED]: {
            include: [
                {
                    attributes: ['id', 'reason', 'unfederated'],
                    model: VideoBlacklistModel,
                    required: false
                }
            ]
        },
        [ScopeNames.WITH_WEB_VIDEO_FILES]: () => {
            return {
                include: [
                    {
                        model: VideoFileModel,
                        separate: true,
                        required: false
                    }
                ]
            };
        },
        [ScopeNames.WITH_STREAMING_PLAYLISTS]: () => {
            return {
                include: [
                    {
                        model: VideoStreamingPlaylistModel.unscoped(),
                        required: false,
                        separate: true,
                        include: [
                            {
                                model: VideoFileModel,
                                required: false
                            }
                        ]
                    }
                ]
            };
        },
        [ScopeNames.WITH_USER_HISTORY]: (userId) => {
            return {
                include: [
                    {
                        attributes: ['currentTime'],
                        model: UserVideoHistoryModel.unscoped(),
                        required: false,
                        where: {
                            userId
                        }
                    }
                ]
            };
        }
    })),
    Table({
        tableName: 'video',
        indexes: [
            buildTrigramSearchIndex('video_name_trigram', 'name'),
            { fields: ['createdAt'] },
            {
                fields: [
                    { name: 'publishedAt', order: 'DESC' },
                    { name: 'id', order: 'ASC' }
                ]
            },
            { fields: ['duration'] },
            {
                fields: [
                    { name: 'views', order: 'DESC' },
                    { name: 'id', order: 'ASC' }
                ]
            },
            { fields: ['channelId'] },
            {
                fields: ['originallyPublishedAt'],
                where: {
                    originallyPublishedAt: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['category'],
                where: {
                    category: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['licence'],
                where: {
                    licence: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['language'],
                where: {
                    language: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['nsfw'],
                where: {
                    nsfw: true
                }
            },
            {
                fields: ['isLive'],
                where: {
                    isLive: true
                }
            },
            {
                fields: ['remote'],
                where: {
                    remote: false
                }
            },
            {
                fields: ['uuid'],
                unique: true
            },
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], VideoModel);
export { VideoModel };
//# sourceMappingURL=video.js.map