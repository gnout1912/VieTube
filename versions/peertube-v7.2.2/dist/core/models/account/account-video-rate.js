var AccountVideoRateModel_1;
import { __decorate, __metadata } from "tslib";
import { Op, QueryTypes } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { CONSTRAINTS_FIELDS, USER_EXPORT_MAX_ITEMS, VIDEO_RATE_TYPES } from '../../initializers/constants.js';
import { ActorModel } from '../actor/actor.js';
import { SequelizeModel, getSort, throwIfNotValid } from '../shared/index.js';
import { VideoChannelModel, ScopeNames as VideoChannelScopeNames } from '../video/video-channel.js';
import { VideoModel } from '../video/video.js';
import { AccountModel } from './account.js';
let AccountVideoRateModel = AccountVideoRateModel_1 = class AccountVideoRateModel extends SequelizeModel {
    static load(accountId, videoId, transaction) {
        const options = {
            where: {
                accountId,
                videoId
            }
        };
        if (transaction)
            options.transaction = transaction;
        return AccountVideoRateModel_1.findOne(options);
    }
    static loadByAccountAndVideoOrUrl(accountId, videoId, url, t) {
        const options = {
            where: {
                [Op.or]: [
                    {
                        accountId,
                        videoId
                    },
                    {
                        url
                    }
                ]
            }
        };
        if (t)
            options.transaction = t;
        return AccountVideoRateModel_1.findOne(options);
    }
    static loadLocalAndPopulateVideo(rateType, accountName, videoId, t) {
        const options = {
            where: {
                videoId,
                type: rateType
            },
            include: [
                {
                    model: AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: ['id', 'url', 'followersUrl', 'preferredUsername'],
                            model: ActorModel.unscoped(),
                            required: true,
                            where: {
                                [Op.and]: [
                                    ActorModel.wherePreferredUsername(accountName),
                                    { serverId: null }
                                ]
                            }
                        }
                    ]
                },
                {
                    model: VideoModel.unscoped(),
                    required: true
                }
            ]
        };
        if (t)
            options.transaction = t;
        return AccountVideoRateModel_1.findOne(options);
    }
    static loadByUrl(url, transaction) {
        const options = {
            where: {
                url
            }
        };
        if (transaction)
            options.transaction = transaction;
        return AccountVideoRateModel_1.findOne(options);
    }
    static listByAccountForApi(options) {
        const getQuery = (forCount) => {
            const query = {
                offset: options.start,
                limit: options.count,
                order: getSort(options.sort),
                where: {
                    accountId: options.accountId
                }
            };
            if (options.type)
                query.where['type'] = options.type;
            if (forCount !== true) {
                query.include = [
                    {
                        model: VideoModel,
                        required: true,
                        include: [
                            {
                                model: VideoChannelModel.scope({ method: [VideoChannelScopeNames.SUMMARY, { withAccount: true }] }),
                                required: true
                            }
                        ]
                    }
                ];
            }
            return query;
        };
        return Promise.all([
            AccountVideoRateModel_1.count(getQuery(true)),
            AccountVideoRateModel_1.findAll(getQuery(false))
        ]).then(([total, data]) => ({ total, data }));
    }
    static listRemoteRateUrlsOfLocalVideos() {
        const query = `SELECT "accountVideoRate".url FROM "accountVideoRate" ` +
            `INNER JOIN account ON account.id = "accountVideoRate"."accountId" ` +
            `INNER JOIN actor ON actor.id = account."actorId" AND actor."serverId" IS NOT NULL ` +
            `INNER JOIN video ON video.id = "accountVideoRate"."videoId" AND video.remote IS FALSE`;
        return AccountVideoRateModel_1.sequelize.query(query, {
            type: QueryTypes.SELECT,
            raw: true
        }).then(rows => rows.map(r => r.url));
    }
    static listAndCountAccountUrlsByVideoId(rateType, videoId, start, count, t) {
        const query = {
            offset: start,
            limit: count,
            where: {
                videoId,
                type: rateType
            },
            transaction: t,
            include: [
                {
                    attributes: ['actorId'],
                    model: AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: ['url'],
                            model: ActorModel.unscoped(),
                            required: true
                        }
                    ]
                }
            ]
        };
        return Promise.all([
            AccountVideoRateModel_1.count(query),
            AccountVideoRateModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static listRatesOfAccountIdForExport(accountId, rateType) {
        return AccountVideoRateModel_1.findAll({
            where: {
                accountId,
                type: rateType
            },
            include: [
                {
                    attributes: ['url'],
                    model: VideoModel,
                    required: true
                }
            ],
            limit: USER_EXPORT_MAX_ITEMS
        });
    }
    toFormattedJSON() {
        return {
            video: this.Video.toFormattedJSON(),
            rating: this.type
        };
    }
};
__decorate([
    AllowNull(false),
    Column(DataType.ENUM(...Object.values(VIDEO_RATE_TYPES))),
    __metadata("design:type", String)
], AccountVideoRateModel.prototype, "type", void 0);
__decorate([
    AllowNull(false),
    Is('AccountVideoRateUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_RATES.URL.max)),
    __metadata("design:type", String)
], AccountVideoRateModel.prototype, "url", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], AccountVideoRateModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], AccountVideoRateModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], AccountVideoRateModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], AccountVideoRateModel.prototype, "Video", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], AccountVideoRateModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], AccountVideoRateModel.prototype, "Account", void 0);
AccountVideoRateModel = AccountVideoRateModel_1 = __decorate([
    Table({
        tableName: 'accountVideoRate',
        indexes: [
            {
                fields: ['videoId', 'accountId'],
                unique: true
            },
            {
                fields: ['videoId']
            },
            {
                fields: ['accountId']
            },
            {
                fields: ['videoId', 'type']
            },
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], AccountVideoRateModel);
export { AccountVideoRateModel };
//# sourceMappingURL=account-video-rate.js.map