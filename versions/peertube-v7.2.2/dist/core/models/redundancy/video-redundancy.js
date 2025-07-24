var VideoRedundancyModel_1;
import { __decorate, __metadata } from "tslib";
import { VideoPrivacy } from '@peertube/peertube-models';
import { isTestInstance } from '@peertube/peertube-node-utils';
import { getServerActor } from '../application/application.js';
import sample from 'lodash-es/sample.js';
import { literal, Op, QueryTypes } from 'sequelize';
import { AllowNull, BeforeDestroy, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Is, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { ActorModel } from '../actor/actor.js';
import { ServerModel } from '../server/server.js';
import { getSort, getVideoSort, parseAggregateResult, SequelizeModel, throwIfNotValid } from '../shared/index.js';
import { ScheduleVideoUpdateModel } from '../video/schedule-video-update.js';
import { VideoChannelModel } from '../video/video-channel.js';
import { VideoFileModel } from '../video/video-file.js';
import { VideoStreamingPlaylistModel } from '../video/video-streaming-playlist.js';
import { VideoModel } from '../video/video.js';
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["WITH_VIDEO"] = "WITH_VIDEO";
})(ScopeNames || (ScopeNames = {}));
let VideoRedundancyModel = VideoRedundancyModel_1 = class VideoRedundancyModel extends SequelizeModel {
    static async removeFile(instance) {
        if (!instance.isOwned())
            return;
        const videoStreamingPlaylist = await VideoStreamingPlaylistModel.loadWithVideo(instance.videoStreamingPlaylistId);
        const videoUUID = videoStreamingPlaylist.Video.uuid;
        logger.info('Removing duplicated video streaming playlist %s.', videoUUID);
        videoStreamingPlaylist.Video.removeAllStreamingPlaylistFiles({ playlist: videoStreamingPlaylist, isRedundancy: true })
            .catch(err => logger.error('Cannot delete video streaming playlist files of %s.', videoUUID, { err }));
        return undefined;
    }
    static async listLocalByStreamingPlaylistId(videoStreamingPlaylistId) {
        const actor = await getServerActor();
        const query = {
            where: {
                actorId: actor.id,
                videoStreamingPlaylistId
            }
        };
        return VideoRedundancyModel_1.scope(ScopeNames.WITH_VIDEO).findAll(query);
    }
    static async loadLocalByStreamingPlaylistId(videoStreamingPlaylistId) {
        const actor = await getServerActor();
        const query = {
            where: {
                actorId: actor.id,
                videoStreamingPlaylistId
            }
        };
        return VideoRedundancyModel_1.scope(ScopeNames.WITH_VIDEO).findOne(query);
    }
    static loadByIdWithVideo(id, transaction) {
        const query = {
            where: { id },
            transaction
        };
        return VideoRedundancyModel_1.scope(ScopeNames.WITH_VIDEO).findOne(query);
    }
    static loadByUrl(url, transaction) {
        const query = {
            where: {
                url
            },
            transaction
        };
        return VideoRedundancyModel_1.findOne(query);
    }
    static async findMostViewToDuplicate(randomizedFactor) {
        const peertubeActor = await getServerActor();
        const query = {
            attributes: ['id', 'views'],
            limit: randomizedFactor,
            order: getVideoSort('-views'),
            where: Object.assign(Object.assign({}, this.buildVideoCandidateWhere()), this.buildVideoIdsForDuplication(peertubeActor)),
            include: [
                VideoRedundancyModel_1.buildRedundancyAllowedInclude(),
                VideoRedundancyModel_1.buildStreamingPlaylistRequiredInclude()
            ]
        };
        return VideoRedundancyModel_1.getVideoSample(VideoModel.unscoped().findAll(query));
    }
    static async findTrendingToDuplicate(randomizedFactor) {
        const peertubeActor = await getServerActor();
        const query = {
            attributes: ['id', 'views'],
            subQuery: false,
            group: 'VideoModel.id',
            limit: randomizedFactor,
            order: getVideoSort('-trending'),
            where: Object.assign(Object.assign({}, this.buildVideoCandidateWhere()), this.buildVideoIdsForDuplication(peertubeActor)),
            include: [
                VideoRedundancyModel_1.buildRedundancyAllowedInclude(),
                VideoRedundancyModel_1.buildStreamingPlaylistRequiredInclude(),
                VideoModel.buildTrendingQuery(CONFIG.TRENDING.VIDEOS.INTERVAL_DAYS)
            ]
        };
        return VideoRedundancyModel_1.getVideoSample(VideoModel.unscoped().findAll(query));
    }
    static async findRecentlyAddedToDuplicate(randomizedFactor, minViews) {
        const peertubeActor = await getServerActor();
        const query = {
            attributes: ['id', 'publishedAt'],
            limit: randomizedFactor,
            order: getVideoSort('-publishedAt'),
            where: Object.assign(Object.assign(Object.assign({}, this.buildVideoCandidateWhere()), this.buildVideoIdsForDuplication(peertubeActor)), { views: {
                    [Op.gte]: minViews
                } }),
            include: [
                VideoRedundancyModel_1.buildRedundancyAllowedInclude(),
                VideoRedundancyModel_1.buildStreamingPlaylistRequiredInclude(),
                {
                    model: ScheduleVideoUpdateModel.unscoped(),
                    required: false
                }
            ]
        };
        return VideoRedundancyModel_1.getVideoSample(VideoModel.unscoped().findAll(query));
    }
    static async isLocalByVideoUUIDExists(uuid) {
        const actor = await getServerActor();
        const query = {
            raw: true,
            attributes: ['id'],
            where: {
                actorId: actor.id
            },
            include: [
                {
                    model: VideoStreamingPlaylistModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: [],
                            model: VideoModel.unscoped(),
                            required: true,
                            where: {
                                uuid
                            }
                        }
                    ]
                }
            ]
        };
        return VideoRedundancyModel_1.findOne(query)
            .then(r => !!r);
    }
    static async getVideoSample(p) {
        const rows = await p;
        if (rows.length === 0)
            return undefined;
        const ids = rows.map(r => r.id);
        const id = sample(ids);
        return VideoModel.loadWithFiles(id, undefined, !isTestInstance());
    }
    static buildVideoCandidateWhere() {
        return {
            privacy: VideoPrivacy.PUBLIC,
            remote: true,
            isLive: false
        };
    }
    static buildRedundancyAllowedInclude() {
        return {
            attributes: [],
            model: VideoChannelModel.unscoped(),
            required: true,
            include: [
                {
                    attributes: [],
                    model: ActorModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: [],
                            model: ServerModel.unscoped(),
                            required: true,
                            where: {
                                redundancyAllowed: true
                            }
                        }
                    ]
                }
            ]
        };
    }
    static buildStreamingPlaylistRequiredInclude() {
        return {
            attributes: [],
            required: true,
            model: VideoStreamingPlaylistModel.unscoped()
        };
    }
    static async loadOldestLocalExpired(strategy, expiresAfterMs) {
        const expiredDate = new Date();
        expiredDate.setMilliseconds(expiredDate.getMilliseconds() - expiresAfterMs);
        const actor = await getServerActor();
        const query = {
            where: {
                actorId: actor.id,
                strategy,
                createdAt: {
                    [Op.lt]: expiredDate
                }
            }
        };
        return VideoRedundancyModel_1.scope([ScopeNames.WITH_VIDEO]).findOne(query);
    }
    static async listLocalExpired() {
        const actor = await getServerActor();
        const query = {
            where: {
                actorId: actor.id,
                expiresOn: {
                    [Op.lt]: new Date()
                }
            }
        };
        return VideoRedundancyModel_1.scope([ScopeNames.WITH_VIDEO]).findAll(query);
    }
    static async listRemoteExpired() {
        const actor = await getServerActor();
        const query = {
            where: {
                actorId: {
                    [Op.ne]: actor.id
                },
                expiresOn: {
                    [Op.lt]: new Date(),
                    [Op.ne]: null
                }
            }
        };
        return VideoRedundancyModel_1.scope([ScopeNames.WITH_VIDEO]).findAll(query);
    }
    static async listLocalOfServer(serverId) {
        const actor = await getServerActor();
        const query = {
            where: {
                actorId: actor.id
            },
            include: [
                {
                    model: VideoStreamingPlaylistModel.unscoped(),
                    required: true,
                    include: [
                        {
                            model: VideoModel,
                            required: true,
                            include: [
                                {
                                    attributes: [],
                                    model: VideoChannelModel.unscoped(),
                                    required: true,
                                    include: [
                                        {
                                            attributes: [],
                                            model: ActorModel.unscoped(),
                                            required: true,
                                            where: {
                                                serverId
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        return VideoRedundancyModel_1.findAll(query);
    }
    static listForApi(options) {
        const { start, count, sort, target, strategy } = options;
        const redundancyWhere = {};
        const videosWhere = {};
        if (target === 'my-videos') {
            Object.assign(videosWhere, { remote: false });
        }
        else if (target === 'remote-videos') {
            Object.assign(videosWhere, { remote: true });
            Object.assign(redundancyWhere, { strategy: { [Op.ne]: null } });
        }
        if (strategy) {
            Object.assign(redundancyWhere, { strategy });
        }
        const findOptions = {
            offset: start,
            limit: count,
            order: getSort(sort),
            where: videosWhere,
            include: [
                {
                    required: true,
                    model: VideoStreamingPlaylistModel.unscoped(),
                    include: [
                        {
                            model: VideoRedundancyModel_1.unscoped(),
                            required: true,
                            where: redundancyWhere
                        },
                        {
                            model: VideoFileModel,
                            required: true
                        }
                    ]
                }
            ]
        };
        return Promise.all([
            VideoModel.findAll(findOptions),
            VideoModel.count({
                where: Object.assign(Object.assign({}, videosWhere), { id: {
                        [Op.in]: literal('(' +
                            'SELECT "videoId" FROM "videoStreamingPlaylist" ' +
                            'INNER JOIN "videoRedundancy" ON "videoRedundancy"."videoStreamingPlaylistId" = "videoStreamingPlaylist".id' +
                            ')')
                    } })
            })
        ]).then(([data, total]) => ({ total, data }));
    }
    static async getStats(strategy) {
        const actor = await getServerActor();
        const sql = `WITH "tmp" AS ` +
            `(` +
            `SELECT "videoStreamingFile"."size" AS "videoStreamingFileSize", "videoStreamingPlaylist"."videoId" AS "videoStreamingVideoId"` +
            `FROM "videoRedundancy" AS "videoRedundancy" ` +
            `LEFT JOIN "videoStreamingPlaylist" ON "videoRedundancy"."videoStreamingPlaylistId" = "videoStreamingPlaylist"."id" ` +
            `LEFT JOIN "videoFile" AS "videoStreamingFile" ` +
            `ON "videoStreamingPlaylist"."id" = "videoStreamingFile"."videoStreamingPlaylistId" ` +
            `WHERE "videoRedundancy"."strategy" = :strategy AND "videoRedundancy"."actorId" = :actorId` +
            `) ` +
            `SELECT ` +
            `COALESCE(SUM("videoStreamingFileSize"), '0') AS "totalUsed", ` +
            `COUNT(DISTINCT "videoStreamingVideoId") AS "totalVideos", ` +
            `COUNT(*) AS "totalVideoFiles" ` +
            `FROM "tmp"`;
        return VideoRedundancyModel_1.sequelize.query(sql, {
            replacements: { strategy, actorId: actor.id },
            type: QueryTypes.SELECT
        }).then(([row]) => ({
            totalUsed: parseAggregateResult(row.totalUsed),
            totalVideos: row.totalVideos,
            totalVideoFiles: row.totalVideoFiles
        }));
    }
    static toFormattedJSONStatic(video) {
        const streamingPlaylistsRedundancies = [];
        for (const playlist of video.VideoStreamingPlaylists) {
            const size = playlist.VideoFiles.reduce((a, b) => a + b.size, 0);
            for (const redundancy of playlist.RedundancyVideos) {
                streamingPlaylistsRedundancies.push({
                    id: redundancy.id,
                    fileUrl: redundancy.fileUrl,
                    strategy: redundancy.strategy,
                    createdAt: redundancy.createdAt,
                    updatedAt: redundancy.updatedAt,
                    expiresOn: redundancy.expiresOn,
                    size
                });
            }
        }
        return {
            id: video.id,
            name: video.name,
            url: video.url,
            uuid: video.uuid,
            redundancies: {
                files: [],
                streamingPlaylists: streamingPlaylistsRedundancies
            }
        };
    }
    getVideo() {
        return this.VideoStreamingPlaylist.Video;
    }
    getVideoUUID() {
        var _a;
        return (_a = this.getVideo()) === null || _a === void 0 ? void 0 : _a.uuid;
    }
    isOwned() {
        return !!this.strategy;
    }
    toActivityPubObject() {
        return {
            id: this.url,
            type: 'CacheFile',
            object: this.VideoStreamingPlaylist.Video.url,
            expires: this.expiresOn ? this.expiresOn.toISOString() : null,
            url: {
                type: 'Link',
                mediaType: 'application/x-mpegURL',
                href: this.fileUrl
            }
        };
    }
    static buildVideoIdsForDuplication(peertubeActor) {
        const notIn = literal('(' +
            `SELECT "videoStreamingPlaylist"."videoId" AS "videoId" FROM "videoRedundancy" ` +
            `INNER JOIN "videoStreamingPlaylist" ON "videoStreamingPlaylist"."id" = "videoRedundancy"."videoStreamingPlaylistId" ` +
            `WHERE "videoRedundancy"."actorId" = ${peertubeActor.id} ` +
            ')');
        return {
            id: {
                [Op.notIn]: notIn
            }
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoRedundancyModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoRedundancyModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Date)
], VideoRedundancyModel.prototype, "expiresOn", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEOS_REDUNDANCY.URL.max)),
    __metadata("design:type", String)
], VideoRedundancyModel.prototype, "fileUrl", void 0);
__decorate([
    AllowNull(false),
    Is('VideoRedundancyUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEOS_REDUNDANCY.URL.max)),
    __metadata("design:type", String)
], VideoRedundancyModel.prototype, "url", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoRedundancyModel.prototype, "strategy", void 0);
__decorate([
    ForeignKey(() => VideoStreamingPlaylistModel),
    Column,
    __metadata("design:type", Number)
], VideoRedundancyModel.prototype, "videoStreamingPlaylistId", void 0);
__decorate([
    BelongsTo(() => VideoStreamingPlaylistModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoRedundancyModel.prototype, "VideoStreamingPlaylist", void 0);
__decorate([
    ForeignKey(() => ActorModel),
    Column,
    __metadata("design:type", Number)
], VideoRedundancyModel.prototype, "actorId", void 0);
__decorate([
    BelongsTo(() => ActorModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoRedundancyModel.prototype, "Actor", void 0);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoRedundancyModel]),
    __metadata("design:returntype", Promise)
], VideoRedundancyModel, "removeFile", null);
VideoRedundancyModel = VideoRedundancyModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.WITH_VIDEO]: {
            include: [
                {
                    model: VideoStreamingPlaylistModel,
                    required: false,
                    include: [
                        {
                            model: VideoModel,
                            required: true
                        }
                    ]
                }
            ]
        }
    })),
    Table({
        tableName: 'videoRedundancy',
        indexes: [
            {
                fields: ['videoStreamingPlaylistId']
            },
            {
                fields: ['actorId']
            },
            {
                fields: ['expiresOn']
            },
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], VideoRedundancyModel);
export { VideoRedundancyModel };
//# sourceMappingURL=video-redundancy.js.map