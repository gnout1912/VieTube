var RunnerModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { SequelizeModel, getSort } from '../shared/index.js';
import { RunnerRegistrationTokenModel } from './runner-registration-token.js';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
let RunnerModel = RunnerModel_1 = class RunnerModel extends SequelizeModel {
    static load(id) {
        return RunnerModel_1.findByPk(id);
    }
    static loadByToken(runnerToken) {
        const query = {
            where: { runnerToken }
        };
        return RunnerModel_1.findOne(query);
    }
    static loadByName(name) {
        const query = {
            where: { name }
        };
        return RunnerModel_1.findOne(query);
    }
    static listForApi(options) {
        const { start, count, sort } = options;
        const query = {
            offset: start,
            limit: count,
            order: getSort(sort)
        };
        return Promise.all([
            RunnerModel_1.count(query),
            RunnerModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    toFormattedJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            ip: this.ip,
            lastContact: this.lastContact,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], RunnerModel.prototype, "runnerToken", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], RunnerModel.prototype, "name", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.RUNNERS.DESCRIPTION.max)),
    __metadata("design:type", String)
], RunnerModel.prototype, "description", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Date)
], RunnerModel.prototype, "lastContact", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], RunnerModel.prototype, "ip", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], RunnerModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], RunnerModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => RunnerRegistrationTokenModel),
    Column,
    __metadata("design:type", Number)
], RunnerModel.prototype, "runnerRegistrationTokenId", void 0);
__decorate([
    BelongsTo(() => RunnerRegistrationTokenModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], RunnerModel.prototype, "RunnerRegistrationToken", void 0);
RunnerModel = RunnerModel_1 = __decorate([
    Table({
        tableName: 'runner',
        indexes: [
            {
                fields: ['runnerToken'],
                unique: true
            },
            {
                fields: ['runnerRegistrationTokenId']
            },
            {
                fields: ['name'],
                unique: true
            }
        ]
    })
], RunnerModel);
export { RunnerModel };
//# sourceMappingURL=runner.js.map