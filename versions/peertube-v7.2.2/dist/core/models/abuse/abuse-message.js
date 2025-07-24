var AbuseMessageModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isAbuseMessageValid } from '../../helpers/custom-validators/abuses.js';
import { AccountModel, ScopeNames as AccountScopeNames } from '../account/account.js';
import { SequelizeModel, getSort, throwIfNotValid } from '../shared/index.js';
import { AbuseModel } from './abuse.js';
let AbuseMessageModel = AbuseMessageModel_1 = class AbuseMessageModel extends SequelizeModel {
    static listForApi(abuseId) {
        const getQuery = (forCount) => {
            const query = {
                where: { abuseId },
                order: getSort('createdAt')
            };
            if (forCount !== true) {
                query.include = [
                    {
                        model: AccountModel.scope(AccountScopeNames.SUMMARY),
                        required: false
                    }
                ];
            }
            return query;
        };
        return Promise.all([
            AbuseMessageModel_1.count(getQuery(true)),
            AbuseMessageModel_1.findAll(getQuery(false))
        ]).then(([total, data]) => ({ total, data }));
    }
    static loadByIdAndAbuseId(messageId, abuseId) {
        return AbuseMessageModel_1.findOne({
            where: {
                id: messageId,
                abuseId
            }
        });
    }
    toFormattedJSON() {
        const account = this.Account
            ? this.Account.toFormattedSummaryJSON()
            : null;
        return {
            id: this.id,
            createdAt: this.createdAt,
            byModerator: this.byModerator,
            message: this.message,
            account
        };
    }
};
__decorate([
    AllowNull(false),
    Is('AbuseMessage', value => throwIfNotValid(value, isAbuseMessageValid, 'message')),
    Column(DataType.TEXT),
    __metadata("design:type", String)
], AbuseMessageModel.prototype, "message", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], AbuseMessageModel.prototype, "byModerator", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], AbuseMessageModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], AbuseMessageModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], AbuseMessageModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            name: 'accountId',
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], AbuseMessageModel.prototype, "Account", void 0);
__decorate([
    ForeignKey(() => AbuseModel),
    Column,
    __metadata("design:type", Number)
], AbuseMessageModel.prototype, "abuseId", void 0);
__decorate([
    BelongsTo(() => AbuseModel, {
        foreignKey: {
            name: 'abuseId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], AbuseMessageModel.prototype, "Abuse", void 0);
AbuseMessageModel = AbuseMessageModel_1 = __decorate([
    Table({
        tableName: 'abuseMessage',
        indexes: [
            {
                fields: ['abuseId']
            },
            {
                fields: ['accountId']
            }
        ]
    })
], AbuseMessageModel);
export { AbuseMessageModel };
//# sourceMappingURL=abuse-message.js.map