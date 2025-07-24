var OAuthClientModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, Column, CreatedAt, DataType, HasMany, Table, UpdatedAt } from 'sequelize-typescript';
import { OAuthTokenModel } from './oauth-token.js';
import { SequelizeModel } from '../shared/index.js';
let OAuthClientModel = OAuthClientModel_1 = class OAuthClientModel extends SequelizeModel {
    static countTotal() {
        return OAuthClientModel_1.count();
    }
    static loadFirstClient() {
        return OAuthClientModel_1.findOne();
    }
    static getByIdAndSecret(clientId, clientSecret) {
        const query = {
            where: {
                clientId,
                clientSecret
            }
        };
        return OAuthClientModel_1.findOne(query);
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], OAuthClientModel.prototype, "clientId", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], OAuthClientModel.prototype, "clientSecret", void 0);
__decorate([
    Column(DataType.ARRAY(DataType.STRING)),
    __metadata("design:type", Array)
], OAuthClientModel.prototype, "grants", void 0);
__decorate([
    Column(DataType.ARRAY(DataType.STRING)),
    __metadata("design:type", Array)
], OAuthClientModel.prototype, "redirectUris", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], OAuthClientModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], OAuthClientModel.prototype, "updatedAt", void 0);
__decorate([
    HasMany(() => OAuthTokenModel, {
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], OAuthClientModel.prototype, "OAuthTokens", void 0);
OAuthClientModel = OAuthClientModel_1 = __decorate([
    Table({
        tableName: 'oAuthClient',
        indexes: [
            {
                fields: ['clientId'],
                unique: true
            },
            {
                fields: ['clientId', 'clientSecret'],
                unique: true
            }
        ]
    })
], OAuthClientModel);
export { OAuthClientModel };
//# sourceMappingURL=oauth-client.js.map