var ServerBlocklistModel_1;
import { __decorate, __metadata } from "tslib";
import { Op, QueryTypes } from 'sequelize';
import { BelongsTo, Column, CreatedAt, ForeignKey, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { AccountModel } from '../account/account.js';
import { SequelizeModel, createSafeIn, getSort, searchAttribute } from '../shared/index.js';
import { ServerModel } from './server.js';
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["WITH_ACCOUNT"] = "WITH_ACCOUNT";
    ScopeNames["WITH_SERVER"] = "WITH_SERVER";
})(ScopeNames || (ScopeNames = {}));
let ServerBlocklistModel = ServerBlocklistModel_1 = class ServerBlocklistModel extends SequelizeModel {
    static isServerMutedByAccounts(accountIds, targetServerId) {
        const query = {
            attributes: ['accountId', 'id'],
            where: {
                accountId: {
                    [Op.in]: accountIds
                },
                targetServerId
            },
            raw: true
        };
        return ServerBlocklistModel_1.unscoped()
            .findAll(query)
            .then(rows => {
            const result = {};
            for (const accountId of accountIds) {
                result[accountId] = !!rows.find(r => r.accountId === accountId);
            }
            return result;
        });
    }
    static loadByAccountAndHost(accountId, host) {
        const query = {
            where: {
                accountId
            },
            include: [
                {
                    model: ServerModel,
                    where: {
                        host
                    },
                    required: true
                }
            ]
        };
        return ServerBlocklistModel_1.findOne(query);
    }
    static listHostsBlockedBy(accountIds) {
        const query = {
            attributes: [],
            where: {
                accountId: {
                    [Op.in]: accountIds
                }
            },
            include: [
                {
                    attributes: ['host'],
                    model: ServerModel.unscoped(),
                    required: true
                }
            ]
        };
        return ServerBlocklistModel_1.findAll(query)
            .then(entries => entries.map(e => e.BlockedServer.host));
    }
    static getBlockStatus(byAccountIds, hosts) {
        const rawQuery = `SELECT "server"."host", "serverBlocklist"."accountId" ` +
            `FROM "serverBlocklist" ` +
            `INNER JOIN "server" ON "server"."id" = "serverBlocklist"."targetServerId" ` +
            `WHERE "server"."host" IN (:hosts) ` +
            `AND "serverBlocklist"."accountId" IN (${createSafeIn(ServerBlocklistModel_1.sequelize, byAccountIds)})`;
        return ServerBlocklistModel_1.sequelize.query(rawQuery, {
            type: QueryTypes.SELECT,
            replacements: { hosts }
        });
    }
    static listForApi(parameters) {
        const { start, count, sort, search, accountId } = parameters;
        const query = {
            offset: start,
            limit: count,
            order: getSort(sort),
            where: Object.assign({ accountId }, searchAttribute(search, '$BlockedServer.host$'))
        };
        return Promise.all([
            ServerBlocklistModel_1.scope(ScopeNames.WITH_SERVER).count(query),
            ServerBlocklistModel_1.scope([ScopeNames.WITH_ACCOUNT, ScopeNames.WITH_SERVER]).findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    toFormattedJSON() {
        return {
            byAccount: this.ByAccount.toFormattedJSON(),
            blockedServer: this.BlockedServer.toFormattedJSON(),
            createdAt: this.createdAt
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], ServerBlocklistModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], ServerBlocklistModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], ServerBlocklistModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            name: 'accountId',
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], ServerBlocklistModel.prototype, "ByAccount", void 0);
__decorate([
    ForeignKey(() => ServerModel),
    Column,
    __metadata("design:type", Number)
], ServerBlocklistModel.prototype, "targetServerId", void 0);
__decorate([
    BelongsTo(() => ServerModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], ServerBlocklistModel.prototype, "BlockedServer", void 0);
ServerBlocklistModel = ServerBlocklistModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.WITH_ACCOUNT]: {
            include: [
                {
                    model: AccountModel,
                    required: true
                }
            ]
        },
        [ScopeNames.WITH_SERVER]: {
            include: [
                {
                    model: ServerModel,
                    required: true
                }
            ]
        }
    })),
    Table({
        tableName: 'serverBlocklist',
        indexes: [
            {
                fields: ['accountId', 'targetServerId'],
                unique: true
            },
            {
                fields: ['targetServerId']
            }
        ]
    })
], ServerBlocklistModel);
export { ServerBlocklistModel };
//# sourceMappingURL=server-blocklist.js.map