var AbuseModel_1;
import { __decorate, __metadata } from "tslib";
import { abusePredefinedReasonsMap, forceNumber } from '@peertube/peertube-core-utils';
import { AbuseState } from '@peertube/peertube-models';
import { uuidToShort } from '@peertube/peertube-node-utils';
import { isAbuseModerationCommentValid, isAbuseReasonValid, isAbuseStateValid } from '../../helpers/custom-validators/abuses.js';
import invert from 'lodash-es/invert.js';
import { Op, QueryTypes, literal } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, HasOne, Is, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { ABUSE_STATES, CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { AccountModel, ScopeNames as AccountScopeNames } from '../account/account.js';
import { SequelizeModel, getSort, parseAggregateResult, throwIfNotValid } from '../shared/index.js';
import { ThumbnailModel } from '../video/thumbnail.js';
import { VideoBlacklistModel } from '../video/video-blacklist.js';
import { VideoChannelModel, ScopeNames as VideoChannelScopeNames } from '../video/video-channel.js';
import { ScopeNames as CommentScopeNames, VideoCommentModel } from '../video/video-comment.js';
import { VideoModel, ScopeNames as VideoScopeNames } from '../video/video.js';
import { buildAbuseListQuery } from './sql/abuse-query-builder.js';
import { VideoAbuseModel } from './video-abuse.js';
import { VideoCommentAbuseModel } from './video-comment-abuse.js';
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["FOR_API"] = "FOR_API";
})(ScopeNames || (ScopeNames = {}));
let AbuseModel = AbuseModel_1 = class AbuseModel extends SequelizeModel {
    static loadByIdWithReporter(id) {
        const query = {
            where: {
                id
            },
            include: [
                {
                    model: AccountModel,
                    as: 'ReporterAccount'
                }
            ]
        };
        return AbuseModel_1.findOne(query);
    }
    static loadFull(id) {
        const query = {
            where: {
                id
            },
            include: [
                {
                    model: AccountModel.scope(AccountScopeNames.SUMMARY),
                    required: false,
                    as: 'ReporterAccount'
                },
                {
                    model: AccountModel.scope(AccountScopeNames.SUMMARY),
                    as: 'FlaggedAccount'
                },
                {
                    model: VideoAbuseModel,
                    required: false,
                    include: [
                        {
                            model: VideoModel.scope([VideoScopeNames.WITH_ACCOUNT_DETAILS])
                        }
                    ]
                },
                {
                    model: VideoCommentAbuseModel,
                    required: false,
                    include: [
                        {
                            model: VideoCommentModel.scope([
                                CommentScopeNames.WITH_ACCOUNT
                            ]),
                            include: [
                                {
                                    model: VideoModel
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        return AbuseModel_1.findOne(query);
    }
    static async listForAdminApi(parameters) {
        const { start, count, sort, search, user, serverAccountId, state, videoIs, predefinedReason, searchReportee, searchVideo, filter, searchVideoChannel, searchReporter, id } = parameters;
        const userAccountId = user ? user.Account.id : undefined;
        const predefinedReasonId = predefinedReason ? abusePredefinedReasonsMap[predefinedReason] : undefined;
        const queryOptions = {
            start,
            count,
            sort,
            id,
            filter,
            predefinedReasonId,
            search,
            state,
            videoIs,
            searchReportee,
            searchVideo,
            searchVideoChannel,
            searchReporter,
            serverAccountId,
            userAccountId
        };
        const [total, data] = await Promise.all([
            AbuseModel_1.internalCountForApi(queryOptions),
            AbuseModel_1.internalListForApi(queryOptions)
        ]);
        return { total, data };
    }
    static async listForUserApi(parameters) {
        const { start, count, sort, search, user, state, id } = parameters;
        const queryOptions = {
            start,
            count,
            sort,
            id,
            search,
            state,
            reporterAccountId: user.Account.id
        };
        const [total, data] = await Promise.all([
            AbuseModel_1.internalCountForApi(queryOptions),
            AbuseModel_1.internalListForApi(queryOptions)
        ]);
        return { total, data };
    }
    static getStats() {
        const query = `SELECT ` +
            `AVG(EXTRACT(EPOCH FROM ("processedAt" - "createdAt") * 1000)) ` +
            `FILTER (WHERE "processedAt" IS NOT NULL AND "createdAt" > CURRENT_DATE - INTERVAL '3 months')` +
            `AS "avgResponseTime", ` +
            `COUNT(*) FILTER (WHERE "processedAt" IS NOT NULL OR "state" != ${AbuseState.PENDING}) AS "processedAbuses", ` +
            `COUNT(*) AS "totalAbuses" ` +
            `FROM "abuse"`;
        return AbuseModel_1.sequelize.query(query, {
            type: QueryTypes.SELECT,
            raw: true
        }).then(([row]) => {
            return {
                totalAbuses: parseAggregateResult(row.totalAbuses),
                totalAbusesProcessed: parseAggregateResult(row.processedAbuses),
                averageAbuseResponseTimeMs: (row === null || row === void 0 ? void 0 : row.avgResponseTime)
                    ? forceNumber(row.avgResponseTime)
                    : null
            };
        });
    }
    buildBaseVideoCommentAbuse() {
        var _a, _b;
        if (!((_a = this.VideoCommentAbuse) === null || _a === void 0 ? void 0 : _a.VideoComment))
            return null;
        const entity = this.VideoCommentAbuse.VideoComment;
        return {
            id: entity.id,
            threadId: entity.getThreadId(),
            text: (_b = entity.text) !== null && _b !== void 0 ? _b : '',
            deleted: entity.isDeleted(),
            video: {
                id: entity.Video.id,
                name: entity.Video.name,
                uuid: entity.Video.uuid
            }
        };
    }
    buildBaseVideoAbuse() {
        var _a, _b, _c, _d;
        if (!this.VideoAbuse)
            return null;
        const abuseModel = this.VideoAbuse;
        const entity = abuseModel.Video || abuseModel.deletedVideo;
        return {
            id: entity.id,
            uuid: entity.uuid,
            shortUUID: uuidToShort(entity.uuid),
            name: entity.name,
            nsfw: entity.nsfw,
            startAt: abuseModel.startAt,
            endAt: abuseModel.endAt,
            deleted: !abuseModel.Video,
            blacklisted: ((_a = abuseModel.Video) === null || _a === void 0 ? void 0 : _a.isBlacklisted()) || false,
            thumbnailPath: (_b = abuseModel.Video) === null || _b === void 0 ? void 0 : _b.getMiniatureStaticPath(),
            channel: ((_c = abuseModel.Video) === null || _c === void 0 ? void 0 : _c.VideoChannel.toFormattedJSON()) || ((_d = abuseModel.deletedVideo) === null || _d === void 0 ? void 0 : _d.channel)
        };
    }
    buildBaseAbuse(countMessages) {
        const predefinedReasons = AbuseModel_1.getPredefinedReasonsStrings(this.predefinedReasons);
        return {
            id: this.id,
            reason: this.reason,
            predefinedReasons,
            flaggedAccount: this.FlaggedAccount
                ? this.FlaggedAccount.toFormattedJSON()
                : null,
            state: {
                id: this.state,
                label: AbuseModel_1.getStateLabel(this.state)
            },
            countMessages,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    toFormattedAdminJSON() {
        const countReportsForVideo = this.get('countReportsForVideo');
        const nthReportForVideo = this.get('nthReportForVideo');
        const countReportsForReporter = this.get('countReportsForReporter');
        const countReportsForReportee = this.get('countReportsForReportee');
        const countMessages = this.get('countMessages');
        const baseVideo = this.buildBaseVideoAbuse();
        const video = baseVideo
            ? Object.assign(baseVideo, {
                countReports: countReportsForVideo,
                nthReport: nthReportForVideo
            })
            : null;
        const comment = this.buildBaseVideoCommentAbuse();
        const abuse = this.buildBaseAbuse(countMessages || 0);
        return Object.assign(abuse, {
            video,
            comment,
            moderationComment: this.moderationComment,
            reporterAccount: this.ReporterAccount
                ? this.ReporterAccount.toFormattedJSON()
                : null,
            countReportsForReporter: (countReportsForReporter || 0),
            countReportsForReportee: (countReportsForReportee || 0)
        });
    }
    toFormattedUserJSON() {
        const countMessages = this.get('countMessages');
        const video = this.buildBaseVideoAbuse();
        const comment = this.buildBaseVideoCommentAbuse();
        const abuse = this.buildBaseAbuse(countMessages || 0);
        return Object.assign(abuse, {
            video,
            comment
        });
    }
    toActivityPubObject() {
        var _a, _b, _c, _d, _e, _f;
        const predefinedReasons = AbuseModel_1.getPredefinedReasonsStrings(this.predefinedReasons);
        const object = ((_b = (_a = this.VideoAbuse) === null || _a === void 0 ? void 0 : _a.Video) === null || _b === void 0 ? void 0 : _b.url) || ((_d = (_c = this.VideoCommentAbuse) === null || _c === void 0 ? void 0 : _c.VideoComment) === null || _d === void 0 ? void 0 : _d.url) || this.FlaggedAccount.Actor.url;
        const startAt = (_e = this.VideoAbuse) === null || _e === void 0 ? void 0 : _e.startAt;
        const endAt = (_f = this.VideoAbuse) === null || _f === void 0 ? void 0 : _f.endAt;
        return {
            type: 'Flag',
            content: this.reason,
            mediaType: 'text/markdown',
            object,
            tag: predefinedReasons.map(r => ({
                type: 'Hashtag',
                name: r
            })),
            startAt,
            endAt
        };
    }
    static async internalCountForApi(parameters) {
        const { query, replacements } = buildAbuseListQuery(parameters, 'count');
        const options = {
            type: QueryTypes.SELECT,
            replacements
        };
        const [{ total }] = await AbuseModel_1.sequelize.query(query, options);
        if (total === null)
            return 0;
        return parseInt(total, 10);
    }
    static async internalListForApi(parameters) {
        const { query, replacements } = buildAbuseListQuery(parameters, 'id');
        const options = {
            type: QueryTypes.SELECT,
            replacements
        };
        const rows = await AbuseModel_1.sequelize.query(query, options);
        const ids = rows.map(r => r.id);
        if (ids.length === 0)
            return [];
        return AbuseModel_1.scope(ScopeNames.FOR_API)
            .findAll({
            order: getSort(parameters.sort),
            where: {
                id: {
                    [Op.in]: ids
                }
            },
            limit: parameters.count
        });
    }
    static getStateLabel(id) {
        return ABUSE_STATES[id] || 'Unknown';
    }
    static getPredefinedReasonsStrings(predefinedReasons) {
        const invertedPredefinedReasons = invert(abusePredefinedReasonsMap);
        return (predefinedReasons || [])
            .map(r => invertedPredefinedReasons[r])
            .filter(v => !!v);
    }
};
__decorate([
    AllowNull(false),
    Default(null),
    Is('AbuseReason', value => throwIfNotValid(value, isAbuseReasonValid, 'reason')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ABUSES.REASON.max)),
    __metadata("design:type", String)
], AbuseModel.prototype, "reason", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('AbuseState', value => throwIfNotValid(value, isAbuseStateValid, 'state')),
    Column,
    __metadata("design:type", Number)
], AbuseModel.prototype, "state", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('AbuseModerationComment', value => throwIfNotValid(value, isAbuseModerationCommentValid, 'moderationComment', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.ABUSES.MODERATION_COMMENT.max)),
    __metadata("design:type", String)
], AbuseModel.prototype, "moderationComment", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.ARRAY(DataType.INTEGER)),
    __metadata("design:type", Array)
], AbuseModel.prototype, "predefinedReasons", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Date)
], AbuseModel.prototype, "processedAt", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], AbuseModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], AbuseModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], AbuseModel.prototype, "reporterAccountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            name: 'reporterAccountId',
            allowNull: true
        },
        as: 'ReporterAccount',
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], AbuseModel.prototype, "ReporterAccount", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], AbuseModel.prototype, "flaggedAccountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            name: 'flaggedAccountId',
            allowNull: true
        },
        as: 'FlaggedAccount',
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], AbuseModel.prototype, "FlaggedAccount", void 0);
__decorate([
    HasOne(() => VideoCommentAbuseModel, {
        foreignKey: {
            name: 'abuseId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], AbuseModel.prototype, "VideoCommentAbuse", void 0);
__decorate([
    HasOne(() => VideoAbuseModel, {
        foreignKey: {
            name: 'abuseId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], AbuseModel.prototype, "VideoAbuse", void 0);
AbuseModel = AbuseModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.FOR_API]: () => {
            return {
                attributes: {
                    include: [
                        [
                            literal('(' +
                                'SELECT count(*) ' +
                                'FROM "abuseMessage" ' +
                                'WHERE "abuseId" = "AbuseModel"."id"' +
                                ')'),
                            'countMessages'
                        ],
                        [
                            literal('(' +
                                'SELECT count(*) ' +
                                'FROM "videoAbuse" ' +
                                'WHERE "videoId" IN (SELECT "videoId" FROM "videoAbuse" WHERE "abuseId" = "AbuseModel"."id") ' +
                                'AND "videoId" IS NOT NULL' +
                                ')'),
                            'countReportsForVideo'
                        ],
                        [
                            literal('(' +
                                'SELECT t.nth ' +
                                'FROM ( ' +
                                'SELECT id, "abuseId", row_number() OVER (PARTITION BY "videoId" ORDER BY "createdAt") AS nth ' +
                                'FROM "videoAbuse" ' +
                                ') t ' +
                                'WHERE t."abuseId" = "AbuseModel"."id" ' +
                                ')'),
                            'nthReportForVideo'
                        ],
                        [
                            literal('(' +
                                'SELECT count("abuse"."id") ' +
                                'FROM "abuse" ' +
                                'WHERE "abuse"."reporterAccountId" = "AbuseModel"."reporterAccountId"' +
                                ')'),
                            'countReportsForReporter'
                        ],
                        [
                            literal('(' +
                                'SELECT count("abuse"."id") ' +
                                'FROM "abuse" ' +
                                'WHERE "abuse"."flaggedAccountId" = "AbuseModel"."flaggedAccountId"' +
                                ')'),
                            'countReportsForReportee'
                        ]
                    ]
                },
                include: [
                    {
                        model: AccountModel.scope({
                            method: [
                                AccountScopeNames.SUMMARY,
                                { actorRequired: false }
                            ]
                        }),
                        as: 'ReporterAccount'
                    },
                    {
                        model: AccountModel.scope({
                            method: [
                                AccountScopeNames.SUMMARY,
                                { actorRequired: false }
                            ]
                        }),
                        as: 'FlaggedAccount'
                    },
                    {
                        model: VideoCommentAbuseModel.unscoped(),
                        include: [
                            {
                                model: VideoCommentModel.unscoped(),
                                include: [
                                    {
                                        model: VideoModel.unscoped(),
                                        attributes: ['name', 'id', 'uuid']
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: VideoAbuseModel.unscoped(),
                        include: [
                            {
                                attributes: ['id', 'uuid', 'name', 'nsfw'],
                                model: VideoModel.unscoped(),
                                include: [
                                    {
                                        attributes: ['filename', 'fileUrl', 'type'],
                                        model: ThumbnailModel
                                    },
                                    {
                                        model: VideoChannelModel.scope({
                                            method: [
                                                VideoChannelScopeNames.SUMMARY,
                                                { withAccount: false, actorRequired: false }
                                            ]
                                        }),
                                        required: false
                                    },
                                    {
                                        attributes: ['id', 'reason', 'unfederated'],
                                        required: false,
                                        model: VideoBlacklistModel
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };
        }
    })),
    Table({
        tableName: 'abuse',
        indexes: [
            {
                fields: ['reporterAccountId']
            },
            {
                fields: ['flaggedAccountId']
            }
        ]
    })
], AbuseModel);
export { AbuseModel };
//# sourceMappingURL=abuse.js.map