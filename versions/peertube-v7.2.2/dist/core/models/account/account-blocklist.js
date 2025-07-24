var AccountBlocklistModel_1;
import { __decorate, __metadata } from "tslib";
import { Op, QueryTypes } from 'sequelize';
import { BelongsTo, Column, CreatedAt, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { handlesToNameAndHost } from '../../helpers/actors.js';
import { ActorModel } from '../actor/actor.js';
import { ServerModel } from '../server/server.js';
import { SequelizeModel, createSafeIn, getSort, searchAttribute } from '../shared/index.js';
import { AccountModel } from './account.js';
import { WEBSERVER } from '../../initializers/constants.js';
let AccountBlocklistModel = AccountBlocklistModel_1 = class AccountBlocklistModel extends SequelizeModel {
    static isAccountMutedByAccounts(accountIds, targetAccountId) {
        const query = {
            attributes: ['accountId', 'id'],
            where: {
                accountId: {
                    [Op.in]: accountIds
                },
                targetAccountId
            },
            raw: true
        };
        return AccountBlocklistModel_1.unscoped()
            .findAll(query)
            .then(rows => {
            const result = {};
            for (const accountId of accountIds) {
                result[accountId] = !!rows.find(r => r.accountId === accountId);
            }
            return result;
        });
    }
    static loadByAccountAndTarget(accountId, targetAccountId) {
        const query = {
            where: {
                accountId,
                targetAccountId
            }
        };
        return AccountBlocklistModel_1.findOne(query);
    }
    static listForApi(parameters) {
        const { start, count, sort, search, accountId } = parameters;
        const getQuery = (forCount) => {
            const query = {
                offset: start,
                limit: count,
                order: getSort(sort),
                where: { accountId }
            };
            if (search) {
                Object.assign(query.where, {
                    [Op.or]: [
                        searchAttribute(search, '$BlockedAccount.name$'),
                        searchAttribute(search, '$BlockedAccount.Actor.url$')
                    ]
                });
            }
            if (forCount !== true) {
                query.include = [
                    {
                        model: AccountModel,
                        required: true,
                        as: 'ByAccount'
                    },
                    {
                        model: AccountModel,
                        required: true,
                        as: 'BlockedAccount'
                    }
                ];
            }
            else if (search) {
                query.include = [
                    {
                        model: AccountModel.unscoped(),
                        required: true,
                        as: 'BlockedAccount',
                        include: [
                            {
                                model: ActorModel.unscoped(),
                                required: true
                            }
                        ]
                    }
                ];
            }
            return query;
        };
        return Promise.all([
            AccountBlocklistModel_1.count(getQuery(true)),
            AccountBlocklistModel_1.findAll(getQuery(false))
        ]).then(([total, data]) => ({ total, data }));
    }
    static listHandlesBlockedBy(accountIds) {
        const query = {
            attributes: ['id'],
            where: {
                accountId: {
                    [Op.in]: accountIds
                }
            },
            include: [
                {
                    attributes: ['id'],
                    model: AccountModel.unscoped(),
                    required: true,
                    as: 'BlockedAccount',
                    include: [
                        {
                            attributes: ['preferredUsername'],
                            model: ActorModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    attributes: ['host'],
                                    model: ServerModel.unscoped(),
                                    required: false
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        return AccountBlocklistModel_1.findAll(query)
            .then(entries => {
            return entries.map(e => {
                var _a, _b;
                const host = (_b = (_a = e.BlockedAccount.Actor.Server) === null || _a === void 0 ? void 0 : _a.host) !== null && _b !== void 0 ? _b : WEBSERVER.HOST;
                return `${e.BlockedAccount.Actor.preferredUsername}@${host}`;
            });
        });
    }
    static getBlockStatus(byAccountIds, handles) {
        const sanitizedHandles = handlesToNameAndHost(handles);
        const localHandles = sanitizedHandles.filter(h => !h.host)
            .map(h => h.name);
        const remoteHandles = sanitizedHandles.filter(h => !!h.host)
            .map(h => ([h.name, h.host]));
        const handlesWhere = [];
        if (localHandles.length !== 0) {
            handlesWhere.push(`("actor"."preferredUsername" IN (:localHandles) AND "server"."id" IS NULL)`);
        }
        if (remoteHandles.length !== 0) {
            handlesWhere.push(`(("actor"."preferredUsername", "server"."host") IN (:remoteHandles))`);
        }
        const rawQuery = `SELECT "accountBlocklist"."accountId", "actor"."preferredUsername" AS "name", "server"."host" ` +
            `FROM "accountBlocklist" ` +
            `INNER JOIN "account" ON "account"."id" = "accountBlocklist"."targetAccountId" ` +
            `INNER JOIN "actor" ON "actor"."id" = "account"."actorId" ` +
            `LEFT JOIN "server" ON "server"."id" = "actor"."serverId" ` +
            `WHERE "accountBlocklist"."accountId" IN (${createSafeIn(AccountBlocklistModel_1.sequelize, byAccountIds)}) ` +
            `AND (${handlesWhere.join(' OR ')})`;
        return AccountBlocklistModel_1.sequelize.query(rawQuery, {
            type: QueryTypes.SELECT,
            replacements: { byAccountIds, localHandles, remoteHandles }
        });
    }
    toFormattedJSON() {
        return {
            byAccount: this.ByAccount.toFormattedJSON(),
            blockedAccount: this.BlockedAccount.toFormattedJSON(),
            createdAt: this.createdAt
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], AccountBlocklistModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], AccountBlocklistModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], AccountBlocklistModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            name: 'accountId',
            allowNull: false
        },
        as: 'ByAccount',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], AccountBlocklistModel.prototype, "ByAccount", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], AccountBlocklistModel.prototype, "targetAccountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            name: 'targetAccountId',
            allowNull: false
        },
        as: 'BlockedAccount',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], AccountBlocklistModel.prototype, "BlockedAccount", void 0);
AccountBlocklistModel = AccountBlocklistModel_1 = __decorate([
    Table({
        tableName: 'accountBlocklist',
        indexes: [
            {
                fields: ['accountId', 'targetAccountId'],
                unique: true
            },
            {
                fields: ['targetAccountId']
            }
        ]
    })
], AccountBlocklistModel);
export { AccountBlocklistModel };
//# sourceMappingURL=account-blocklist.js.map