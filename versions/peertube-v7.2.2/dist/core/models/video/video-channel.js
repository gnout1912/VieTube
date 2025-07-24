var VideoChannelModel_1;
import { __decorate, __metadata } from "tslib";
import { forceNumber, pick } from '@peertube/peertube-core-utils';
import { VideoPrivacy } from '@peertube/peertube-models';
import { CONFIG } from '../../initializers/config.js';
import { InternalEventEmitter } from '../../lib/internal-event-emitter.js';
import { literal, Op, QueryTypes } from 'sequelize';
import { AfterCreate, AfterDestroy, AfterUpdate, AllowNull, BeforeDestroy, BelongsTo, Column, CreatedAt, DataType, Default, DefaultScope, ForeignKey, HasMany, Is, Scopes, Sequelize, Table, UpdatedAt } from 'sequelize-typescript';
import { isVideoChannelDescriptionValid, isVideoChannelDisplayNameValid, isVideoChannelSupportValid } from '../../helpers/custom-validators/video-channels.js';
import { CONSTRAINTS_FIELDS, WEBSERVER } from '../../initializers/constants.js';
import { sendDeleteActor } from '../../lib/activitypub/send/index.js';
import { AccountModel, ScopeNames as AccountModelScopeNames } from '../account/account.js';
import { ActorFollowModel } from '../actor/actor-follow.js';
import { ActorImageModel } from '../actor/actor-image.js';
import { ActorModel, unusedActorAttributesForAPI } from '../actor/actor.js';
import { ServerModel } from '../server/server.js';
import { buildServerIdsFollowedBy, buildTrigramSearchIndex, createSimilarityAttribute, getSort, SequelizeModel, setAsUpdated, throwIfNotValid } from '../shared/index.js';
import { VideoPlaylistModel } from './video-playlist.js';
import { VideoModel } from './video.js';
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["FOR_API"] = "FOR_API";
    ScopeNames["SUMMARY"] = "SUMMARY";
    ScopeNames["WITH_ACCOUNT"] = "WITH_ACCOUNT";
    ScopeNames["WITH_ACTOR"] = "WITH_ACTOR";
    ScopeNames["WITH_ACTOR_BANNER"] = "WITH_ACTOR_BANNER";
    ScopeNames["WITH_VIDEOS"] = "WITH_VIDEOS";
    ScopeNames["WITH_STATS"] = "WITH_STATS";
})(ScopeNames || (ScopeNames = {}));
let VideoChannelModel = VideoChannelModel_1 = class VideoChannelModel extends SequelizeModel {
    static notifyCreate(channel) {
        InternalEventEmitter.Instance.emit('channel-created', { channel });
    }
    static notifyUpdate(channel) {
        InternalEventEmitter.Instance.emit('channel-updated', { channel });
    }
    static notifyDestroy(channel) {
        InternalEventEmitter.Instance.emit('channel-deleted', { channel });
    }
    static async sendDeleteIfOwned(instance, options) {
        if (!instance.Actor) {
            instance.Actor = await instance.$get('Actor', { transaction: options.transaction });
        }
        await ActorFollowModel.removeFollowsOf(instance.Actor.id, options.transaction);
        if (instance.Actor.isOwned()) {
            return sendDeleteActor(instance.Actor, options.transaction);
        }
        return undefined;
    }
    static async deleteActorIfRemote(instance, options) {
        if (!instance.Actor) {
            instance.Actor = await instance.$get('Actor', { transaction: options.transaction });
        }
        if (instance.Actor.serverId) {
            await instance.Actor.destroy({ transaction: options.transaction });
        }
    }
    static countByAccount(accountId) {
        const query = {
            where: {
                accountId
            }
        };
        return VideoChannelModel_1.unscoped().count(query);
    }
    static async getStats() {
        function getLocalVideoChannelStats(days) {
            const options = {
                type: QueryTypes.SELECT,
                raw: true
            };
            const videoJoin = days
                ? `INNER JOIN "video" AS "Videos" ON "VideoChannelModel"."id" = "Videos"."channelId" ` +
                    `AND ("Videos"."publishedAt" > Now() - interval '${days}d')`
                : '';
            const query = `
      SELECT COUNT(DISTINCT("VideoChannelModel"."id")) AS "count"
      FROM "videoChannel" AS "VideoChannelModel"
      ${videoJoin}
      INNER JOIN "account" AS "Account" ON "VideoChannelModel"."accountId" = "Account"."id"
      INNER JOIN "actor" AS "Account->Actor" ON "Account"."actorId" = "Account->Actor"."id"
        AND "Account->Actor"."serverId" IS NULL`;
            return VideoChannelModel_1.sequelize.query(query, options)
                .then(r => parseInt(r[0].count, 10));
        }
        const totalLocalVideoChannels = await getLocalVideoChannelStats();
        const totalLocalDailyActiveVideoChannels = await getLocalVideoChannelStats(1);
        const totalLocalWeeklyActiveVideoChannels = await getLocalVideoChannelStats(7);
        const totalLocalMonthlyActiveVideoChannels = await getLocalVideoChannelStats(30);
        const totalLocalHalfYearActiveVideoChannels = await getLocalVideoChannelStats(180);
        return {
            totalLocalVideoChannels,
            totalLocalDailyActiveVideoChannels,
            totalLocalWeeklyActiveVideoChannels,
            totalLocalMonthlyActiveVideoChannels,
            totalLocalHalfYearActiveVideoChannels
        };
    }
    static listLocalsForSitemap(sort) {
        const query = {
            attributes: [],
            offset: 0,
            order: getSort(sort),
            include: [
                {
                    attributes: ['preferredUsername', 'serverId'],
                    model: ActorModel.unscoped(),
                    where: {
                        serverId: null
                    }
                }
            ],
            where: {
                [Op.and]: [
                    literal(`EXISTS (SELECT 1 FROM "video" WHERE "privacy" = ${VideoPrivacy.PUBLIC} AND "channelId" = "VideoChannelModel"."id")`)
                ]
            }
        };
        return VideoChannelModel_1
            .unscoped()
            .findAll(query);
    }
    static listForApi(parameters) {
        const { actorId } = parameters;
        const query = {
            offset: parameters.start,
            limit: parameters.count,
            order: getSort(parameters.sort)
        };
        const getScope = (forCount) => {
            return { method: [ScopeNames.FOR_API, { actorId, forCount }] };
        };
        return Promise.all([
            VideoChannelModel_1.scope(getScope(true)).count(),
            VideoChannelModel_1.scope(getScope(false)).findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static searchForApi(options) {
        let attributesInclude = [literal('0 as similarity')];
        let where;
        if (options.search) {
            const escapedSearch = VideoChannelModel_1.sequelize.escape(options.search);
            const escapedLikeSearch = VideoChannelModel_1.sequelize.escape('%' + options.search + '%');
            attributesInclude = [createSimilarityAttribute('VideoChannelModel.name', options.search)];
            where = {
                [Op.or]: [
                    Sequelize.literal('lower(immutable_unaccent("VideoChannelModel"."name")) % lower(immutable_unaccent(' + escapedSearch + '))'),
                    Sequelize.literal('lower(immutable_unaccent("VideoChannelModel"."name")) LIKE lower(immutable_unaccent(' + escapedLikeSearch + '))')
                ]
            };
        }
        const query = {
            attributes: {
                include: attributesInclude
            },
            offset: options.start,
            limit: options.count,
            order: getSort(options.sort),
            where
        };
        const getScope = (forCount) => {
            return {
                method: [
                    ScopeNames.FOR_API,
                    Object.assign(Object.assign({}, pick(options, ['actorId', 'host', 'handles'])), { forCount })
                ]
            };
        };
        return Promise.all([
            VideoChannelModel_1.scope(getScope(true)).count(query),
            VideoChannelModel_1.scope(getScope(false)).findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static listByAccountForAPI(options) {
        const escapedSearch = VideoModel.sequelize.escape(options.search);
        const escapedLikeSearch = VideoModel.sequelize.escape('%' + options.search + '%');
        const where = options.search
            ? {
                [Op.or]: [
                    Sequelize.literal('lower(immutable_unaccent("VideoChannelModel"."name")) % lower(immutable_unaccent(' + escapedSearch + '))'),
                    Sequelize.literal('lower(immutable_unaccent("VideoChannelModel"."name")) LIKE lower(immutable_unaccent(' + escapedLikeSearch + '))')
                ]
            }
            : null;
        const getQuery = (forCount) => {
            const accountModel = forCount
                ? AccountModel.unscoped()
                : AccountModel;
            return {
                offset: options.start,
                limit: options.count,
                order: getSort(options.sort),
                include: [
                    {
                        model: accountModel,
                        where: {
                            id: options.accountId
                        },
                        required: true
                    }
                ],
                where
            };
        };
        const findScopes = [ScopeNames.WITH_ACTOR_BANNER];
        if (options.withStats === true) {
            findScopes.push({
                method: [ScopeNames.WITH_STATS, { daysPrior: 30 }]
            });
        }
        return Promise.all([
            VideoChannelModel_1.unscoped().count(getQuery(true)),
            VideoChannelModel_1.scope(findScopes).findAll(getQuery(false))
        ]).then(([total, data]) => ({ total, data }));
    }
    static listAllByAccount(accountId) {
        const query = {
            limit: CONFIG.VIDEO_CHANNELS.MAX_PER_USER,
            include: [
                {
                    attributes: [],
                    model: AccountModel.unscoped(),
                    where: {
                        id: accountId
                    },
                    required: true
                }
            ]
        };
        return VideoChannelModel_1.findAll(query);
    }
    static loadAndPopulateAccount(id, transaction) {
        return VideoChannelModel_1.unscoped()
            .scope([ScopeNames.WITH_ACTOR_BANNER, ScopeNames.WITH_ACCOUNT])
            .findByPk(id, { transaction });
    }
    static loadByUrlAndPopulateAccount(url) {
        const query = {
            include: [
                {
                    model: ActorModel,
                    required: true,
                    where: {
                        url
                    },
                    include: [
                        {
                            model: ActorImageModel,
                            required: false,
                            as: 'Banners'
                        }
                    ]
                }
            ]
        };
        return VideoChannelModel_1
            .scope([ScopeNames.WITH_ACCOUNT])
            .findOne(query);
    }
    static loadByHandleAndPopulateAccount(handle) {
        const [name, host] = handle.split('@');
        if (!host || host === WEBSERVER.HOST)
            return VideoChannelModel_1.loadLocalByNameAndPopulateAccount(name);
        return VideoChannelModel_1.loadByNameAndHostAndPopulateAccount(name, host);
    }
    static loadLocalByNameAndPopulateAccount(name) {
        const query = {
            include: [
                {
                    model: ActorModel,
                    required: true,
                    where: {
                        [Op.and]: [
                            ActorModel.wherePreferredUsername(name, 'Actor.preferredUsername'),
                            { serverId: null }
                        ]
                    },
                    include: [
                        {
                            model: ActorImageModel,
                            required: false,
                            as: 'Banners'
                        }
                    ]
                }
            ]
        };
        return VideoChannelModel_1.unscoped()
            .scope([ScopeNames.WITH_ACCOUNT])
            .findOne(query);
    }
    static loadByNameAndHostAndPopulateAccount(name, host) {
        const query = {
            include: [
                {
                    model: ActorModel,
                    required: true,
                    where: ActorModel.wherePreferredUsername(name, 'Actor.preferredUsername'),
                    include: [
                        {
                            model: ServerModel,
                            required: true,
                            where: { host }
                        },
                        {
                            model: ActorImageModel,
                            required: false,
                            as: 'Banners'
                        }
                    ]
                }
            ]
        };
        return VideoChannelModel_1.unscoped()
            .scope([ScopeNames.WITH_ACCOUNT])
            .findOne(query);
    }
    toFormattedSummaryJSON() {
        const actor = this.Actor.toFormattedSummaryJSON();
        return {
            id: this.id,
            name: actor.name,
            displayName: this.getDisplayName(),
            url: actor.url,
            host: actor.host,
            avatars: actor.avatars
        };
    }
    toFormattedJSON() {
        const viewsPerDayString = this.get('viewsPerDay');
        const videosCount = this.get('videosCount');
        let viewsPerDay;
        if (viewsPerDayString) {
            viewsPerDay = viewsPerDayString.split(',')
                .map(v => {
                const [dateString, amount] = v.split('|');
                return {
                    date: new Date(dateString),
                    views: +amount
                };
            });
        }
        const totalViews = this.get('totalViews');
        const actor = this.Actor.toFormattedJSON();
        const videoChannel = {
            id: this.id,
            displayName: this.getDisplayName(),
            description: this.description,
            support: this.support,
            isLocal: this.Actor.isOwned(),
            updatedAt: this.updatedAt,
            ownerAccount: undefined,
            videosCount,
            viewsPerDay,
            totalViews,
            avatars: actor.avatars
        };
        if (this.Account)
            videoChannel.ownerAccount = this.Account.toFormattedJSON();
        return Object.assign(actor, videoChannel);
    }
    async toActivityPubObject() {
        const obj = await this.Actor.toActivityPubObject(this.name);
        return Object.assign(Object.assign({}, obj), { url: this.Actor.url, summary: this.description, support: this.support, postingRestrictedToMods: true, attributedTo: [
                {
                    type: 'Person',
                    id: this.Account.Actor.url
                }
            ] });
    }
    getClientUrl(videosSuffix = true) {
        const suffix = videosSuffix
            ? '/videos'
            : '';
        return WEBSERVER.URL + '/c/' + this.Actor.getIdentifier() + suffix;
    }
    getDisplayName() {
        return this.name;
    }
    isOutdated() {
        return this.Actor.isOutdated();
    }
    setAsUpdated(transaction) {
        return setAsUpdated({ sequelize: this.sequelize, table: 'videoChannel', id: this.id, transaction });
    }
};
__decorate([
    AllowNull(false),
    Is('VideoChannelName', value => throwIfNotValid(value, isVideoChannelDisplayNameValid, 'name')),
    Column,
    __metadata("design:type", String)
], VideoChannelModel.prototype, "name", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('VideoChannelDescription', value => throwIfNotValid(value, isVideoChannelDescriptionValid, 'description', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_CHANNELS.DESCRIPTION.max)),
    __metadata("design:type", String)
], VideoChannelModel.prototype, "description", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('VideoChannelSupport', value => throwIfNotValid(value, isVideoChannelSupportValid, 'support', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_CHANNELS.SUPPORT.max)),
    __metadata("design:type", String)
], VideoChannelModel.prototype, "support", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoChannelModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoChannelModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => ActorModel),
    Column,
    __metadata("design:type", Number)
], VideoChannelModel.prototype, "actorId", void 0);
__decorate([
    BelongsTo(() => ActorModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoChannelModel.prototype, "Actor", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], VideoChannelModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: false
        }
    }),
    __metadata("design:type", Object)
], VideoChannelModel.prototype, "Account", void 0);
__decorate([
    HasMany(() => VideoModel, {
        foreignKey: {
            name: 'channelId',
            allowNull: false
        },
        onDelete: 'CASCADE',
        hooks: true
    }),
    __metadata("design:type", Array)
], VideoChannelModel.prototype, "Videos", void 0);
__decorate([
    HasMany(() => VideoPlaylistModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'CASCADE',
        hooks: true
    }),
    __metadata("design:type", Array)
], VideoChannelModel.prototype, "VideoPlaylists", void 0);
__decorate([
    AfterCreate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideoChannelModel, "notifyCreate", null);
__decorate([
    AfterUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideoChannelModel, "notifyUpdate", null);
__decorate([
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideoChannelModel, "notifyDestroy", null);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoChannelModel, Object]),
    __metadata("design:returntype", Promise)
], VideoChannelModel, "sendDeleteIfOwned", null);
__decorate([
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoChannelModel, Object]),
    __metadata("design:returntype", Promise)
], VideoChannelModel, "deleteActorIfRemote", null);
VideoChannelModel = VideoChannelModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: ActorModel,
                required: true
            }
        ]
    })),
    Scopes(() => ({
        [ScopeNames.FOR_API]: (options) => {
            const inQueryInstanceFollow = buildServerIdsFollowedBy(options.actorId);
            const whereActorAnd = [
                {
                    [Op.or]: [
                        {
                            serverId: null
                        },
                        {
                            serverId: {
                                [Op.in]: Sequelize.literal(inQueryInstanceFollow)
                            }
                        }
                    ]
                }
            ];
            let serverRequired = false;
            let whereServer;
            if (options.host && options.host !== WEBSERVER.HOST) {
                serverRequired = true;
                whereServer = { host: options.host };
            }
            if (options.host === WEBSERVER.HOST) {
                whereActorAnd.push({
                    serverId: null
                });
            }
            if (Array.isArray(options.handles) && options.handles.length !== 0) {
                const or = [];
                for (const handle of options.handles || []) {
                    const [preferredUsername, host] = handle.split('@');
                    const sanitizedPreferredUsername = VideoChannelModel.sequelize.escape(preferredUsername.toLowerCase());
                    const sanitizedHost = VideoChannelModel.sequelize.escape(host);
                    if (!host || host === WEBSERVER.HOST) {
                        or.push(`(LOWER("preferredUsername") = ${sanitizedPreferredUsername} AND "serverId" IS NULL)`);
                    }
                    else {
                        or.push(`(` +
                            `LOWER("preferredUsername") = ${sanitizedPreferredUsername} ` +
                            `AND "host" = ${sanitizedHost}` +
                            `)`);
                    }
                }
                whereActorAnd.push({
                    id: {
                        [Op.in]: literal(`(SELECT "actor".id FROM actor LEFT JOIN server on server.id = actor."serverId" WHERE ${or.join(' OR ')})`)
                    }
                });
            }
            const channelActorInclude = [];
            const accountActorInclude = [];
            if (options.forCount !== true) {
                accountActorInclude.push({
                    model: ServerModel,
                    required: false
                });
                accountActorInclude.push({
                    model: ActorImageModel,
                    as: 'Avatars',
                    required: false
                });
                channelActorInclude.push({
                    model: ActorImageModel,
                    as: 'Avatars',
                    required: false
                });
                channelActorInclude.push({
                    model: ActorImageModel,
                    as: 'Banners',
                    required: false
                });
            }
            if (options.forCount !== true || serverRequired) {
                channelActorInclude.push({
                    model: ServerModel,
                    duplicating: false,
                    required: serverRequired,
                    where: whereServer
                });
            }
            return {
                include: [
                    {
                        attributes: {
                            exclude: unusedActorAttributesForAPI
                        },
                        model: ActorModel.unscoped(),
                        where: {
                            [Op.and]: whereActorAnd
                        },
                        include: channelActorInclude
                    },
                    {
                        model: AccountModel.unscoped(),
                        required: true,
                        include: [
                            {
                                attributes: {
                                    exclude: unusedActorAttributesForAPI
                                },
                                model: ActorModel.unscoped(),
                                required: true,
                                include: accountActorInclude
                            }
                        ]
                    }
                ]
            };
        },
        [ScopeNames.SUMMARY]: (options = {}) => {
            var _a;
            const include = [
                {
                    attributes: ['id', 'preferredUsername', 'url', 'serverId'],
                    model: ActorModel.unscoped(),
                    required: (_a = options.actorRequired) !== null && _a !== void 0 ? _a : true,
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
            ];
            const base = {
                attributes: ['id', 'name', 'description', 'actorId']
            };
            if (options.withAccount === true) {
                include.push({
                    model: AccountModel.scope({
                        method: [AccountModelScopeNames.SUMMARY, { withAccountBlockerIds: options.withAccountBlockerIds }]
                    }),
                    required: true
                });
            }
            base.include = include;
            return base;
        },
        [ScopeNames.WITH_ACCOUNT]: {
            include: [
                {
                    model: AccountModel,
                    required: true
                }
            ]
        },
        [ScopeNames.WITH_ACTOR]: {
            include: [
                ActorModel
            ]
        },
        [ScopeNames.WITH_ACTOR_BANNER]: {
            include: [
                {
                    model: ActorModel,
                    include: [
                        {
                            model: ActorImageModel,
                            required: false,
                            as: 'Banners'
                        }
                    ]
                }
            ]
        },
        [ScopeNames.WITH_VIDEOS]: {
            include: [
                VideoModel
            ]
        },
        [ScopeNames.WITH_STATS]: (options = { daysPrior: 30 }) => {
            const daysPrior = forceNumber(options.daysPrior);
            return {
                attributes: {
                    include: [
                        [
                            literal('(SELECT COUNT(*) FROM "video" WHERE "channelId" = "VideoChannelModel"."id")'),
                            'videosCount'
                        ],
                        [
                            literal('(' +
                                `SELECT string_agg(concat_ws('|', t.day, t.views), ',') ` +
                                'FROM ( ' +
                                'WITH ' +
                                'days AS ( ' +
                                `SELECT generate_series(date_trunc('day', now()) - '${daysPrior} day'::interval, ` +
                                `date_trunc('day', now()), '1 day'::interval) AS day ` +
                                ') ' +
                                'SELECT days.day AS day, COALESCE(SUM("videoView".views), 0) AS views ' +
                                'FROM days ' +
                                'LEFT JOIN (' +
                                '"videoView" INNER JOIN "video" ON "videoView"."videoId" = "video"."id" ' +
                                'AND "video"."channelId" = "VideoChannelModel"."id"' +
                                `) ON date_trunc('day', "videoView"."startDate") = date_trunc('day', days.day) ` +
                                'GROUP BY day ' +
                                'ORDER BY day ' +
                                ') t' +
                                ')'),
                            'viewsPerDay'
                        ],
                        [
                            literal('(' +
                                'SELECT COALESCE(SUM("video".views), 0) AS totalViews ' +
                                'FROM "video" ' +
                                'WHERE "video"."channelId" = "VideoChannelModel"."id"' +
                                ')'),
                            'totalViews'
                        ]
                    ]
                }
            };
        }
    })),
    Table({
        tableName: 'videoChannel',
        indexes: [
            buildTrigramSearchIndex('video_channel_name_trigram', 'name'),
            {
                fields: ['accountId']
            },
            {
                fields: ['actorId']
            }
        ]
    })
], VideoChannelModel);
export { VideoChannelModel };
//# sourceMappingURL=video-channel.js.map