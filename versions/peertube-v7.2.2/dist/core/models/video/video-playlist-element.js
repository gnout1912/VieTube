var VideoPlaylistElementModel_1;
import { __decorate, __metadata } from "tslib";
import { Op, Sequelize } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, Is, IsInt, Min, Table, UpdatedAt } from 'sequelize-typescript';
import validator from 'validator';
import { forceNumber } from '@peertube/peertube-core-utils';
import { VideoPlaylistElementType, VideoPrivacy } from '@peertube/peertube-models';
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { CONSTRAINTS_FIELDS, USER_EXPORT_MAX_ITEMS } from '../../initializers/constants.js';
import { SequelizeModel, getSort, throwIfNotValid } from '../shared/index.js';
import { VideoPlaylistModel } from './video-playlist.js';
import { ScopeNames as VideoScopeNames, VideoModel } from './video.js';
let VideoPlaylistElementModel = VideoPlaylistElementModel_1 = class VideoPlaylistElementModel extends SequelizeModel {
    static deleteAllOf(videoPlaylistId, transaction) {
        const query = {
            where: {
                videoPlaylistId
            },
            transaction
        };
        return VideoPlaylistElementModel_1.destroy(query);
    }
    static listForApi(options) {
        const accountIds = [options.serverAccount.id];
        const videoScope = [
            VideoScopeNames.WITH_BLACKLISTED
        ];
        if (options.user) {
            accountIds.push(options.user.Account.id);
            videoScope.push({ method: [VideoScopeNames.WITH_USER_HISTORY, options.user.id] });
        }
        const forApiOptions = { withAccountBlockerIds: accountIds };
        videoScope.push({
            method: [
                VideoScopeNames.FOR_API, forApiOptions
            ]
        });
        const findQuery = {
            offset: options.start,
            limit: options.count,
            order: getSort('position'),
            where: {
                videoPlaylistId: options.videoPlaylistId
            },
            include: [
                {
                    model: VideoModel.scope(videoScope),
                    required: false
                }
            ]
        };
        const countQuery = {
            where: {
                videoPlaylistId: options.videoPlaylistId
            }
        };
        return Promise.all([
            VideoPlaylistElementModel_1.count(countQuery),
            VideoPlaylistElementModel_1.findAll(findQuery)
        ]).then(([total, data]) => ({ total, data }));
    }
    static loadByPlaylistAndVideo(videoPlaylistId, videoId) {
        const query = {
            where: {
                videoPlaylistId,
                videoId
            }
        };
        return VideoPlaylistElementModel_1.findOne(query);
    }
    static loadById(playlistElementId) {
        return VideoPlaylistElementModel_1.findByPk(playlistElementId);
    }
    static loadByPlaylistAndElementIdForAP(playlistId, playlistElementId) {
        const playlistWhere = validator.default.isUUID('' + playlistId)
            ? { uuid: playlistId }
            : { id: playlistId };
        const query = {
            include: [
                {
                    attributes: ['privacy'],
                    model: VideoPlaylistModel.unscoped(),
                    where: playlistWhere
                },
                {
                    attributes: ['url'],
                    model: VideoModel.unscoped()
                }
            ],
            where: {
                id: playlistElementId
            }
        };
        return VideoPlaylistElementModel_1.findOne(query);
    }
    static loadFirstElementWithVideoThumbnail(videoPlaylistId) {
        const query = {
            order: getSort('position'),
            where: {
                videoPlaylistId
            },
            include: [
                {
                    model: VideoModel.scope(VideoScopeNames.WITH_THUMBNAILS),
                    required: true
                }
            ]
        };
        return VideoPlaylistElementModel_1
            .findOne(query);
    }
    static listUrlsOfForAP(videoPlaylistId, start, count, t) {
        const getQuery = (forCount) => {
            return {
                attributes: forCount
                    ? []
                    : ['url'],
                offset: start,
                limit: count,
                order: getSort('position'),
                where: {
                    videoPlaylistId
                },
                transaction: t
            };
        };
        return Promise.all([
            VideoPlaylistElementModel_1.count(getQuery(true)),
            VideoPlaylistElementModel_1.findAll(getQuery(false))
        ]).then(([total, rows]) => ({
            total,
            data: rows.map(e => e.url)
        }));
    }
    static listElementsForExport(videoPlaylistId) {
        return VideoPlaylistElementModel_1.findAll({
            where: {
                videoPlaylistId
            },
            include: [
                {
                    attributes: ['url'],
                    model: VideoModel.unscoped(),
                    required: true
                }
            ],
            order: getSort('position'),
            limit: USER_EXPORT_MAX_ITEMS
        });
    }
    static getNextPositionOf(videoPlaylistId, transaction) {
        const query = {
            where: {
                videoPlaylistId
            },
            transaction
        };
        return VideoPlaylistElementModel_1.max('position', query)
            .then(position => position ? position + 1 : 1);
    }
    static reassignPositionOf(options) {
        const { videoPlaylistId, firstPosition, endPosition, newPosition, transaction } = options;
        const query = {
            where: {
                videoPlaylistId,
                position: {
                    [Op.gte]: firstPosition,
                    [Op.lte]: endPosition
                }
            },
            transaction,
            validate: false
        };
        const positionQuery = Sequelize.literal(`${forceNumber(newPosition)} + "position" - ${forceNumber(firstPosition)}`);
        return VideoPlaylistElementModel_1.update({ position: positionQuery }, query);
    }
    static increasePositionOf(videoPlaylistId, fromPosition, by = 1, transaction) {
        const query = {
            where: {
                videoPlaylistId,
                position: {
                    [Op.gte]: fromPosition
                }
            },
            transaction
        };
        return VideoPlaylistElementModel_1.increment({ position: by }, query);
    }
    toFormattedJSON(options = {}) {
        return {
            id: this.id,
            position: this.position,
            startTimestamp: this.startTimestamp,
            stopTimestamp: this.stopTimestamp,
            type: this.getType(options.accountId),
            video: this.getVideoElement(options.accountId)
        };
    }
    getType(accountId) {
        const video = this.Video;
        if (!video)
            return VideoPlaylistElementType.DELETED;
        if (accountId && video.VideoChannel.Account.id === accountId)
            return VideoPlaylistElementType.REGULAR;
        if (video.privacy === VideoPrivacy.INTERNAL && accountId)
            return VideoPlaylistElementType.REGULAR;
        const protectedPrivacy = new Set([VideoPrivacy.PRIVATE, VideoPrivacy.INTERNAL, VideoPrivacy.PASSWORD_PROTECTED]);
        if (protectedPrivacy.has(video.privacy)) {
            return VideoPlaylistElementType.PRIVATE;
        }
        if (video.isBlacklisted() || video.isBlocked())
            return VideoPlaylistElementType.UNAVAILABLE;
        return VideoPlaylistElementType.REGULAR;
    }
    getVideoElement(accountId) {
        if (!this.Video)
            return null;
        if (this.getType(accountId) !== VideoPlaylistElementType.REGULAR)
            return null;
        return this.Video.toFormattedJSON();
    }
    toActivityPubObject() {
        var _a;
        const base = {
            id: this.url,
            type: 'PlaylistElement',
            url: ((_a = this.Video) === null || _a === void 0 ? void 0 : _a.url) || null,
            position: this.position
        };
        if (this.startTimestamp)
            base.startTimestamp = this.startTimestamp;
        if (this.stopTimestamp)
            base.stopTimestamp = this.stopTimestamp;
        return base;
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoPlaylistElementModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoPlaylistElementModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(true),
    Is('VideoPlaylistUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_PLAYLISTS.URL.max)),
    __metadata("design:type", String)
], VideoPlaylistElementModel.prototype, "url", void 0);
__decorate([
    AllowNull(false),
    Default(1),
    IsInt,
    Min(1),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistElementModel.prototype, "position", void 0);
__decorate([
    AllowNull(true),
    IsInt,
    Min(0),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistElementModel.prototype, "startTimestamp", void 0);
__decorate([
    AllowNull(true),
    IsInt,
    Min(0),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistElementModel.prototype, "stopTimestamp", void 0);
__decorate([
    ForeignKey(() => VideoPlaylistModel),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistElementModel.prototype, "videoPlaylistId", void 0);
__decorate([
    BelongsTo(() => VideoPlaylistModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoPlaylistElementModel.prototype, "VideoPlaylist", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistElementModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoPlaylistElementModel.prototype, "Video", void 0);
VideoPlaylistElementModel = VideoPlaylistElementModel_1 = __decorate([
    Table({
        tableName: 'videoPlaylistElement',
        indexes: [
            {
                fields: ['videoPlaylistId']
            },
            {
                fields: ['videoId']
            },
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], VideoPlaylistElementModel);
export { VideoPlaylistElementModel };
//# sourceMappingURL=video-playlist-element.js.map