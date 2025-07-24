var ActorModel_1;
import { __decorate, __metadata } from "tslib";
import { forceNumber, maxBy } from '@peertube/peertube-core-utils';
import { ActorImageType } from '@peertube/peertube-models';
import { activityPubContextify } from '../../helpers/activity-pub-utils.js';
import { getContextFilter } from '../../lib/activitypub/context.js';
import { ModelCache } from '../shared/model-cache.js';
import { Op, QueryTypes, col, fn, literal, where } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, DefaultScope, ForeignKey, HasMany, HasOne, Is, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { isActorFollowersCountValid, isActorFollowingCountValid, isActorPreferredUsernameValid, isActorPrivateKeyValid, isActorPublicKeyValid } from '../../helpers/custom-validators/activitypub/actor.js';
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { ACTIVITY_PUB, ACTIVITY_PUB_ACTOR_TYPES, CONSTRAINTS_FIELDS, SERVER_ACTOR_NAME, WEBSERVER } from '../../initializers/constants.js';
import { AccountModel } from '../account/account.js';
import { getServerActor } from '../application/application.js';
import { ServerModel } from '../server/server.js';
import { SequelizeModel, buildSQLAttributes, isOutdated, throwIfNotValid } from '../shared/index.js';
import { VideoChannelModel } from '../video/video-channel.js';
import { VideoModel } from '../video/video.js';
import { ActorFollowModel } from './actor-follow.js';
import { ActorImageModel } from './actor-image.js';
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["FULL"] = "FULL";
})(ScopeNames || (ScopeNames = {}));
export const unusedActorAttributesForAPI = [
    'publicKey',
    'privateKey',
    'inboxUrl',
    'outboxUrl',
    'sharedInboxUrl',
    'followersUrl',
    'followingUrl'
];
let ActorModel = ActorModel_1 = class ActorModel extends SequelizeModel {
    static getSQLAttributes(tableName, aliasPrefix = '') {
        return buildSQLAttributes({
            model: this,
            tableName,
            aliasPrefix
        });
    }
    static getSQLAPIAttributes(tableName, aliasPrefix = '') {
        return buildSQLAttributes({
            model: this,
            tableName,
            aliasPrefix,
            excludeAttributes: unusedActorAttributesForAPI
        });
    }
    static wherePreferredUsername(preferredUsername, colName = 'preferredUsername') {
        return where(fn('lower', col(colName)), preferredUsername.toLowerCase());
    }
    static async load(id) {
        const actorServer = await getServerActor();
        if (id === actorServer.id)
            return actorServer;
        return ActorModel_1.unscoped().findByPk(id);
    }
    static loadFull(id) {
        return ActorModel_1.scope(ScopeNames.FULL).findByPk(id);
    }
    static loadAccountActorFollowerUrlByVideoId(videoId, transaction) {
        const query = `SELECT "actor"."id" AS "id", "actor"."followersUrl" AS "followersUrl" ` +
            `FROM "actor" ` +
            `INNER JOIN "account" ON "actor"."id" = "account"."actorId" ` +
            `INNER JOIN "videoChannel" ON "videoChannel"."accountId" = "account"."id" ` +
            `INNER JOIN "video" ON "video"."channelId" = "videoChannel"."id" AND "video"."id" = :videoId`;
        const options = {
            type: QueryTypes.SELECT,
            replacements: { videoId },
            plain: true,
            transaction
        };
        return ActorModel_1.sequelize.query(query, options)
            .then(res => {
            if (res && res.length !== 0)
                return res[0];
            return undefined;
        });
    }
    static listByFollowersUrls(followersUrls, transaction) {
        const query = {
            where: {
                followersUrl: {
                    [Op.in]: followersUrls
                }
            },
            transaction
        };
        return ActorModel_1.scope(ScopeNames.FULL).findAll(query);
    }
    static loadLocalByName(preferredUsername, transaction) {
        const fun = () => {
            const query = {
                where: {
                    [Op.and]: [
                        this.wherePreferredUsername(preferredUsername, '"ActorModel"."preferredUsername"'),
                        {
                            serverId: null
                        }
                    ]
                },
                transaction
            };
            return ActorModel_1.scope(ScopeNames.FULL).findOne(query);
        };
        return ModelCache.Instance.doCache({
            cacheType: 'local-actor-name',
            key: preferredUsername,
            whitelist: () => preferredUsername === SERVER_ACTOR_NAME,
            fun
        });
    }
    static loadLocalUrlByName(preferredUsername, transaction) {
        const fun = () => {
            const query = {
                attributes: ['url'],
                where: {
                    [Op.and]: [
                        this.wherePreferredUsername(preferredUsername),
                        {
                            serverId: null
                        }
                    ]
                },
                transaction
            };
            return ActorModel_1.unscoped().findOne(query);
        };
        return ModelCache.Instance.doCache({
            cacheType: 'local-actor-url',
            key: preferredUsername,
            whitelist: () => preferredUsername === SERVER_ACTOR_NAME,
            fun
        });
    }
    static loadByNameAndHost(preferredUsername, host) {
        const query = {
            where: this.wherePreferredUsername(preferredUsername, '"ActorModel"."preferredUsername"'),
            include: [
                {
                    model: ServerModel,
                    required: true,
                    where: {
                        host
                    }
                }
            ]
        };
        return ActorModel_1.scope(ScopeNames.FULL).findOne(query);
    }
    static loadByUrl(url, transaction) {
        const query = {
            where: {
                url
            },
            transaction,
            include: [
                {
                    attributes: ['id'],
                    model: AccountModel.unscoped(),
                    required: false
                },
                {
                    attributes: ['id'],
                    model: VideoChannelModel.unscoped(),
                    required: false
                }
            ]
        };
        return ActorModel_1.unscoped().findOne(query);
    }
    static loadByUrlAndPopulateAccountAndChannel(url, transaction) {
        const query = {
            where: {
                url
            },
            transaction
        };
        return ActorModel_1.scope(ScopeNames.FULL).findOne(query);
    }
    static rebuildFollowsCount(ofId, type, transaction) {
        const sanitizedOfId = forceNumber(ofId);
        const where = { id: sanitizedOfId };
        let columnToUpdate;
        let columnOfCount;
        if (type === 'followers') {
            columnToUpdate = 'followersCount';
            columnOfCount = 'targetActorId';
        }
        else {
            columnToUpdate = 'followingCount';
            columnOfCount = 'actorId';
        }
        return ActorModel_1.update({
            [columnToUpdate]: literal(`(SELECT COUNT(*) FROM "actorFollow" WHERE "${columnOfCount}" = ${sanitizedOfId} AND "state" = 'accepted')`)
        }, { where, transaction });
    }
    static loadAccountActorByVideoId(videoId, transaction) {
        const query = {
            include: [
                {
                    attributes: ['id'],
                    model: AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: ['id', 'accountId'],
                            model: VideoChannelModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    attributes: ['id', 'channelId'],
                                    model: VideoModel.unscoped(),
                                    where: {
                                        id: videoId
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            transaction
        };
        return ActorModel_1.unscoped().findOne(query);
    }
    getSharedInbox() {
        return this.sharedInboxUrl || this.inboxUrl;
    }
    toFormattedSummaryJSON() {
        return {
            url: this.url,
            name: this.preferredUsername,
            host: this.getHost(),
            avatars: (this.Avatars || []).map(a => a.toFormattedJSON())
        };
    }
    toFormattedJSON(includeBanner = true) {
        return Object.assign(Object.assign({}, this.toFormattedSummaryJSON()), { id: this.id, hostRedundancyAllowed: this.getRedundancyAllowed(), followingCount: this.followingCount, followersCount: this.followersCount, createdAt: this.getCreatedAt(), banners: includeBanner
                ? (this.Banners || []).map(b => b.toFormattedJSON())
                : undefined });
    }
    toActivityPubObject(name) {
        let icon;
        let image;
        if (this.hasImage(ActorImageType.AVATAR)) {
            let avatars = this.Avatars;
            const avatar120Px = avatars.find(a => a.width === 120);
            if (avatar120Px)
                avatars = [avatar120Px, ...avatars.filter(a => a.width !== 120)];
            icon = avatars.map(a => a.toActivityPubObject());
        }
        if (this.hasImage(ActorImageType.BANNER)) {
            image = this.Banners.map(b => b.toActivityPubObject());
        }
        const json = {
            type: this.type,
            id: this.url,
            following: this.getFollowingUrl(),
            followers: this.getFollowersUrl(),
            playlists: this.getPlaylistsUrl(),
            inbox: this.inboxUrl,
            outbox: this.outboxUrl,
            preferredUsername: this.preferredUsername,
            name,
            endpoints: {
                sharedInbox: this.sharedInboxUrl
            },
            publicKey: {
                id: this.getPublicKeyUrl(),
                owner: this.url,
                publicKeyPem: this.publicKey
            },
            published: this.getCreatedAt().toISOString(),
            icon,
            image
        };
        return activityPubContextify(json, 'Actor', getContextFilter());
    }
    getFollowerSharedInboxUrls(t) {
        const query = {
            attributes: ['sharedInboxUrl'],
            include: [
                {
                    attribute: [],
                    model: ActorFollowModel.unscoped(),
                    required: true,
                    as: 'ActorFollowing',
                    where: {
                        state: 'accepted',
                        targetActorId: this.id
                    }
                }
            ],
            transaction: t
        };
        return ActorModel_1.findAll(query)
            .then(accounts => accounts.map(a => a.sharedInboxUrl));
    }
    getFollowingUrl() {
        return this.url + '/following';
    }
    getFollowersUrl() {
        return this.url + '/followers';
    }
    getPlaylistsUrl() {
        return this.url + '/playlists';
    }
    getPublicKeyUrl() {
        return this.url + '#main-key';
    }
    isOwned() {
        return this.serverId === null;
    }
    getWebfingerUrl() {
        return 'acct:' + this.preferredUsername + '@' + this.getHost();
    }
    getIdentifier() {
        return this.Server ? `${this.preferredUsername}@${this.Server.host}` : this.preferredUsername;
    }
    getFullIdentifier() {
        return `${this.preferredUsername}@${this.getHost()}`;
    }
    getHost() {
        if (this.serverId && !this.Server)
            throw new Error('Server is not loaded in the object');
        return this.Server ? this.Server.host : WEBSERVER.HOST;
    }
    getRedundancyAllowed() {
        return this.Server ? this.Server.redundancyAllowed : false;
    }
    hasImage(type) {
        const images = type === ActorImageType.AVATAR
            ? this.Avatars
            : this.Banners;
        return Array.isArray(images) && images.length !== 0;
    }
    getMaxQualityImage(type) {
        if (!this.hasImage(type))
            return undefined;
        const images = type === ActorImageType.AVATAR
            ? this.Avatars
            : this.Banners;
        return maxBy(images, 'height');
    }
    isOutdated() {
        if (this.isOwned())
            return false;
        return isOutdated(this, ACTIVITY_PUB.ACTOR_REFRESH_INTERVAL);
    }
    getCreatedAt() {
        return this.remoteCreatedAt || this.createdAt;
    }
};
__decorate([
    AllowNull(false),
    Column(DataType.ENUM(...Object.values(ACTIVITY_PUB_ACTOR_TYPES))),
    __metadata("design:type", String)
], ActorModel.prototype, "type", void 0);
__decorate([
    AllowNull(false),
    Is('ActorPreferredUsername', value => throwIfNotValid(value, isActorPreferredUsernameValid, 'actor preferred username')),
    Column,
    __metadata("design:type", String)
], ActorModel.prototype, "preferredUsername", void 0);
__decorate([
    AllowNull(false),
    Is('ActorUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    __metadata("design:type", String)
], ActorModel.prototype, "url", void 0);
__decorate([
    AllowNull(true),
    Is('ActorPublicKey', value => throwIfNotValid(value, isActorPublicKeyValid, 'public key', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ACTORS.PUBLIC_KEY.max)),
    __metadata("design:type", String)
], ActorModel.prototype, "publicKey", void 0);
__decorate([
    AllowNull(true),
    Is('ActorPublicKey', value => throwIfNotValid(value, isActorPrivateKeyValid, 'private key', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ACTORS.PRIVATE_KEY.max)),
    __metadata("design:type", String)
], ActorModel.prototype, "privateKey", void 0);
__decorate([
    AllowNull(false),
    Is('ActorFollowersCount', value => throwIfNotValid(value, isActorFollowersCountValid, 'followers count')),
    Column,
    __metadata("design:type", Number)
], ActorModel.prototype, "followersCount", void 0);
__decorate([
    AllowNull(false),
    Is('ActorFollowersCount', value => throwIfNotValid(value, isActorFollowingCountValid, 'following count')),
    Column,
    __metadata("design:type", Number)
], ActorModel.prototype, "followingCount", void 0);
__decorate([
    AllowNull(false),
    Is('ActorInboxUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'inbox url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    __metadata("design:type", String)
], ActorModel.prototype, "inboxUrl", void 0);
__decorate([
    AllowNull(true),
    Is('ActorOutboxUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'outbox url', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    __metadata("design:type", String)
], ActorModel.prototype, "outboxUrl", void 0);
__decorate([
    AllowNull(true),
    Is('ActorSharedInboxUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'shared inbox url', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    __metadata("design:type", String)
], ActorModel.prototype, "sharedInboxUrl", void 0);
__decorate([
    AllowNull(true),
    Is('ActorFollowersUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'followers url', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    __metadata("design:type", String)
], ActorModel.prototype, "followersUrl", void 0);
__decorate([
    AllowNull(true),
    Is('ActorFollowingUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'following url', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ACTORS.URL.max)),
    __metadata("design:type", String)
], ActorModel.prototype, "followingUrl", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Date)
], ActorModel.prototype, "remoteCreatedAt", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], ActorModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], ActorModel.prototype, "updatedAt", void 0);
__decorate([
    HasMany(() => ActorImageModel, {
        as: 'Avatars',
        onDelete: 'cascade',
        hooks: true,
        foreignKey: {
            allowNull: false
        },
        scope: {
            type: ActorImageType.AVATAR
        }
    }),
    __metadata("design:type", Array)
], ActorModel.prototype, "Avatars", void 0);
__decorate([
    HasMany(() => ActorImageModel, {
        as: 'Banners',
        onDelete: 'cascade',
        hooks: true,
        foreignKey: {
            allowNull: false
        },
        scope: {
            type: ActorImageType.BANNER
        }
    }),
    __metadata("design:type", Array)
], ActorModel.prototype, "Banners", void 0);
__decorate([
    HasMany(() => ActorFollowModel, {
        foreignKey: {
            name: 'actorId',
            allowNull: false
        },
        as: 'ActorFollowings',
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], ActorModel.prototype, "ActorFollowing", void 0);
__decorate([
    HasMany(() => ActorFollowModel, {
        foreignKey: {
            name: 'targetActorId',
            allowNull: false
        },
        as: 'ActorFollowers',
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], ActorModel.prototype, "ActorFollowers", void 0);
__decorate([
    ForeignKey(() => ServerModel),
    Column,
    __metadata("design:type", Number)
], ActorModel.prototype, "serverId", void 0);
__decorate([
    BelongsTo(() => ServerModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], ActorModel.prototype, "Server", void 0);
__decorate([
    HasOne(() => AccountModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Object)
], ActorModel.prototype, "Account", void 0);
__decorate([
    HasOne(() => VideoChannelModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Object)
], ActorModel.prototype, "VideoChannel", void 0);
ActorModel = ActorModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: ServerModel,
                required: false
            },
            {
                model: ActorImageModel,
                as: 'Avatars',
                required: false
            }
        ]
    })),
    Scopes(() => ({
        [ScopeNames.FULL]: {
            include: [
                {
                    model: AccountModel.unscoped(),
                    required: false
                },
                {
                    model: VideoChannelModel.unscoped(),
                    required: false,
                    include: [
                        {
                            model: AccountModel,
                            required: true
                        }
                    ]
                },
                {
                    model: ServerModel,
                    required: false
                },
                {
                    model: ActorImageModel,
                    as: 'Avatars',
                    required: false
                },
                {
                    model: ActorImageModel,
                    as: 'Banners',
                    required: false
                }
            ]
        }
    })),
    Table({
        tableName: 'actor',
        indexes: [
            {
                fields: ['url'],
                unique: true
            },
            {
                fields: [fn('lower', col('preferredUsername')), 'serverId'],
                name: 'actor_preferred_username_lower_server_id',
                unique: true,
                where: {
                    serverId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: [fn('lower', col('preferredUsername'))],
                name: 'actor_preferred_username_lower',
                unique: true,
                where: {
                    serverId: null
                }
            },
            {
                fields: ['inboxUrl', 'sharedInboxUrl']
            },
            {
                fields: ['sharedInboxUrl']
            },
            {
                fields: ['serverId']
            },
            {
                fields: ['followersUrl']
            }
        ]
    })
], ActorModel);
export { ActorModel };
//# sourceMappingURL=actor.js.map