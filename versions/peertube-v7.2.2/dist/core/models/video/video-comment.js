var VideoCommentModel_1;
import { __decorate, __metadata } from "tslib";
import { pick } from '@peertube/peertube-core-utils';
import { UserRight } from '@peertube/peertube-models';
import { afterCommitIfTransaction, retryTransactionWrapper } from '../../helpers/database-utils.js';
import { logger } from '../../helpers/logger.js';
import { extractMentions } from '../../helpers/mentions.js';
import { sequelizeTypescript } from '../../initializers/database.js';
import { getLocalApproveReplyActivityPubUrl } from '../../lib/activitypub/url.js';
import { getServerActor } from '../application/application.js';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import { AfterCreate, AfterDestroy, AfterUpdate, AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany, Is, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { CONSTRAINTS_FIELDS, USER_EXPORT_MAX_ITEMS } from '../../initializers/constants.js';
import { VideoCommentAbuseModel } from '../abuse/video-comment-abuse.js';
import { AccountModel } from '../account/account.js';
import { ActorModel } from '../actor/actor.js';
import { CommentAutomaticTagModel } from '../automatic-tag/comment-automatic-tag.js';
import { buildLocalAccountIdsIn, buildSQLAttributes, SequelizeModel, throwIfNotValid } from '../shared/index.js';
import { VideoCommentListQueryBuilder } from './sql/comment/video-comment-list-query-builder.js';
import { VideoChannelModel } from './video-channel.js';
import { VideoModel } from './video.js';
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["WITH_ACCOUNT"] = "WITH_ACCOUNT";
    ScopeNames["WITH_IN_REPLY_TO"] = "WITH_IN_REPLY_TO";
    ScopeNames["WITH_VIDEO"] = "WITH_VIDEO";
})(ScopeNames || (ScopeNames = {}));
let VideoCommentModel = VideoCommentModel_1 = class VideoCommentModel extends SequelizeModel {
    static incrementCommentCount(instance, options) {
        if (instance.heldForReview)
            return;
        return afterCommitIfTransaction(options.transaction, () => this.rebuildCommentsCount(instance.videoId));
    }
    static updateCommentCountOnHeldStatusChange(instance, options) {
        return afterCommitIfTransaction(options.transaction, () => this.rebuildCommentsCount(instance.videoId));
    }
    static async rebuildCommentsCount(videoId) {
        try {
            await retryTransactionWrapper(() => {
                return sequelizeTypescript.transaction(async (transaction) => {
                    const video = await VideoModel.load(videoId, transaction);
                    if (!video)
                        return;
                    video.comments = await new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, {
                        selectType: 'comment-only',
                        videoId: video.id,
                        heldForReview: false,
                        notDeleted: true,
                        transaction
                    }).countComments();
                    await video.save({ transaction });
                });
            });
        }
        catch (err) {
            logger.error('Cannot rebuild comments count for video ' + videoId, { err });
        }
    }
    static getSQLAttributes(tableName, aliasPrefix = '') {
        return buildSQLAttributes({
            model: this,
            tableName,
            aliasPrefix
        });
    }
    static loadById(id, transaction) {
        const query = {
            where: {
                id
            },
            transaction
        };
        return VideoCommentModel_1.findOne(query);
    }
    static loadByIdAndPopulateVideoAndAccountAndReply(id, transaction) {
        const query = {
            where: {
                id
            },
            transaction
        };
        return VideoCommentModel_1
            .scope([ScopeNames.WITH_VIDEO, ScopeNames.WITH_ACCOUNT, ScopeNames.WITH_IN_REPLY_TO])
            .findOne(query);
    }
    static loadByUrlAndPopulateAccountAndVideoAndReply(url, transaction) {
        const query = {
            where: {
                url
            },
            transaction
        };
        return VideoCommentModel_1.scope([ScopeNames.WITH_ACCOUNT, ScopeNames.WITH_VIDEO, ScopeNames.WITH_IN_REPLY_TO]).findOne(query);
    }
    static loadByUrlAndPopulateReplyAndVideoImmutableAndAccount(url, transaction) {
        const query = {
            where: {
                url
            },
            include: [
                {
                    attributes: ['id', 'uuid', 'url', 'remote'],
                    model: VideoModel.unscoped()
                }
            ],
            transaction
        };
        return VideoCommentModel_1.scope([ScopeNames.WITH_IN_REPLY_TO, ScopeNames.WITH_ACCOUNT]).findOne(query);
    }
    static listCommentsForApi(parameters) {
        const queryOptions = Object.assign(Object.assign({}, pick(parameters, [
            'start',
            'count',
            'sort',
            'isLocal',
            'search',
            'searchVideo',
            'searchAccount',
            'onLocalVideo',
            'videoId',
            'videoChannelId',
            'autoTagOneOf',
            'autoTagOfAccountId',
            'videoAccountOwnerId',
            'videoChannelOwnerId',
            'heldForReview'
        ])), { selectType: 'api', notDeleted: true });
        return Promise.all([
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, queryOptions).listComments(),
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, queryOptions).countComments()
        ]).then(([rows, count]) => {
            return { total: count, data: rows };
        });
    }
    static async listThreadsForApi(parameters) {
        var _a;
        const { video, user } = parameters;
        const { blockerAccountIds, canSeeHeldForReview } = await VideoCommentModel_1.buildBlockerAccountIdsAndCanSeeHeldForReview({ user, video });
        const commonOptions = {
            selectType: 'api',
            videoId: video.id,
            blockerAccountIds,
            heldForReview: canSeeHeldForReview
                ? undefined
                : false,
            heldForReviewAccountIdException: (_a = user === null || user === void 0 ? void 0 : user.Account) === null || _a === void 0 ? void 0 : _a.id
        };
        const listOptions = Object.assign(Object.assign(Object.assign({}, commonOptions), pick(parameters, ['sort', 'start', 'count'])), { isThread: true, includeReplyCounters: true });
        const countOptions = Object.assign(Object.assign({}, commonOptions), { isThread: true });
        const notDeletedCountOptions = Object.assign(Object.assign({}, commonOptions), { notDeleted: true });
        return Promise.all([
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, listOptions).listComments(),
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, countOptions).countComments(),
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, notDeletedCountOptions).countComments()
        ]).then(([rows, count, totalNotDeletedComments]) => {
            return { total: count, data: rows, totalNotDeletedComments };
        });
    }
    static async listThreadCommentsForApi(parameters) {
        var _a;
        const { user, video, threadId } = parameters;
        const { blockerAccountIds, canSeeHeldForReview } = await VideoCommentModel_1.buildBlockerAccountIdsAndCanSeeHeldForReview({ user, video });
        const queryOptions = {
            threadId,
            videoId: video.id,
            selectType: 'api',
            sort: 'createdAt',
            blockerAccountIds,
            includeReplyCounters: true,
            heldForReview: canSeeHeldForReview
                ? undefined
                : false,
            heldForReviewAccountIdException: (_a = user === null || user === void 0 ? void 0 : user.Account) === null || _a === void 0 ? void 0 : _a.id
        };
        return Promise.all([
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, queryOptions).listComments(),
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, queryOptions).countComments()
        ]).then(([rows, count]) => {
            return { total: count, data: rows };
        });
    }
    static listThreadParentComments(options) {
        const { comment, transaction, order = 'ASC' } = options;
        const query = {
            order: [['createdAt', order]],
            where: {
                id: {
                    [Op.in]: Sequelize.literal('(' +
                        'WITH RECURSIVE children (id, "inReplyToCommentId") AS ( ' +
                        `SELECT id, "inReplyToCommentId" FROM "videoComment" WHERE id = ${comment.id} ` +
                        'UNION ' +
                        'SELECT "parent"."id", "parent"."inReplyToCommentId" FROM "videoComment" "parent" ' +
                        'INNER JOIN "children" ON "children"."inReplyToCommentId" = "parent"."id"' +
                        ') ' +
                        'SELECT id FROM children' +
                        ')'),
                    [Op.ne]: comment.id
                }
            },
            transaction
        };
        return VideoCommentModel_1
            .scope([ScopeNames.WITH_ACCOUNT])
            .findAll(query);
    }
    static async listAndCountByVideoForAP(parameters) {
        const { video } = parameters;
        const blockerAccountIds = await VideoCommentModel_1.buildBlockerAccountIds({ user: null });
        const queryOptions = Object.assign(Object.assign({}, pick(parameters, ['start', 'count'])), { selectType: 'comment-only', videoId: video.id, sort: 'createdAt', heldForReview: false, blockerAccountIds });
        return Promise.all([
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, queryOptions).listComments(),
            new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, queryOptions).countComments()
        ]).then(([rows, count]) => {
            return { total: count, data: rows };
        });
    }
    static async listForFeed(parameters) {
        const blockerAccountIds = await VideoCommentModel_1.buildBlockerAccountIds({ user: null });
        const queryOptions = Object.assign(Object.assign({}, pick(parameters, ['start', 'count', 'videoAccountOwnerId', 'videoId', 'videoChannelOwnerId'])), { selectType: 'feed', sort: '-createdAt', onPublicVideo: true, notDeleted: true, heldForReview: false, blockerAccountIds });
        return new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, queryOptions).listComments();
    }
    static listForBulkDelete(ofAccount, filter = {}) {
        var _a;
        const queryOptions = {
            selectType: 'comment-only',
            accountId: ofAccount.id,
            videoAccountOwnerId: (_a = filter.onVideosOfAccount) === null || _a === void 0 ? void 0 : _a.id,
            heldForReview: undefined,
            notDeleted: true,
            count: 5000
        };
        return new VideoCommentListQueryBuilder(VideoCommentModel_1.sequelize, queryOptions).listComments();
    }
    static listForExport(ofAccountId) {
        return VideoCommentModel_1.findAll({
            attributes: ['id', 'url', 'text', 'createdAt'],
            where: {
                accountId: ofAccountId,
                deletedAt: null
            },
            include: [
                {
                    attributes: ['id', 'uuid', 'url'],
                    required: true,
                    model: VideoModel.unscoped()
                },
                {
                    attributes: ['url'],
                    required: false,
                    model: VideoCommentModel_1,
                    as: 'InReplyToVideoComment'
                }
            ],
            limit: USER_EXPORT_MAX_ITEMS
        });
    }
    static async getStats() {
        const where = {
            deletedAt: null,
            heldForReview: false
        };
        const totalLocalVideoComments = await VideoCommentModel_1.count({
            where,
            include: [
                {
                    model: AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            model: ActorModel.unscoped(),
                            required: true,
                            where: {
                                serverId: null
                            }
                        }
                    ]
                }
            ]
        });
        const totalVideoComments = await VideoCommentModel_1.count({ where });
        return {
            totalLocalVideoComments,
            totalVideoComments
        };
    }
    static listRemoteCommentUrlsOfLocalVideos() {
        const query = `SELECT "videoComment".url FROM "videoComment" ` +
            `INNER JOIN account ON account.id = "videoComment"."accountId" ` +
            `INNER JOIN actor ON actor.id = "account"."actorId" AND actor."serverId" IS NOT NULL ` +
            `INNER JOIN video ON video.id = "videoComment"."videoId" AND video.remote IS FALSE`;
        return VideoCommentModel_1.sequelize.query(query, {
            type: QueryTypes.SELECT,
            raw: true
        }).then(rows => rows.map(r => r.url));
    }
    static cleanOldCommentsOf(videoId, beforeUpdatedAt) {
        const query = {
            where: {
                updatedAt: {
                    [Op.lt]: beforeUpdatedAt
                },
                videoId,
                accountId: {
                    [Op.notIn]: buildLocalAccountIdsIn()
                },
                deletedAt: null
            }
        };
        return VideoCommentModel_1.destroy(query);
    }
    getCommentStaticPath() {
        return this.Video.getWatchStaticPath() + ';threadId=' + this.getThreadId();
    }
    getCommentUserReviewPath() {
        return '/my-account/videos/comments?search=heldForReview:true';
    }
    getThreadId() {
        return this.originCommentId || this.id;
    }
    isOwned() {
        if (!this.Account)
            return false;
        return this.Account.isOwned();
    }
    markAsDeleted() {
        this.text = '';
        this.deletedAt = new Date();
        this.accountId = null;
    }
    isDeleted() {
        return this.deletedAt !== null;
    }
    extractMentions() {
        return extractMentions(this.text, this.isOwned());
    }
    toFormattedJSON() {
        return {
            id: this.id,
            url: this.url,
            text: this.text,
            threadId: this.getThreadId(),
            inReplyToCommentId: this.inReplyToCommentId || null,
            videoId: this.videoId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            deletedAt: this.deletedAt,
            heldForReview: this.heldForReview,
            isDeleted: this.isDeleted(),
            totalRepliesFromVideoAuthor: this.get('totalRepliesFromVideoAuthor') || 0,
            totalReplies: this.get('totalReplies') || 0,
            account: this.Account
                ? this.Account.toFormattedJSON()
                : null
        };
    }
    toFormattedForAdminOrUserJSON() {
        return {
            id: this.id,
            url: this.url,
            text: this.text,
            threadId: this.getThreadId(),
            inReplyToCommentId: this.inReplyToCommentId || null,
            videoId: this.videoId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            heldForReview: this.heldForReview,
            automaticTags: (this.CommentAutomaticTags || []).map(m => m.AutomaticTag.name),
            video: {
                id: this.Video.id,
                uuid: this.Video.uuid,
                name: this.Video.name
            },
            account: this.Account
                ? this.Account.toFormattedJSON()
                : null
        };
    }
    toActivityPubObject(threadParentComments) {
        const inReplyTo = this.inReplyToCommentId === null
            ? this.Video.url
            : this.InReplyToVideoComment.url;
        if (this.isDeleted()) {
            return {
                id: this.url,
                type: 'Tombstone',
                formerType: 'Note',
                inReplyTo,
                published: this.createdAt.toISOString(),
                updated: this.updatedAt.toISOString(),
                deleted: this.deletedAt.toISOString()
            };
        }
        const tag = [];
        for (const parentComment of threadParentComments) {
            if (!parentComment.Account)
                continue;
            const actor = parentComment.Account.Actor;
            tag.push({
                type: 'Mention',
                href: actor.url,
                name: `@${actor.preferredUsername}@${actor.getHost()}`
            });
        }
        let replyApproval = this.replyApproval;
        if (this.Video.isOwned() && !this.heldForReview) {
            replyApproval = getLocalApproveReplyActivityPubUrl(this.Video, this);
        }
        return {
            type: 'Note',
            id: this.url,
            content: this.text,
            mediaType: 'text/markdown',
            inReplyTo,
            updated: this.updatedAt.toISOString(),
            published: this.createdAt.toISOString(),
            url: this.url,
            attributedTo: this.Account.Actor.url,
            replyApproval,
            tag
        };
    }
    static async buildBlockerAccountIds(options) {
        const { user } = options;
        const serverActor = await getServerActor();
        const blockerAccountIds = [serverActor.Account.id];
        if (user)
            blockerAccountIds.push(user.Account.id);
        return blockerAccountIds;
    }
    static buildBlockerAccountIdsAndCanSeeHeldForReview(options) {
        const { video, user } = options;
        const blockerAccountIdsPromise = this.buildBlockerAccountIds(options);
        let canSeeHeldForReviewPromise;
        if (user) {
            if (user.hasRight(UserRight.SEE_ALL_COMMENTS)) {
                canSeeHeldForReviewPromise = Promise.resolve(true);
            }
            else {
                canSeeHeldForReviewPromise = VideoChannelModel.loadAndPopulateAccount(video.channelId)
                    .then(c => c.accountId === user.Account.id);
            }
        }
        else {
            canSeeHeldForReviewPromise = Promise.resolve(false);
        }
        return Promise.all([blockerAccountIdsPromise, canSeeHeldForReviewPromise])
            .then(([blockerAccountIds, canSeeHeldForReview]) => ({ blockerAccountIds, canSeeHeldForReview }));
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoCommentModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoCommentModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.DATE),
    __metadata("design:type", Date)
], VideoCommentModel.prototype, "deletedAt", void 0);
__decorate([
    AllowNull(false),
    Is('VideoCommentUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEOS.URL.max)),
    __metadata("design:type", String)
], VideoCommentModel.prototype, "url", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.TEXT),
    __metadata("design:type", String)
], VideoCommentModel.prototype, "text", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoCommentModel.prototype, "heldForReview", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoCommentModel.prototype, "replyApproval", void 0);
__decorate([
    ForeignKey(() => VideoCommentModel),
    Column,
    __metadata("design:type", Number)
], VideoCommentModel.prototype, "originCommentId", void 0);
__decorate([
    BelongsTo(() => VideoCommentModel, {
        foreignKey: {
            name: 'originCommentId',
            allowNull: true
        },
        as: 'OriginVideoComment',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoCommentModel.prototype, "OriginVideoComment", void 0);
__decorate([
    ForeignKey(() => VideoCommentModel),
    Column,
    __metadata("design:type", Number)
], VideoCommentModel.prototype, "inReplyToCommentId", void 0);
__decorate([
    BelongsTo(() => VideoCommentModel, {
        foreignKey: {
            name: 'inReplyToCommentId',
            allowNull: true
        },
        as: 'InReplyToVideoComment',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoCommentModel.prototype, "InReplyToVideoComment", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoCommentModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoCommentModel.prototype, "Video", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], VideoCommentModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoCommentModel.prototype, "Account", void 0);
__decorate([
    HasMany(() => VideoCommentAbuseModel, {
        foreignKey: {
            name: 'videoCommentId',
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Array)
], VideoCommentModel.prototype, "CommentAbuses", void 0);
__decorate([
    HasMany(() => CommentAutomaticTagModel, {
        foreignKey: 'commentId',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], VideoCommentModel.prototype, "CommentAutomaticTags", void 0);
__decorate([
    AfterCreate,
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoCommentModel, Object]),
    __metadata("design:returntype", void 0)
], VideoCommentModel, "incrementCommentCount", null);
__decorate([
    AfterUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoCommentModel, Object]),
    __metadata("design:returntype", void 0)
], VideoCommentModel, "updateCommentCountOnHeldStatusChange", null);
VideoCommentModel = VideoCommentModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.WITH_ACCOUNT]: {
            include: [
                {
                    model: AccountModel
                }
            ]
        },
        [ScopeNames.WITH_IN_REPLY_TO]: {
            include: [
                {
                    model: VideoCommentModel,
                    as: 'InReplyToVideoComment'
                }
            ]
        },
        [ScopeNames.WITH_VIDEO]: {
            include: [
                {
                    model: VideoModel,
                    required: true,
                    include: [
                        {
                            model: VideoChannelModel.unscoped(),
                            attributes: ['id', 'accountId'],
                            required: true,
                            include: [
                                {
                                    attributes: ['id', 'url'],
                                    model: ActorModel.unscoped(),
                                    required: true
                                },
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
            ]
        }
    })),
    Table({
        tableName: 'videoComment',
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: ['videoId', 'originCommentId']
            },
            {
                fields: ['url'],
                unique: true
            },
            {
                fields: ['accountId']
            },
            {
                fields: [
                    { name: 'createdAt', order: 'DESC' }
                ]
            }
        ]
    })
], VideoCommentModel);
export { VideoCommentModel };
//# sourceMappingURL=video-comment.js.map