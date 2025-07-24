var UserImportModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { SequelizeModel } from '../shared/index.js';
import { UserModel } from './user.js';
import { getSort } from '../shared/sort.js';
import { USER_IMPORT_STATES } from '../../initializers/constants.js';
let UserImportModel = UserImportModel_1 = class UserImportModel extends SequelizeModel {
    static load(id) {
        return UserImportModel_1.findByPk(id);
    }
    static loadLatestByUserId(userId) {
        return UserImportModel_1.findOne({
            where: {
                userId
            },
            order: getSort('-createdAt')
        });
    }
    generateAndSetFilename() {
        if (!this.userId)
            throw new Error('Cannot generate filename without userId');
        if (!this.createdAt)
            throw new Error('Cannot generate filename without createdAt');
        this.filename = `user-import-${this.userId}-${this.createdAt.toISOString()}.zip`;
    }
    toFormattedJSON() {
        return {
            id: this.id,
            state: {
                id: this.state,
                label: USER_IMPORT_STATES[this.state]
            },
            createdAt: this.createdAt.toISOString()
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], UserImportModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], UserImportModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], UserImportModel.prototype, "filename", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], UserImportModel.prototype, "state", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.TEXT),
    __metadata("design:type", String)
], UserImportModel.prototype, "error", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.JSONB),
    __metadata("design:type", Object)
], UserImportModel.prototype, "resultSummary", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], UserImportModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], UserImportModel.prototype, "User", void 0);
UserImportModel = UserImportModel_1 = __decorate([
    Table({
        tableName: 'userImport',
        indexes: [
            {
                fields: ['userId']
            },
            {
                fields: ['filename'],
                unique: true
            }
        ]
    })
], UserImportModel);
export { UserImportModel };
//# sourceMappingURL=user-import.js.map