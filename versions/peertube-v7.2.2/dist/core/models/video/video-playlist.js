var VideoPlaylistModel_1;
import { __decorate, __metadata } from "tslib";
import { buildPlaylistEmbedPath, buildPlaylistWatchPath, pick } from '@peertube/peertube-core-utils';
import { VideoPlaylistPrivacy, VideoPlaylistType } from '@peertube/peertube-models';
import { buildUUID, uuidToShort } from '@peertube/peertube-node-utils';
import { activityPubCollectionPagination } from '../../lib/activitypub/collection.js';
import { join } from 'path';
import { Op, Sequelize, literal } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, HasMany, HasOne, Is, IsUUID, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { isVideoPlaylistDescriptionValid, isVideoPlaylistNameValid, isVideoPlaylistPrivacyValid } from '../../helpers/custom-validators/video-playlists.js';
import { ACTIVITY_PUB, CONSTRAINTS_FIELDS, LAZY_STATIC_PATHS, THUMBNAILS_SIZE, USER_EXPORT_MAX_ITEMS, VIDEO_PLAYLIST_PRIVACIES, VIDEO_PLAYLIST_TYPES, WEBSERVER } from '../../initializers/constants.js';
import { AccountModel, ScopeNames as AccountScopeNames } from '../account/account.js';
import { ActorModel } from '../actor/actor.js';
import { SequelizeModel, buildServerIdsFollowedBy, buildTrigramSearchIndex, buildWhereIdOrUUID, createSimilarityAttribute, getPlaylistSort, isOutdated, setAsUpdated, throwIfNotValid } from '../shared/index.js';
import { ThumbnailModel } from './thumbnail.js';
import { VideoChannelModel, ScopeNames as VideoChannelScopeNames } from './video-channel.js';
import { VideoPlaylistElementModel } from './video-playlist-element.js';
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["AVAILABLE_FOR_LIST"] = "AVAILABLE_FOR_LIST";
    ScopeNames["WITH_VIDEOS_LENGTH"] = "WITH_VIDEOS_LENGTH";
    ScopeNames["WITH_ACCOUNT_AND_CHANNEL_SUMMARY"] = "WITH_ACCOUNT_AND_CHANNEL_SUMMARY";
    ScopeNames["WITH_ACCOUNT"] = "WITH_ACCOUNT";
    ScopeNames["WITH_THUMBNAIL"] = "WITH_THUMBNAIL";
    ScopeNames["WITH_ACCOUNT_AND_CHANNEL"] = "WITH_ACCOUNT_AND_CHANNEL";
})(ScopeNames || (ScopeNames = {}));
function getVideoLengthSelect() {
    return 'SELECT COUNT("id") FROM "videoPlaylistElement" WHERE "videoPlaylistId" = "VideoPlaylistModel"."id"';
}
let VideoPlaylistModel = VideoPlaylistModel_1 = class VideoPlaylistModel extends SequelizeModel {
    static listForApi(options) {
        const query = {
            offset: options.start,
            limit: options.count,
            order: getPlaylistSort(options.sort)
        };
        const commonAvailableForListOptions = pick(options, [
            'type',
            'followerActorId',
            'accountId',
            'videoChannelId',
            'listMyPlaylists',
            'search',
            'host',
            'uuids'
        ]);
        const scopesFind = [
            {
                method: [
                    ScopeNames.AVAILABLE_FOR_LIST,
                    Object.assign(Object.assign({}, commonAvailableForListOptions), { withVideos: options.withVideos || false })
                ]
            },
            ScopeNames.WITH_VIDEOS_LENGTH,
            ScopeNames.WITH_THUMBNAIL
        ];
        const scopesCount = [
            {
                method: [
                    ScopeNames.AVAILABLE_FOR_LIST,
                    Object.assign(Object.assign({}, commonAvailableForListOptions), { withVideos: options.withVideos || false, forCount: true })
                ]
            },
            ScopeNames.WITH_VIDEOS_LENGTH
        ];
        return Promise.all([
            VideoPlaylistModel_1.scope(scopesCount).count(),
            VideoPlaylistModel_1.scope(scopesFind).findAll(query)
        ]).then(([count, rows]) => ({ total: count, data: rows }));
    }
    static searchForApi(options) {
        return VideoPlaylistModel_1.listForApi(Object.assign(Object.assign({}, options), { type: VideoPlaylistType.REGULAR, listMyPlaylists: false, withVideos: true }));
    }
    static listPublicUrlsOfForAP(options, start, count) {
        const where = {
            privacy: VideoPlaylistPrivacy.PUBLIC
        };
        if (options.account) {
            Object.assign(where, { ownerAccountId: options.account.id });
        }
        if (options.channel) {
            Object.assign(where, { videoChannelId: options.channel.id });
        }
        const getQuery = (forCount) => {
            return {
                attributes: forCount === true
                    ? []
                    : ['url'],
                offset: start,
                limit: count,
                where
            };
        };
        return Promise.all([
            VideoPlaylistModel_1.count(getQuery(true)),
            VideoPlaylistModel_1.findAll(getQuery(false))
        ]).then(([total, rows]) => ({
            total,
            data: rows.map(p => p.url)
        }));
    }
    static listPlaylistSummariesOf(accountId, videoIds) {
        const query = {
            attributes: ['id', 'name', 'uuid'],
            where: {
                ownerAccountId: accountId
            },
            include: [
                {
                    attributes: ['id', 'videoId', 'startTimestamp', 'stopTimestamp'],
                    model: VideoPlaylistElementModel.unscoped(),
                    where: {
                        videoId: {
                            [Op.in]: videoIds
                        }
                    },
                    required: true
                }
            ]
        };
        return VideoPlaylistModel_1.findAll(query);
    }
    static listPlaylistForExport(accountId) {
        return VideoPlaylistModel_1
            .scope([ScopeNames.WITH_ACCOUNT_AND_CHANNEL, ScopeNames.WITH_VIDEOS_LENGTH, ScopeNames.WITH_THUMBNAIL])
            .findAll({
            where: {
                ownerAccountId: accountId
            },
            limit: USER_EXPORT_MAX_ITEMS
        });
    }
    static doesPlaylistExist(url) {
        const query = {
            attributes: ['id'],
            where: {
                url
            }
        };
        return VideoPlaylistModel_1
            .findOne(query)
            .then(e => !!e);
    }
    static loadWithAccountAndChannelSummary(id, transaction) {
        const where = buildWhereIdOrUUID(id);
        const query = {
            where,
            transaction
        };
        return VideoPlaylistModel_1
            .scope([ScopeNames.WITH_ACCOUNT_AND_CHANNEL_SUMMARY, ScopeNames.WITH_VIDEOS_LENGTH, ScopeNames.WITH_THUMBNAIL])
            .findOne(query);
    }
    static loadWithAccountAndChannel(id, transaction) {
        const where = buildWhereIdOrUUID(id);
        const query = {
            where,
            transaction
        };
        return VideoPlaylistModel_1
            .scope([ScopeNames.WITH_ACCOUNT_AND_CHANNEL, ScopeNames.WITH_VIDEOS_LENGTH, ScopeNames.WITH_THUMBNAIL])
            .findOne(query);
    }
    static loadByUrlAndPopulateAccount(url) {
        const query = {
            where: {
                url
            }
        };
        return VideoPlaylistModel_1.scope([ScopeNames.WITH_ACCOUNT, ScopeNames.WITH_THUMBNAIL]).findOne(query);
    }
    static loadByUrlWithAccountAndChannelSummary(url) {
        const query = {
            where: {
                url
            }
        };
        return VideoPlaylistModel_1
            .scope([ScopeNames.WITH_ACCOUNT_AND_CHANNEL_SUMMARY, ScopeNames.WITH_VIDEOS_LENGTH, ScopeNames.WITH_THUMBNAIL])
            .findOne(query);
    }
    static loadWatchLaterOf(account) {
        const query = {
            where: {
                type: VideoPlaylistType.WATCH_LATER,
                ownerAccountId: account.id
            }
        };
        return VideoPlaylistModel_1
            .scope([ScopeNames.WITH_ACCOUNT_AND_CHANNEL, ScopeNames.WITH_VIDEOS_LENGTH, ScopeNames.WITH_THUMBNAIL])
            .findOne(query);
    }
    static loadRegularByAccountAndName(account, name) {
        const query = {
            where: {
                type: VideoPlaylistType.REGULAR,
                name,
                ownerAccountId: account.id
            }
        };
        return VideoPlaylistModel_1
            .findOne(query);
    }
    static getPrivacyLabel(privacy) {
        return VIDEO_PLAYLIST_PRIVACIES[privacy] || 'Unknown';
    }
    static getTypeLabel(type) {
        return VIDEO_PLAYLIST_TYPES[type] || 'Unknown';
    }
    static resetPlaylistsOfChannel(videoChannelId, transaction) {
        const query = {
            where: {
                videoChannelId
            },
            transaction
        };
        return VideoPlaylistModel_1.update({ privacy: VideoPlaylistPrivacy.PRIVATE, videoChannelId: null }, query);
    }
    async setAndSaveThumbnail(thumbnail, t) {
        thumbnail.videoPlaylistId = this.id;
        this.Thumbnail = await thumbnail.save({ transaction: t });
    }
    hasThumbnail() {
        return !!this.Thumbnail;
    }
    hasGeneratedThumbnail() {
        return this.hasThumbnail() && this.Thumbnail.automaticallyGenerated === true;
    }
    shouldGenerateThumbnailWithNewElement(newElement) {
        if (this.hasThumbnail() === false)
            return true;
        if (newElement.position === 1 && this.hasGeneratedThumbnail())
            return true;
        return false;
    }
    generateThumbnailName() {
        const extension = '.jpg';
        return 'playlist-' + buildUUID() + extension;
    }
    getThumbnailUrl() {
        if (!this.hasThumbnail())
            return null;
        return WEBSERVER.URL + LAZY_STATIC_PATHS.THUMBNAILS + this.Thumbnail.filename;
    }
    getThumbnailStaticPath() {
        if (!this.hasThumbnail())
            return null;
        return join(LAZY_STATIC_PATHS.THUMBNAILS, this.Thumbnail.filename);
    }
    getWatchStaticPath() {
        return buildPlaylistWatchPath({ shortUUID: uuidToShort(this.uuid) });
    }
    getEmbedStaticPath() {
        return buildPlaylistEmbedPath({ shortUUID: uuidToShort(this.uuid) });
    }
    static async getStats() {
        const totalLocalPlaylists = await VideoPlaylistModel_1.count({
            include: [
                {
                    model: AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            model: ActorModel.unscoped(),
                            required: true,
                            where: {
                                serverId: null
                            }
                        }
                    ]
                }
            ],
            where: {
                privacy: VideoPlaylistPrivacy.PUBLIC
            }
        });
        return {
            totalLocalPlaylists
        };
    }
    setAsRefreshed() {
        return setAsUpdated({ sequelize: this.sequelize, table: 'videoPlaylist', id: this.id });
    }
    setVideosLength(videosLength) {
        this.set('videosLength', videosLength, { raw: true });
    }
    isOwned() {
        return this.OwnerAccount.isOwned();
    }
    isOutdated() {
        if (this.isOwned())
            return false;
        return isOutdated(this, ACTIVITY_PUB.VIDEO_PLAYLIST_REFRESH_INTERVAL);
    }
    toFormattedJSON() {
        return {
            id: this.id,
            uuid: this.uuid,
            shortUUID: uuidToShort(this.uuid),
            isLocal: this.isOwned(),
            url: this.url,
            displayName: this.name,
            description: this.description,
            privacy: {
                id: this.privacy,
                label: VideoPlaylistModel_1.getPrivacyLabel(this.privacy)
            },
            thumbnailPath: this.getThumbnailStaticPath(),
            embedPath: this.getEmbedStaticPath(),
            type: {
                id: this.type,
                label: VideoPlaylistModel_1.getTypeLabel(this.type)
            },
            videosLength: this.get('videosLength'),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            ownerAccount: this.OwnerAccount.toFormattedSummaryJSON(),
            videoChannel: this.VideoChannel
                ? this.VideoChannel.toFormattedSummaryJSON()
                : null
        };
    }
    toActivityPubObject(page, t) {
        const handler = (start, count) => {
            return VideoPlaylistElementModel.listUrlsOfForAP(this.id, start, count, t);
        };
        let icon;
        if (this.hasThumbnail()) {
            icon = {
                type: 'Image',
                url: this.getThumbnailUrl(),
                mediaType: 'image/jpeg',
                width: THUMBNAILS_SIZE.width,
                height: THUMBNAILS_SIZE.height
            };
        }
        return activityPubCollectionPagination(this.url, handler, page)
            .then(o => {
            return Object.assign(o, {
                type: 'Playlist',
                name: this.name,
                content: this.description,
                mediaType: 'text/markdown',
                uuid: this.uuid,
                published: this.createdAt.toISOString(),
                updated: this.updatedAt.toISOString(),
                attributedTo: this.VideoChannel ? [this.VideoChannel.Actor.url] : [],
                icon
            });
        });
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoPlaylistModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoPlaylistModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Is('VideoPlaylistName', value => throwIfNotValid(value, isVideoPlaylistNameValid, 'name')),
    Column,
    __metadata("design:type", String)
], VideoPlaylistModel.prototype, "name", void 0);
__decorate([
    AllowNull(true),
    Is('VideoPlaylistDescription', value => throwIfNotValid(value, isVideoPlaylistDescriptionValid, 'description', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_PLAYLISTS.DESCRIPTION.max)),
    __metadata("design:type", String)
], VideoPlaylistModel.prototype, "description", void 0);
__decorate([
    AllowNull(false),
    Is('VideoPlaylistPrivacy', value => throwIfNotValid(value, isVideoPlaylistPrivacyValid, 'privacy')),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistModel.prototype, "privacy", void 0);
__decorate([
    AllowNull(false),
    Is('VideoPlaylistUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_PLAYLISTS.URL.max)),
    __metadata("design:type", String)
], VideoPlaylistModel.prototype, "url", void 0);
__decorate([
    AllowNull(false),
    Default(DataType.UUIDV4),
    IsUUID(4),
    Column(DataType.UUID),
    __metadata("design:type", String)
], VideoPlaylistModel.prototype, "uuid", void 0);
__decorate([
    AllowNull(false),
    Default(VideoPlaylistType.REGULAR),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistModel.prototype, "type", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistModel.prototype, "ownerAccountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoPlaylistModel.prototype, "OwnerAccount", void 0);
__decorate([
    ForeignKey(() => VideoChannelModel),
    Column,
    __metadata("design:type", Number)
], VideoPlaylistModel.prototype, "videoChannelId", void 0);
__decorate([
    BelongsTo(() => VideoChannelModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoPlaylistModel.prototype, "VideoChannel", void 0);
__decorate([
    HasMany(() => VideoPlaylistElementModel, {
        foreignKey: {
            name: 'videoPlaylistId',
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], VideoPlaylistModel.prototype, "VideoPlaylistElements", void 0);
__decorate([
    HasOne(() => ThumbnailModel, {
        foreignKey: {
            name: 'videoPlaylistId',
            allowNull: true
        },
        onDelete: 'CASCADE',
        hooks: true
    }),
    __metadata("design:type", Object)
], VideoPlaylistModel.prototype, "Thumbnail", void 0);
VideoPlaylistModel = VideoPlaylistModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.WITH_THUMBNAIL]: {
            include: [
                {
                    model: ThumbnailModel,
                    required: false
                }
            ]
        },
        [ScopeNames.WITH_VIDEOS_LENGTH]: {
            attributes: {
                include: [
                    [
                        literal(`(${getVideoLengthSelect()})`),
                        'videosLength'
                    ]
                ]
            }
        },
        [ScopeNames.WITH_ACCOUNT]: {
            include: [
                {
                    model: AccountModel,
                    required: true
                }
            ]
        },
        [ScopeNames.WITH_ACCOUNT_AND_CHANNEL_SUMMARY]: {
            include: [
                {
                    model: AccountModel.scope(AccountScopeNames.SUMMARY),
                    required: true
                },
                {
                    model: VideoChannelModel.scope(VideoChannelScopeNames.SUMMARY),
                    required: false
                }
            ]
        },
        [ScopeNames.WITH_ACCOUNT_AND_CHANNEL]: {
            include: [
                {
                    model: AccountModel,
                    required: true
                },
                {
                    model: VideoChannelModel,
                    required: false
                }
            ]
        },
        [ScopeNames.AVAILABLE_FOR_LIST]: (options) => {
            const whereAnd = [];
            const whereServer = options.host && options.host !== WEBSERVER.HOST
                ? { host: options.host }
                : undefined;
            let whereActor = {};
            if (options.host === WEBSERVER.HOST) {
                whereActor = {
                    [Op.and]: [{ serverId: null }]
                };
            }
            if (options.listMyPlaylists !== true) {
                whereAnd.push({
                    privacy: VideoPlaylistPrivacy.PUBLIC
                });
                if (options.followerActorId) {
                    const whereActorOr = [
                        {
                            serverId: null
                        }
                    ];
                    const inQueryInstanceFollow = buildServerIdsFollowedBy(options.followerActorId);
                    whereActorOr.push({
                        serverId: {
                            [Op.in]: literal(inQueryInstanceFollow)
                        }
                    });
                    Object.assign(whereActor, { [Op.or]: whereActorOr });
                }
            }
            if (options.accountId) {
                whereAnd.push({
                    ownerAccountId: options.accountId
                });
            }
            if (options.videoChannelId) {
                whereAnd.push({
                    videoChannelId: options.videoChannelId
                });
            }
            if (options.type) {
                whereAnd.push({
                    type: options.type
                });
            }
            if (options.uuids) {
                whereAnd.push({
                    uuid: {
                        [Op.in]: options.uuids
                    }
                });
            }
            if (options.withVideos === true) {
                whereAnd.push(literal(`(${getVideoLengthSelect()}) != 0`));
            }
            let attributesInclude = [literal('0 as similarity')];
            if (options.search) {
                const escapedSearch = VideoPlaylistModel.sequelize.escape(options.search);
                const escapedLikeSearch = VideoPlaylistModel.sequelize.escape('%' + options.search + '%');
                attributesInclude = [createSimilarityAttribute('VideoPlaylistModel.name', options.search)];
                whereAnd.push({
                    [Op.or]: [
                        Sequelize.literal('lower(immutable_unaccent("VideoPlaylistModel"."name")) % lower(immutable_unaccent(' + escapedSearch + '))'),
                        Sequelize.literal('lower(immutable_unaccent("VideoPlaylistModel"."name")) LIKE lower(immutable_unaccent(' + escapedLikeSearch + '))')
                    ]
                });
            }
            const where = {
                [Op.and]: whereAnd
            };
            const include = [
                {
                    model: AccountModel.scope({
                        method: [AccountScopeNames.SUMMARY, { whereActor, whereServer, forCount: options.forCount }]
                    }),
                    required: true
                }
            ];
            if (options.forCount !== true) {
                include.push({
                    model: VideoChannelModel.scope(VideoChannelScopeNames.SUMMARY),
                    required: false
                });
            }
            return {
                attributes: {
                    include: attributesInclude
                },
                where,
                include
            };
        }
    })),
    Table({
        tableName: 'videoPlaylist',
        indexes: [
            buildTrigramSearchIndex('video_playlist_name_trigram', 'name'),
            {
                fields: ['ownerAccountId']
            },
            {
                fields: ['videoChannelId']
            },
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], VideoPlaylistModel);
export { VideoPlaylistModel };
//# sourceMappingURL=video-playlist.js.map