var UserRegistrationModel_1;
import { __decorate, __metadata } from "tslib";
import { UserRegistrationState } from '@peertube/peertube-models';
import { isRegistrationModerationResponseValid, isRegistrationReasonValid, isRegistrationStateValid } from '../../helpers/custom-validators/user-registration.js';
import { isVideoChannelDisplayNameValid } from '../../helpers/custom-validators/video-channels.js';
import { cryptPassword } from '../../helpers/peertube-crypto.js';
import { USER_REGISTRATION_STATES } from '../../initializers/constants.js';
import { col, fn, Op, QueryTypes, where } from 'sequelize';
import { AllowNull, BeforeCreate, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Is, IsEmail, Table, UpdatedAt } from 'sequelize-typescript';
import { isUserDisplayNameValid, isUserEmailVerifiedValid, isUserPasswordValid } from '../../helpers/custom-validators/users.js';
import { SequelizeModel, getSort, parseAggregateResult, throwIfNotValid } from '../shared/index.js';
import { UserModel } from './user.js';
import { forceNumber } from '@peertube/peertube-core-utils';
let UserRegistrationModel = UserRegistrationModel_1 = class UserRegistrationModel extends SequelizeModel {
    static async cryptPasswordIfNeeded(instance) {
        instance.password = await cryptPassword(instance.password);
    }
    static load(id) {
        return UserRegistrationModel_1.findByPk(id);
    }
    static listByEmailCaseInsensitive(email) {
        const query = {
            where: where(fn('LOWER', col('email')), '=', email.toLowerCase())
        };
        return UserRegistrationModel_1.findAll(query);
    }
    static listByEmailCaseInsensitiveOrUsername(emailOrUsername) {
        const query = {
            where: {
                [Op.or]: [
                    where(fn('LOWER', col('email')), '=', emailOrUsername.toLowerCase()),
                    { username: emailOrUsername }
                ]
            }
        };
        return UserRegistrationModel_1.findAll(query);
    }
    static listByEmailCaseInsensitiveOrHandle(options) {
        const { email, username, channelHandle } = options;
        let or = [
            where(fn('LOWER', col('email')), '=', email.toLowerCase()),
            { channelHandle: username },
            { username }
        ];
        if (channelHandle) {
            or = or.concat([
                { username: channelHandle },
                { channelHandle }
            ]);
        }
        const query = {
            where: {
                [Op.or]: or
            }
        };
        return UserRegistrationModel_1.findAll(query);
    }
    static listForApi(options) {
        const { start, count, sort, search } = options;
        const where = {};
        if (search) {
            Object.assign(where, {
                [Op.or]: [
                    {
                        email: {
                            [Op.iLike]: '%' + search + '%'
                        }
                    },
                    {
                        username: {
                            [Op.iLike]: '%' + search + '%'
                        }
                    }
                ]
            });
        }
        const query = {
            offset: start,
            limit: count,
            order: getSort(sort),
            where,
            include: [
                {
                    model: UserModel.unscoped(),
                    required: false
                }
            ]
        };
        return Promise.all([
            UserRegistrationModel_1.count(query),
            UserRegistrationModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static getStats() {
        const query = `SELECT ` +
            `AVG(EXTRACT(EPOCH FROM ("processedAt" - "createdAt") * 1000)) ` +
            `FILTER (WHERE "processedAt" IS NOT NULL AND "createdAt" > CURRENT_DATE - INTERVAL '3 months')` +
            `AS "avgResponseTime", ` +
            `COUNT(*) FILTER (WHERE "processedAt" IS NOT NULL OR "state" != ${UserRegistrationState.PENDING}) AS "processedRequests", ` +
            `COUNT(*) AS "totalRequests" ` +
            `FROM "userRegistration"`;
        return UserRegistrationModel_1.sequelize.query(query, {
            type: QueryTypes.SELECT,
            raw: true
        }).then(([row]) => {
            return {
                totalRegistrationRequests: parseAggregateResult(row.totalRequests),
                totalRegistrationRequestsProcessed: parseAggregateResult(row.processedRequests),
                averageRegistrationRequestResponseTimeMs: (row === null || row === void 0 ? void 0 : row.avgResponseTime)
                    ? forceNumber(row.avgResponseTime)
                    : null
            };
        });
    }
    toFormattedJSON() {
        return {
            id: this.id,
            state: {
                id: this.state,
                label: USER_REGISTRATION_STATES[this.state]
            },
            registrationReason: this.registrationReason,
            moderationResponse: this.moderationResponse,
            username: this.username,
            email: this.email,
            emailVerified: this.emailVerified,
            accountDisplayName: this.accountDisplayName,
            channelHandle: this.channelHandle,
            channelDisplayName: this.channelDisplayName,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            user: this.User
                ? { id: this.User.id }
                : null
        };
    }
};
__decorate([
    AllowNull(false),
    Is('RegistrationState', value => throwIfNotValid(value, isRegistrationStateValid, 'state')),
    Column,
    __metadata("design:type", Number)
], UserRegistrationModel.prototype, "state", void 0);
__decorate([
    AllowNull(false),
    Is('RegistrationReason', value => throwIfNotValid(value, isRegistrationReasonValid, 'registration reason')),
    Column(DataType.TEXT),
    __metadata("design:type", String)
], UserRegistrationModel.prototype, "registrationReason", void 0);
__decorate([
    AllowNull(true),
    Is('RegistrationModerationResponse', value => throwIfNotValid(value, isRegistrationModerationResponseValid, 'moderation response', true)),
    Column(DataType.TEXT),
    __metadata("design:type", String)
], UserRegistrationModel.prototype, "moderationResponse", void 0);
__decorate([
    AllowNull(true),
    Is('RegistrationPassword', value => throwIfNotValid(value, isUserPasswordValid, 'registration password', true)),
    Column,
    __metadata("design:type", String)
], UserRegistrationModel.prototype, "password", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], UserRegistrationModel.prototype, "username", void 0);
__decorate([
    AllowNull(false),
    IsEmail,
    Column(DataType.STRING(400)),
    __metadata("design:type", String)
], UserRegistrationModel.prototype, "email", void 0);
__decorate([
    AllowNull(true),
    Is('RegistrationEmailVerified', value => throwIfNotValid(value, isUserEmailVerifiedValid, 'email verified boolean', true)),
    Column,
    __metadata("design:type", Boolean)
], UserRegistrationModel.prototype, "emailVerified", void 0);
__decorate([
    AllowNull(true),
    Is('RegistrationAccountDisplayName', value => throwIfNotValid(value, isUserDisplayNameValid, 'account display name', true)),
    Column,
    __metadata("design:type", String)
], UserRegistrationModel.prototype, "accountDisplayName", void 0);
__decorate([
    AllowNull(true),
    Is('ChannelHandle', value => throwIfNotValid(value, isVideoChannelDisplayNameValid, 'channel handle', true)),
    Column,
    __metadata("design:type", String)
], UserRegistrationModel.prototype, "channelHandle", void 0);
__decorate([
    AllowNull(true),
    Is('ChannelDisplayName', value => throwIfNotValid(value, isVideoChannelDisplayNameValid, 'channel display name', true)),
    Column,
    __metadata("design:type", String)
], UserRegistrationModel.prototype, "channelDisplayName", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Date)
], UserRegistrationModel.prototype, "processedAt", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], UserRegistrationModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], UserRegistrationModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], UserRegistrationModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'SET NULL'
    }),
    __metadata("design:type", Object)
], UserRegistrationModel.prototype, "User", void 0);
__decorate([
    BeforeCreate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UserRegistrationModel]),
    __metadata("design:returntype", Promise)
], UserRegistrationModel, "cryptPasswordIfNeeded", null);
UserRegistrationModel = UserRegistrationModel_1 = __decorate([
    Table({
        tableName: 'userRegistration',
        indexes: [
            {
                fields: ['username'],
                unique: true
            },
            {
                fields: ['email'],
                unique: true
            },
            {
                fields: ['channelHandle'],
                unique: true
            },
            {
                fields: ['userId'],
                unique: true
            }
        ]
    })
], UserRegistrationModel);
export { UserRegistrationModel };
//# sourceMappingURL=user-registration.js.map