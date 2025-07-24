var OAuthTokenModel_1;
import { __decorate, __metadata } from "tslib";
import { AfterDestroy, AfterUpdate, AllowNull, BelongsTo, Column, CreatedAt, ForeignKey, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { TokensCache } from '../../lib/auth/tokens-cache.js';
import { logger } from '../../helpers/logger.js';
import { AccountModel } from '../account/account.js';
import { ActorModel } from '../actor/actor.js';
import { UserModel } from '../user/user.js';
import { OAuthClientModel } from './oauth-client.js';
import { SequelizeModel } from '../shared/index.js';
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["WITH_USER"] = "WITH_USER";
})(ScopeNames || (ScopeNames = {}));
let OAuthTokenModel = OAuthTokenModel_1 = class OAuthTokenModel extends SequelizeModel {
    static removeTokenCache(token) {
        return TokensCache.Instance.clearCacheByToken(token.accessToken);
    }
    static loadByRefreshToken(refreshToken) {
        const query = {
            where: { refreshToken }
        };
        return OAuthTokenModel_1.findOne(query);
    }
    static getByRefreshTokenAndPopulateClient(refreshToken) {
        const query = {
            where: {
                refreshToken
            },
            include: [OAuthClientModel]
        };
        return OAuthTokenModel_1.scope(ScopeNames.WITH_USER)
            .findOne(query)
            .then(token => {
            if (!token)
                return null;
            return {
                refreshToken: token.refreshToken,
                refreshTokenExpiresAt: token.refreshTokenExpiresAt,
                client: {
                    id: token.oAuthClientId,
                    grants: []
                },
                user: token.User,
                token
            };
        })
            .catch(err => {
            logger.error('getRefreshToken error.', { err });
            throw err;
        });
    }
    static getByTokenAndPopulateUser(bearerToken) {
        const query = {
            where: {
                accessToken: bearerToken
            }
        };
        return OAuthTokenModel_1.scope(ScopeNames.WITH_USER)
            .findOne(query)
            .then(token => {
            if (!token)
                return null;
            return Object.assign(token, { user: token.User });
        });
    }
    static getByRefreshTokenAndPopulateUser(refreshToken) {
        const query = {
            where: {
                refreshToken
            }
        };
        return OAuthTokenModel_1.scope(ScopeNames.WITH_USER)
            .findOne(query)
            .then(token => {
            if (!token)
                return undefined;
            return Object.assign(token, { user: token.User });
        });
    }
    static deleteUserToken(userId, t) {
        TokensCache.Instance.deleteUserToken(userId);
        const query = {
            where: {
                userId
            },
            transaction: t
        };
        return OAuthTokenModel_1.destroy(query);
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], OAuthTokenModel.prototype, "accessToken", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Date)
], OAuthTokenModel.prototype, "accessTokenExpiresAt", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], OAuthTokenModel.prototype, "refreshToken", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Date)
], OAuthTokenModel.prototype, "refreshTokenExpiresAt", void 0);
__decorate([
    Column,
    __metadata("design:type", String)
], OAuthTokenModel.prototype, "authName", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], OAuthTokenModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], OAuthTokenModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], OAuthTokenModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], OAuthTokenModel.prototype, "User", void 0);
__decorate([
    ForeignKey(() => OAuthClientModel),
    Column,
    __metadata("design:type", Number)
], OAuthTokenModel.prototype, "oAuthClientId", void 0);
__decorate([
    BelongsTo(() => OAuthClientModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], OAuthTokenModel.prototype, "OAuthClients", void 0);
__decorate([
    AfterUpdate,
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [OAuthTokenModel]),
    __metadata("design:returntype", void 0)
], OAuthTokenModel, "removeTokenCache", null);
OAuthTokenModel = OAuthTokenModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.WITH_USER]: {
            include: [
                {
                    model: UserModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: ['id'],
                            model: AccountModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    attributes: ['id', 'url'],
                                    model: ActorModel.unscoped(),
                                    required: true
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    })),
    Table({
        tableName: 'oAuthToken',
        indexes: [
            {
                fields: ['refreshToken'],
                unique: true
            },
            {
                fields: ['accessToken'],
                unique: true
            },
            {
                fields: ['userId']
            },
            {
                fields: ['oAuthClientId']
            }
        ]
    })
], OAuthTokenModel);
export { OAuthTokenModel };
//# sourceMappingURL=oauth-token.js.map