import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { AccountModel } from '../account/account.js';
import { SequelizeModel, createSafeIn, doesExist } from '../shared/index.js';
import { AutomaticTagModel } from './automatic-tag.js';
let AccountAutomaticTagPolicyModel = class AccountAutomaticTagPolicyModel extends SequelizeModel {
    static async listOfAccount(account) {
        const rows = await this.findAll({
            where: { accountId: account.id },
            include: [
                {
                    model: AutomaticTagModel,
                    required: true
                }
            ]
        });
        return rows.map(r => ({ name: r.AutomaticTag.name, policy: r.policy }));
    }
    static deleteOfAccount(options) {
        const { account, policy, transaction } = options;
        return this.destroy({
            where: { accountId: account.id, policy },
            transaction
        });
    }
    static hasPolicyOnTags(options) {
        const { accountId, tags, policy, transaction } = options;
        const query = `SELECT 1 FROM "accountAutomaticTagPolicy" ` +
            `INNER JOIN "automaticTag" ON "automaticTag"."id" = "accountAutomaticTagPolicy"."automaticTagId" ` +
            `WHERE "accountId" = $accountId AND "accountAutomaticTagPolicy"."policy" = $policy AND ` +
            `"automaticTag"."name" IN (${createSafeIn(this.sequelize, tags)}) ` +
            `LIMIT 1`;
        return doesExist({ sequelize: this.sequelize, query, bind: { accountId, policy }, transaction });
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], AccountAutomaticTagPolicyModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], AccountAutomaticTagPolicyModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], AccountAutomaticTagPolicyModel.prototype, "policy", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], AccountAutomaticTagPolicyModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], AccountAutomaticTagPolicyModel.prototype, "Account", void 0);
__decorate([
    ForeignKey(() => AutomaticTagModel),
    Column,
    __metadata("design:type", Number)
], AccountAutomaticTagPolicyModel.prototype, "automaticTagId", void 0);
__decorate([
    BelongsTo(() => AutomaticTagModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], AccountAutomaticTagPolicyModel.prototype, "AutomaticTag", void 0);
AccountAutomaticTagPolicyModel = __decorate([
    Table({
        tableName: 'accountAutomaticTagPolicy',
        indexes: [
            {
                fields: ['accountId', 'policy', 'automaticTagId'],
                unique: true
            }
        ]
    })
], AccountAutomaticTagPolicyModel);
export { AccountAutomaticTagPolicyModel };
//# sourceMappingURL=account-automatic-tag-policy.js.map