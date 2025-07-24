var AccountModel_1;
import { __decorate, __metadata } from "tslib";
import { VideoPrivacy } from '@peertube/peertube-models';
import { ModelCache } from '../shared/model-cache.js';
import { Op, literal } from 'sequelize';
import { AfterDestroy, AllowNull, BeforeDestroy, BelongsTo, Column, CreatedAt, DataType, Default, DefaultScope, ForeignKey, HasMany, Is, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { isAccountDescriptionValid } from '../../helpers/custom-validators/accounts.js';
import { CONSTRAINTS_FIELDS, SERVER_ACTOR_NAME, WEBSERVER } from '../../initializers/constants.js';
import { sendDeleteActor } from '../../lib/activitypub/send/send-delete.js';
import { ActorFollowModel } from '../actor/actor-follow.js';
import { ActorImageModel } from '../actor/actor-image.js';
import { ActorModel } from '../actor/actor.js';
import { ApplicationModel } from '../application/application.js';
import { AccountAutomaticTagPolicyModel } from '../automatic-tag/account-automatic-tag-policy.js';
import { CommentAutomaticTagModel } from '../automatic-tag/comment-automatic-tag.js';
import { VideoAutomaticTagModel } from '../automatic-tag/video-automatic-tag.js';
import { ServerBlocklistModel } from '../server/server-blocklist.js';
import { ServerModel } from '../server/server.js';
import { SequelizeModel, buildSQLAttributes, getSort, throwIfNotValid } from '../shared/index.js';
import { UserModel } from '../user/user.js';
import { VideoChannelModel } from '../video/video-channel.js';
import { VideoCommentModel } from '../video/video-comment.js';
import { VideoPlaylistModel } from '../video/video-playlist.js';
import { VideoModel } from '../video/video.js';
import { AccountBlocklistModel } from './account-blocklist.js';
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["SUMMARY"] = "SUMMARY";
})(ScopeNames || (ScopeNames = {}));
let AccountModel = AccountModel_1 = class AccountModel extends SequelizeModel {
    static async sendDeleteIfOwned(instance, options) {
        if (!instance.Actor) {
            instance.Actor = await instance.$get('Actor', { transaction: options.transaction });
        }
        await ActorFollowModel.removeFollowsOf(instance.Actor.id, options.transaction);
        if (instance.isOwned()) {
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
    static getSQLAttributes(tableName, aliasPrefix = '') {
        return buildSQLAttributes({
            model: this,
            tableName,
            aliasPrefix
        });
    }
    static load(id, transaction) {
        return AccountModel_1.findByPk(id, { transaction });
    }
    static loadByHandle(handle) {
        const [accountName, host] = handle.split('@');
        if (!host || host === WEBSERVER.HOST)
            return AccountModel_1.loadLocalByName(accountName);
        return AccountModel_1.loadByNameAndHost(accountName, host);
    }
    static loadLocalByName(name) {
        const fun = () => {
            const query = {
                where: {
                    [Op.or]: [
                        {
                            userId: {
                                [Op.ne]: null
                            }
                        },
                        {
                            applicationId: {
                                [Op.ne]: null
                            }
                        }
                    ]
                },
                include: [
                    {
                        model: ActorModel,
                        required: true,
                        where: ActorModel.wherePreferredUsername(name)
                    }
                ]
            };
            return AccountModel_1.findOne(query);
        };
        return ModelCache.Instance.doCache({
            cacheType: 'server-account',
            key: name,
            fun,
            whitelist: () => name === SERVER_ACTOR_NAME
        });
    }
    static loadByNameAndHost(name, host) {
        const query = {
            include: [
                {
                    model: ActorModel,
                    required: true,
                    where: ActorModel.wherePreferredUsername(name),
                    include: [
                        {
                            model: ServerModel,
                            required: true,
                            where: {
                                host
                            }
                        }
                    ]
                }
            ]
        };
        return AccountModel_1.findOne(query);
    }
    static loadByUrl(url, transaction) {
        const query = {
            include: [
                {
                    model: ActorModel,
                    required: true,
                    where: {
                        url
                    }
                }
            ],
            transaction
        };
        return AccountModel_1.findOne(query);
    }
    static listForApi(start, count, sort) {
        const query = {
            offset: start,
            limit: count,
            order: getSort(sort)
        };
        return Promise.all([
            AccountModel_1.count(),
            AccountModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static loadAccountIdFromVideo(videoId) {
        const query = {
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
        };
        return AccountModel_1.findOne(query);
    }
    static listLocalsForSitemap(sort) {
        return AccountModel_1.unscoped().findAll({
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
                },
                {
                    attributes: ['id'],
                    model: VideoChannelModel.unscoped(),
                    required: true,
                    where: {
                        [Op.and]: [
                            literal(`EXISTS (SELECT 1 FROM "video" WHERE "privacy" = ${VideoPrivacy.PUBLIC} AND "channelId" = "VideoChannels"."id")`)
                        ]
                    }
                }
            ]
        });
    }
    toFormattedJSON() {
        var _a;
        return Object.assign(Object.assign({}, this.Actor.toFormattedJSON(false)), { id: this.id, displayName: this.getDisplayName(), description: this.description, updatedAt: this.updatedAt, userId: (_a = this.userId) !== null && _a !== void 0 ? _a : undefined });
    }
    toFormattedSummaryJSON() {
        const actor = this.Actor.toFormattedSummaryJSON();
        return {
            id: this.id,
            displayName: this.getDisplayName(),
            name: actor.name,
            url: actor.url,
            host: actor.host,
            avatars: actor.avatars
        };
    }
    async toActivityPubObject() {
        const obj = await this.Actor.toActivityPubObject(this.name);
        return Object.assign(obj, {
            url: this.Actor.url,
            summary: this.description
        });
    }
    isOwned() {
        return this.Actor.isOwned();
    }
    isOutdated() {
        return this.Actor.isOutdated();
    }
    getDisplayName() {
        return this.name;
    }
    getClientUrl(channelsSuffix = true) {
        const suffix = channelsSuffix
            ? '/video-channels'
            : '';
        return WEBSERVER.URL + '/a/' + this.Actor.getIdentifier() + suffix;
    }
    isBlocked() {
        return this.BlockedBy && this.BlockedBy.length !== 0;
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], AccountModel.prototype, "name", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('AccountDescription', value => throwIfNotValid(value, isAccountDescriptionValid, 'description', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.USERS.DESCRIPTION.max)),
    __metadata("design:type", String)
], AccountModel.prototype, "description", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], AccountModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], AccountModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => ActorModel),
    Column,
    __metadata("design:type", Number)
], AccountModel.prototype, "actorId", void 0);
__decorate([
    BelongsTo(() => ActorModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], AccountModel.prototype, "Actor", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], AccountModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], AccountModel.prototype, "User", void 0);
__decorate([
    ForeignKey(() => ApplicationModel),
    Column,
    __metadata("design:type", Number)
], AccountModel.prototype, "applicationId", void 0);
__decorate([
    BelongsTo(() => ApplicationModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], AccountModel.prototype, "Application", void 0);
__decorate([
    HasMany(() => VideoChannelModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Array)
], AccountModel.prototype, "VideoChannels", void 0);
__decorate([
    HasMany(() => VideoPlaylistModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Array)
], AccountModel.prototype, "VideoPlaylists", void 0);
__decorate([
    HasMany(() => VideoCommentModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Array)
], AccountModel.prototype, "VideoComments", void 0);
__decorate([
    HasMany(() => AccountBlocklistModel, {
        foreignKey: {
            name: 'targetAccountId',
            allowNull: false
        },
        as: 'BlockedBy',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], AccountModel.prototype, "BlockedBy", void 0);
__decorate([
    HasMany(() => AccountAutomaticTagPolicyModel, {
        foreignKey: {
            name: 'accountId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], AccountModel.prototype, "AccountAutomaticTagPolicies", void 0);
__decorate([
    HasMany(() => CommentAutomaticTagModel, {
        foreignKey: 'accountId',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], AccountModel.prototype, "CommentAutomaticTags", void 0);
__decorate([
    HasMany(() => VideoAutomaticTagModel, {
        foreignKey: 'accountId',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], AccountModel.prototype, "VideoAutomaticTags", void 0);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccountModel, Object]),
    __metadata("design:returntype", Promise)
], AccountModel, "sendDeleteIfOwned", null);
__decorate([
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccountModel, Object]),
    __metadata("design:returntype", Promise)
], AccountModel, "deleteActorIfRemote", null);
AccountModel = AccountModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: ActorModel,
                required: true
            }
        ]
    })),
    Scopes(() => ({
        [ScopeNames.SUMMARY]: (options = {}) => {
            var _a;
            const serverInclude = {
                attributes: ['host'],
                model: ServerModel.unscoped(),
                required: !!options.whereServer,
                where: options.whereServer
            };
            const actorInclude = {
                attributes: ['id', 'preferredUsername', 'url', 'serverId'],
                model: ActorModel.unscoped(),
                required: (_a = options.actorRequired) !== null && _a !== void 0 ? _a : true,
                where: options.whereActor,
                include: [serverInclude]
            };
            if (options.forCount !== true) {
                actorInclude.include.push({
                    model: ActorImageModel,
                    as: 'Avatars',
                    required: false
                });
            }
            const queryInclude = [
                actorInclude
            ];
            const query = {
                attributes: ['id', 'name', 'actorId']
            };
            if (options.withAccountBlockerIds) {
                queryInclude.push({
                    attributes: ['id'],
                    model: AccountBlocklistModel.unscoped(),
                    as: 'BlockedBy',
                    required: false,
                    where: {
                        accountId: {
                            [Op.in]: options.withAccountBlockerIds
                        }
                    }
                });
                serverInclude.include = [
                    {
                        attributes: ['id'],
                        model: ServerBlocklistModel.unscoped(),
                        required: false,
                        where: {
                            accountId: {
                                [Op.in]: options.withAccountBlockerIds
                            }
                        }
                    }
                ];
            }
            query.include = queryInclude;
            return query;
        }
    })),
    Table({
        tableName: 'account',
        indexes: [
            {
                fields: ['actorId'],
                unique: true
            },
            {
                fields: ['applicationId']
            },
            {
                fields: ['userId']
            }
        ]
    })
], AccountModel);
export { AccountModel };
//# sourceMappingURL=account.js.map