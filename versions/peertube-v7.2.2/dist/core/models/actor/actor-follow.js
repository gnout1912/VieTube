var ActorFollowModel_1;
import { __decorate, __metadata } from "tslib";
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { afterCommitIfTransaction } from '../../helpers/database-utils.js';
import { getServerActor } from '../application/application.js';
import difference from 'lodash-es/difference.js';
import { Op, QueryTypes } from 'sequelize';
import { AfterCreate, AfterDestroy, AfterUpdate, AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, Is, IsInt, Max, Table, UpdatedAt } from 'sequelize-typescript';
import { logger } from '../../helpers/logger.js';
import { ACTOR_FOLLOW_SCORE, CONSTRAINTS_FIELDS, FOLLOW_STATES, SERVER_ACTOR_NAME, SORTABLE_COLUMNS, USER_EXPORT_MAX_ITEMS } from '../../initializers/constants.js';
import { AccountModel } from '../account/account.js';
import { ServerModel } from '../server/server.js';
import { SequelizeModel, buildSQLAttributes, createSafeIn, getSubscriptionSort, searchAttribute, throwIfNotValid } from '../shared/index.js';
import { doesExist } from '../shared/query.js';
import { VideoChannelModel } from '../video/video-channel.js';
import { ActorModel, unusedActorAttributesForAPI } from './actor.js';
import { InstanceListFollowersQueryBuilder } from './sql/instance-list-followers-query-builder.js';
import { InstanceListFollowingQueryBuilder } from './sql/instance-list-following-query-builder.js';
let ActorFollowModel = ActorFollowModel_1 = class ActorFollowModel extends SequelizeModel {
    static incrementFollowerAndFollowingCount(instance, options) {
        return afterCommitIfTransaction(options.transaction, () => {
            return Promise.all([
                ActorModel.rebuildFollowsCount(instance.actorId, 'following'),
                ActorModel.rebuildFollowsCount(instance.targetActorId, 'followers')
            ]);
        });
    }
    static decrementFollowerAndFollowingCount(instance, options) {
        return afterCommitIfTransaction(options.transaction, () => {
            return Promise.all([
                ActorModel.rebuildFollowsCount(instance.actorId, 'following'),
                ActorModel.rebuildFollowsCount(instance.targetActorId, 'followers')
            ]);
        });
    }
    static getSQLAttributes(tableName, aliasPrefix = '') {
        return buildSQLAttributes({
            model: this,
            tableName,
            aliasPrefix
        });
    }
    static findOrCreate() {
        throw new Error('Must not be called');
    }
    static async findOrCreateCustom(options) {
        const { byActor, targetActor, activityId, state, transaction } = options;
        let created = false;
        let actorFollow = await ActorFollowModel_1.loadByActorAndTarget(byActor.id, targetActor.id, transaction);
        if (!actorFollow) {
            created = true;
            actorFollow = await ActorFollowModel_1.create({
                actorId: byActor.id,
                targetActorId: targetActor.id,
                url: activityId,
                state
            }, { transaction });
            actorFollow.ActorFollowing = targetActor;
            actorFollow.ActorFollower = byActor;
        }
        return [actorFollow, created];
    }
    static removeFollowsOf(actorId, t) {
        const query = {
            where: {
                [Op.or]: [
                    {
                        actorId
                    },
                    {
                        targetActorId: actorId
                    }
                ]
            },
            transaction: t
        };
        return ActorFollowModel_1.destroy(query);
    }
    static async removeBadActorFollows() {
        const actorFollows = await ActorFollowModel_1.listBadActorFollows();
        const actorFollowsRemovePromises = actorFollows.map(actorFollow => actorFollow.destroy());
        await Promise.all(actorFollowsRemovePromises);
        const numberOfActorFollowsRemoved = actorFollows.length;
        if (numberOfActorFollowsRemoved)
            logger.info('Removed bad %d actor follows.', numberOfActorFollowsRemoved);
    }
    static isFollowedBy(actorId, followerActorId) {
        const query = `SELECT 1 FROM "actorFollow" ` +
            `WHERE "actorId" = $followerActorId AND "targetActorId" = $actorId AND "state" = 'accepted' ` +
            `LIMIT 1`;
        return doesExist({ sequelize: this.sequelize, query, bind: { actorId, followerActorId } });
    }
    static loadByActorAndTarget(actorId, targetActorId, t) {
        const query = {
            where: {
                actorId,
                targetActorId
            },
            include: [
                {
                    model: ActorModel,
                    required: true,
                    as: 'ActorFollower'
                },
                {
                    model: ActorModel,
                    required: true,
                    as: 'ActorFollowing'
                }
            ],
            transaction: t
        };
        return ActorFollowModel_1.findOne(query);
    }
    static loadByActorAndTargetNameAndHostForAPI(options) {
        const { actorId, targetHost, targetName, state, transaction } = options;
        const actorFollowingPartInclude = {
            model: ActorModel,
            required: true,
            as: 'ActorFollowing',
            where: ActorModel.wherePreferredUsername(targetName),
            include: [
                {
                    model: VideoChannelModel.unscoped(),
                    required: false
                }
            ]
        };
        if (targetHost === null) {
            actorFollowingPartInclude.where['serverId'] = null;
        }
        else {
            actorFollowingPartInclude.include.push({
                model: ServerModel,
                required: true,
                where: {
                    host: targetHost
                }
            });
        }
        const where = { actorId };
        if (state)
            where.state = state;
        const query = {
            where,
            include: [
                actorFollowingPartInclude,
                {
                    model: ActorModel,
                    required: true,
                    as: 'ActorFollower'
                }
            ],
            transaction
        };
        return ActorFollowModel_1.findOne(query);
    }
    static listSubscriptionsOf(actorId, targets) {
        const whereTab = targets
            .map(t => {
            if (t.host) {
                return {
                    [Op.and]: [
                        ActorModel.wherePreferredUsername(t.name),
                        { $host$: t.host }
                    ]
                };
            }
            return {
                [Op.and]: [
                    ActorModel.wherePreferredUsername(t.name),
                    { $serverId$: null }
                ]
            };
        });
        const query = {
            attributes: ['id'],
            where: {
                [Op.and]: [
                    {
                        [Op.or]: whereTab
                    },
                    {
                        state: 'accepted',
                        actorId
                    }
                ]
            },
            include: [
                {
                    attributes: ['preferredUsername'],
                    model: ActorModel.unscoped(),
                    required: true,
                    as: 'ActorFollowing',
                    include: [
                        {
                            attributes: ['host'],
                            model: ServerModel.unscoped(),
                            required: false
                        }
                    ]
                }
            ]
        };
        return ActorFollowModel_1.findAll(query);
    }
    static listInstanceFollowingForApi(options) {
        return Promise.all([
            new InstanceListFollowingQueryBuilder(this.sequelize, options).countFollowing(),
            new InstanceListFollowingQueryBuilder(this.sequelize, options).listFollowing()
        ]).then(([total, data]) => ({ total, data }));
    }
    static listFollowersForApi(options) {
        return Promise.all([
            new InstanceListFollowersQueryBuilder(this.sequelize, options).countFollowers(),
            new InstanceListFollowersQueryBuilder(this.sequelize, options).listFollowers()
        ]).then(([total, data]) => ({ total, data }));
    }
    static listSubscriptionsForApi(options) {
        const { actorId, start, count, sort } = options;
        const where = {
            state: 'accepted',
            actorId
        };
        if (options.search) {
            Object.assign(where, {
                [Op.or]: [
                    searchAttribute(options.search, '$ActorFollowing.preferredUsername$'),
                    searchAttribute(options.search, '$ActorFollowing.VideoChannel.name$')
                ]
            });
        }
        const getQuery = (forCount) => {
            let channelInclude = [];
            if (forCount !== true) {
                channelInclude = [
                    {
                        attributes: {
                            exclude: unusedActorAttributesForAPI
                        },
                        model: ActorModel,
                        required: true
                    },
                    {
                        model: AccountModel.unscoped(),
                        required: true,
                        include: [
                            {
                                attributes: {
                                    exclude: unusedActorAttributesForAPI
                                },
                                model: ActorModel,
                                required: true
                            }
                        ]
                    }
                ];
            }
            return {
                attributes: forCount === true
                    ? []
                    : SORTABLE_COLUMNS.USER_SUBSCRIPTIONS.filter(s => s !== 'channelUpdatedAt'),
                distinct: true,
                offset: start,
                limit: count,
                order: getSubscriptionSort(sort),
                where,
                include: [
                    {
                        attributes: ['id'],
                        model: ActorModel.unscoped(),
                        as: 'ActorFollowing',
                        required: true,
                        include: [
                            {
                                model: VideoChannelModel.unscoped(),
                                required: true,
                                include: channelInclude
                            }
                        ]
                    }
                ]
            };
        };
        return Promise.all([
            ActorFollowModel_1.count(getQuery(true)),
            ActorFollowModel_1.findAll(getQuery(false))
        ]).then(([total, rows]) => ({
            total,
            data: rows.map(r => r.ActorFollowing.VideoChannel)
        }));
    }
    static async keepUnfollowedInstance(hosts) {
        const followerId = (await getServerActor()).id;
        const query = {
            attributes: ['id'],
            where: {
                actorId: followerId
            },
            include: [
                {
                    attributes: ['id'],
                    model: ActorModel.unscoped(),
                    required: true,
                    as: 'ActorFollowing',
                    where: {
                        preferredUsername: SERVER_ACTOR_NAME
                    },
                    include: [
                        {
                            attributes: ['host'],
                            model: ServerModel.unscoped(),
                            required: true,
                            where: {
                                host: {
                                    [Op.in]: hosts
                                }
                            }
                        }
                    ]
                }
            ]
        };
        const res = await ActorFollowModel_1.findAll(query);
        const followedHosts = res.map(row => row.ActorFollowing.Server.host);
        return difference(hosts, followedHosts);
    }
    static listAcceptedFollowerUrlsForAP(actorIds, t, start, count) {
        return ActorFollowModel_1.createListAcceptedFollowForApiQuery({ type: 'followers', actorIds, t, start, count })
            .then(({ data, total }) => ({ total, data: data.map(d => d.selectionUrl) }));
    }
    static listAcceptedFollowerSharedInboxUrls(actorIds, t) {
        return ActorFollowModel_1.createListAcceptedFollowForApiQuery({
            type: 'followers',
            actorIds,
            t,
            columnUrl: 'sharedInboxUrl',
            distinct: true
        }).then(({ data, total }) => ({ total, data: data.map(d => d.selectionUrl) }));
    }
    static async listAcceptedFollowersForExport(targetActorId) {
        const data = await ActorFollowModel_1.findAll({
            where: {
                state: 'accepted',
                targetActorId
            },
            include: [
                {
                    attributes: ['preferredUsername', 'url'],
                    model: ActorModel.unscoped(),
                    required: true,
                    as: 'ActorFollower',
                    include: [
                        {
                            attributes: ['host'],
                            model: ServerModel.unscoped(),
                            required: false
                        }
                    ]
                }
            ],
            limit: USER_EXPORT_MAX_ITEMS
        });
        return data.map(f => ({
            createdAt: f.createdAt,
            followerHandle: f.ActorFollower.getFullIdentifier(),
            followerUrl: f.ActorFollower.url
        }));
    }
    static listAcceptedFollowingUrlsForApi(actorIds, t, start, count) {
        return ActorFollowModel_1.createListAcceptedFollowForApiQuery({ type: 'following', actorIds, t, start, count })
            .then(({ data, total }) => ({ total, data: data.map(d => d.selectionUrl) }));
    }
    static async listAcceptedFollowingForExport(actorId) {
        const data = await ActorFollowModel_1.findAll({
            where: {
                state: 'accepted',
                actorId
            },
            include: [
                {
                    attributes: ['preferredUsername', 'url'],
                    model: ActorModel.unscoped(),
                    required: true,
                    as: 'ActorFollowing',
                    include: [
                        {
                            attributes: ['host'],
                            model: ServerModel.unscoped(),
                            required: false
                        }
                    ]
                }
            ],
            limit: USER_EXPORT_MAX_ITEMS
        });
        return data.map(f => ({
            createdAt: f.createdAt,
            followingHandle: f.ActorFollowing.getFullIdentifier(),
            followingUrl: f.ActorFollowing.url
        }));
    }
    static async getStats() {
        const serverActor = await getServerActor();
        const totalInstanceFollowing = await ActorFollowModel_1.count({
            where: {
                actorId: serverActor.id,
                state: 'accepted'
            }
        });
        const totalInstanceFollowers = await ActorFollowModel_1.count({
            where: {
                targetActorId: serverActor.id,
                state: 'accepted'
            }
        });
        return {
            totalInstanceFollowing,
            totalInstanceFollowers
        };
    }
    static updateScore(inboxUrl, value, t) {
        const query = `UPDATE "actorFollow" SET "score" = LEAST("score" + ${value}, ${ACTOR_FOLLOW_SCORE.MAX}) ` +
            'WHERE id IN (' +
            'SELECT "actorFollow"."id" FROM "actorFollow" ' +
            'INNER JOIN "actor" ON "actor"."id" = "actorFollow"."actorId" ' +
            `WHERE "actor"."inboxUrl" = '${inboxUrl}' OR "actor"."sharedInboxUrl" = '${inboxUrl}'` +
            ')';
        const options = {
            type: QueryTypes.BULKUPDATE,
            transaction: t
        };
        return ActorFollowModel_1.sequelize.query(query, options);
    }
    static async updateScoreByFollowingServers(serverIds, value, t) {
        if (serverIds.length === 0)
            return;
        const me = await getServerActor();
        const serverIdsString = createSafeIn(ActorFollowModel_1.sequelize, serverIds);
        const query = `UPDATE "actorFollow" SET "score" = LEAST("score" + ${value}, ${ACTOR_FOLLOW_SCORE.MAX}) ` +
            'WHERE id IN (' +
            'SELECT "actorFollow"."id" FROM "actorFollow" ' +
            'INNER JOIN "actor" ON "actor"."id" = "actorFollow"."targetActorId" ' +
            `WHERE "actorFollow"."actorId" = ${me.Account.actorId} ` +
            `AND "actor"."serverId" IN (${serverIdsString})` +
            ')';
        const options = {
            type: QueryTypes.BULKUPDATE,
            transaction: t
        };
        return ActorFollowModel_1.sequelize.query(query, options);
    }
    static async createListAcceptedFollowForApiQuery(options) {
        var _a;
        const { type, actorIds, t, start, count, columnUrl = 'url', distinct = false, selectTotal = true } = options;
        let firstJoin;
        let secondJoin;
        if (type === 'followers') {
            firstJoin = 'targetActorId';
            secondJoin = 'actorId';
        }
        else {
            firstJoin = 'actorId';
            secondJoin = 'targetActorId';
        }
        const selections = [];
        selections.push(distinct === true
            ? `DISTINCT("Follows"."${columnUrl}") AS "selectionUrl"`
            : `"Follows"."${columnUrl}" AS "selectionUrl"`);
        if (selectTotal)
            selections.push('COUNT(*) AS "total"');
        const tasks = [];
        for (const selection of selections) {
            let query = 'SELECT ' + selection + ' FROM "actor" ' +
                'INNER JOIN "actorFollow" ON "actorFollow"."' + firstJoin + '" = "actor"."id" ' +
                'INNER JOIN "actor" AS "Follows" ON "actorFollow"."' + secondJoin + '" = "Follows"."id" ' +
                `WHERE "actor"."id" = ANY ($actorIds) AND "actorFollow"."state" = 'accepted' AND "Follows"."${columnUrl}" IS NOT NULL `;
            if (count !== undefined)
                query += 'LIMIT ' + count;
            if (start !== undefined)
                query += ' OFFSET ' + start;
            const options = {
                bind: { actorIds },
                type: QueryTypes.SELECT,
                transaction: t
            };
            tasks.push(ActorFollowModel_1.sequelize.query(query, options));
        }
        const [followers, resDataTotal] = await Promise.all(tasks);
        return {
            data: followers.map(f => ({ selectionUrl: f.selectionUrl, createdAt: f.createdAt })),
            total: selectTotal
                ? parseInt(((_a = resDataTotal === null || resDataTotal === void 0 ? void 0 : resDataTotal[0]) === null || _a === void 0 ? void 0 : _a.total) || 0, 10)
                : undefined
        };
    }
    static listBadActorFollows() {
        const query = {
            where: {
                score: {
                    [Op.lte]: 0
                }
            },
            logging: false
        };
        return ActorFollowModel_1.findAll(query);
    }
    toFormattedJSON() {
        const follower = this.ActorFollower.toFormattedJSON();
        const following = this.ActorFollowing.toFormattedJSON();
        return {
            id: this.id,
            follower,
            following,
            score: this.score,
            state: this.state,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
};
__decorate([
    AllowNull(false),
    Column(DataType.ENUM(...Object.values(FOLLOW_STATES))),
    __metadata("design:type", String)
], ActorFollowModel.prototype, "state", void 0);
__decorate([
    AllowNull(false),
    Default(ACTOR_FOLLOW_SCORE.BASE),
    IsInt,
    Max(ACTOR_FOLLOW_SCORE.MAX),
    Column,
    __metadata("design:type", Number)
], ActorFollowModel.prototype, "score", void 0);
__decorate([
    AllowNull(true),
    Is('ActorFollowUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.COMMONS.URL.max)),
    __metadata("design:type", String)
], ActorFollowModel.prototype, "url", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], ActorFollowModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], ActorFollowModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => ActorModel),
    Column,
    __metadata("design:type", Number)
], ActorFollowModel.prototype, "actorId", void 0);
__decorate([
    BelongsTo(() => ActorModel, {
        foreignKey: {
            name: 'actorId',
            allowNull: false
        },
        as: 'ActorFollower',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], ActorFollowModel.prototype, "ActorFollower", void 0);
__decorate([
    ForeignKey(() => ActorModel),
    Column,
    __metadata("design:type", Number)
], ActorFollowModel.prototype, "targetActorId", void 0);
__decorate([
    BelongsTo(() => ActorModel, {
        foreignKey: {
            name: 'targetActorId',
            allowNull: false
        },
        as: 'ActorFollowing',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], ActorFollowModel.prototype, "ActorFollowing", void 0);
__decorate([
    AfterCreate,
    AfterUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ActorFollowModel, Object]),
    __metadata("design:returntype", void 0)
], ActorFollowModel, "incrementFollowerAndFollowingCount", null);
__decorate([
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ActorFollowModel, Object]),
    __metadata("design:returntype", void 0)
], ActorFollowModel, "decrementFollowerAndFollowingCount", null);
ActorFollowModel = ActorFollowModel_1 = __decorate([
    Table({
        tableName: 'actorFollow',
        indexes: [
            {
                fields: ['actorId']
            },
            {
                fields: ['targetActorId']
            },
            {
                fields: ['actorId', 'targetActorId'],
                unique: true
            },
            {
                fields: ['score']
            },
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], ActorFollowModel);
export { ActorFollowModel };
//# sourceMappingURL=actor-follow.js.map