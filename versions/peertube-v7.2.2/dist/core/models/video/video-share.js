var VideoShareModel_1;
import { __decorate, __metadata } from "tslib";
import { literal, Op, QueryTypes } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Is, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { forceNumber } from '@peertube/peertube-core-utils';
import { isActivityPubUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { ActorModel } from '../actor/actor.js';
import { buildLocalActorIdsIn, SequelizeModel, throwIfNotValid } from '../shared/index.js';
import { VideoModel } from './video.js';
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["FULL"] = "FULL";
    ScopeNames["WITH_ACTOR"] = "WITH_ACTOR";
})(ScopeNames || (ScopeNames = {}));
let VideoShareModel = VideoShareModel_1 = class VideoShareModel extends SequelizeModel {
    static load(actorId, videoId, t) {
        return VideoShareModel_1.scope(ScopeNames.WITH_ACTOR).findOne({
            where: {
                actorId,
                videoId
            },
            transaction: t
        });
    }
    static loadByUrl(url, t) {
        return VideoShareModel_1.scope(ScopeNames.FULL).findOne({
            where: {
                url
            },
            transaction: t
        });
    }
    static listActorIdsAndFollowerUrlsByShare(videoId, t) {
        const query = `SELECT "actor"."id" AS "id", "actor"."followersUrl" AS "followersUrl" ` +
            `FROM "videoShare" ` +
            `INNER JOIN "actor" ON "actor"."id" = "videoShare"."actorId" ` +
            `WHERE "videoShare"."videoId" = :videoId`;
        const options = {
            type: QueryTypes.SELECT,
            replacements: { videoId },
            transaction: t
        };
        return VideoShareModel_1.sequelize.query(query, options);
    }
    static loadActorsWhoSharedVideosOf(actorOwnerId, t) {
        const safeOwnerId = forceNumber(actorOwnerId);
        const query = {
            where: {
                [Op.and]: [
                    literal(`EXISTS (` +
                        `  SELECT 1 FROM "videoShare" ` +
                        `  INNER JOIN "video" ON "videoShare"."videoId" = "video"."id" ` +
                        `  INNER JOIN "videoChannel" ON "videoChannel"."id" = "video"."channelId" ` +
                        `  INNER JOIN "account" ON "account"."id" = "videoChannel"."accountId" ` +
                        `  WHERE "videoShare"."actorId" = "ActorModel"."id" AND "account"."actorId" = ${safeOwnerId} ` +
                        `  LIMIT 1` +
                        `)`)
                ]
            },
            transaction: t
        };
        return ActorModel.findAll(query);
    }
    static loadActorsByVideoChannel(videoChannelId, t) {
        const safeChannelId = forceNumber(videoChannelId);
        const query = {
            where: {
                [Op.and]: [
                    literal(`EXISTS (` +
                        `  SELECT 1 FROM "videoShare" ` +
                        `  INNER JOIN "video" ON "videoShare"."videoId" = "video"."id" ` +
                        `  WHERE "videoShare"."actorId" = "ActorModel"."id" AND "video"."channelId" = ${safeChannelId} ` +
                        `  LIMIT 1` +
                        `)`)
                ]
            },
            transaction: t
        };
        return ActorModel.findAll(query);
    }
    static listAndCountByVideoId(videoId, start, count, t) {
        const query = {
            offset: start,
            limit: count,
            where: {
                videoId
            },
            transaction: t
        };
        return Promise.all([
            VideoShareModel_1.count(query),
            VideoShareModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static listRemoteShareUrlsOfLocalVideos() {
        const query = `SELECT "videoShare".url FROM "videoShare" ` +
            `INNER JOIN actor ON actor.id = "videoShare"."actorId" AND actor."serverId" IS NOT NULL ` +
            `INNER JOIN video ON video.id = "videoShare"."videoId" AND video.remote IS FALSE`;
        return VideoShareModel_1.sequelize.query(query, {
            type: QueryTypes.SELECT,
            raw: true
        }).then(rows => rows.map(r => r.url));
    }
    static cleanOldSharesOf(videoId, beforeUpdatedAt) {
        const query = {
            where: {
                updatedAt: {
                    [Op.lt]: beforeUpdatedAt
                },
                videoId,
                actorId: {
                    [Op.notIn]: buildLocalActorIdsIn()
                }
            }
        };
        return VideoShareModel_1.destroy(query);
    }
};
__decorate([
    AllowNull(false),
    Is('VideoShareUrl', value => throwIfNotValid(value, isActivityPubUrlValid, 'url')),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_SHARE.URL.max)),
    __metadata("design:type", String)
], VideoShareModel.prototype, "url", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoShareModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoShareModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => ActorModel),
    Column,
    __metadata("design:type", Number)
], VideoShareModel.prototype, "actorId", void 0);
__decorate([
    BelongsTo(() => ActorModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoShareModel.prototype, "Actor", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoShareModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoShareModel.prototype, "Video", void 0);
VideoShareModel = VideoShareModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.FULL]: {
            include: [
                {
                    model: ActorModel,
                    required: true
                },
                {
                    model: VideoModel,
                    required: true
                }
            ]
        },
        [ScopeNames.WITH_ACTOR]: {
            include: [
                {
                    model: ActorModel,
                    required: true
                }
            ]
        }
    })),
    Table({
        tableName: 'videoShare',
        indexes: [
            {
                fields: ['actorId']
            },
            {
                fields: ['videoId']
            },
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], VideoShareModel);
export { VideoShareModel };
//# sourceMappingURL=video-share.js.map