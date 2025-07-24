var RunnerRegistrationTokenModel_1;
import { __decorate, __metadata } from "tslib";
import { literal } from 'sequelize';
import { AllowNull, Column, CreatedAt, HasMany, Table, UpdatedAt } from 'sequelize-typescript';
import { SequelizeModel, getSort } from '../shared/index.js';
import { RunnerModel } from './runner.js';
let RunnerRegistrationTokenModel = RunnerRegistrationTokenModel_1 = class RunnerRegistrationTokenModel extends SequelizeModel {
    static load(id) {
        return RunnerRegistrationTokenModel_1.findByPk(id);
    }
    static loadByRegistrationToken(registrationToken) {
        const query = {
            where: { registrationToken }
        };
        return RunnerRegistrationTokenModel_1.findOne(query);
    }
    static countTotal() {
        return RunnerRegistrationTokenModel_1.unscoped().count();
    }
    static listForApi(options) {
        const { start, count, sort } = options;
        const query = {
            attributes: {
                include: [
                    [
                        literal('(SELECT COUNT(*) FROM "runner" WHERE "runner"."runnerRegistrationTokenId" = "RunnerRegistrationTokenModel"."id")'),
                        'registeredRunnersCount'
                    ]
                ]
            },
            offset: start,
            limit: count,
            order: getSort(sort)
        };
        return Promise.all([
            RunnerRegistrationTokenModel_1.count(query),
            RunnerRegistrationTokenModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    toFormattedJSON() {
        const registeredRunnersCount = this.get('registeredRunnersCount');
        return {
            id: this.id,
            registrationToken: this.registrationToken,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            registeredRunnersCount
        };
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], RunnerRegistrationTokenModel.prototype, "registrationToken", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], RunnerRegistrationTokenModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], RunnerRegistrationTokenModel.prototype, "updatedAt", void 0);
__decorate([
    HasMany(() => RunnerModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], RunnerRegistrationTokenModel.prototype, "Runners", void 0);
RunnerRegistrationTokenModel = RunnerRegistrationTokenModel_1 = __decorate([
    Table({
        tableName: 'runnerRegistrationToken',
        indexes: [
            {
                fields: ['registrationToken'],
                unique: true
            }
        ]
    })
], RunnerRegistrationTokenModel);
export { RunnerRegistrationTokenModel };
//# sourceMappingURL=runner-registration-token.js.map