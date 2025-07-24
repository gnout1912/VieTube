var UserNotificationModel_1;
import { __decorate, __metadata } from "tslib";
import { forceNumber, maxBy } from '@peertube/peertube-core-utils';
import { uuidToShort } from '@peertube/peertube-node-utils';
import { Op } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, Default, ForeignKey, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isBooleanValid } from '../../helpers/custom-validators/misc.js';
import { isUserNotificationTypeValid } from '../../helpers/custom-validators/user-notifications.js';
import { AbuseModel } from '../abuse/abuse.js';
import { AccountModel } from '../account/account.js';
import { ActorFollowModel } from '../actor/actor-follow.js';
import { ApplicationModel } from '../application/application.js';
import { PluginModel } from '../server/plugin.js';
import { SequelizeModel, throwIfNotValid } from '../shared/index.js';
import { getStateLabel } from '../video/formatter/video-api-format.js';
import { VideoBlacklistModel } from '../video/video-blacklist.js';
import { VideoCaptionModel } from '../video/video-caption.js';
import { VideoCommentModel } from '../video/video-comment.js';
import { VideoImportModel } from '../video/video-import.js';
import { VideoModel } from '../video/video.js';
import { UserNotificationListQueryBuilder } from './sql/user-notification-list-query-builder.js';
import { UserRegistrationModel } from './user-registration.js';
import { UserModel } from './user.js';
import { ActorImageModel } from '../actor/actor-image.js';
let UserNotificationModel = UserNotificationModel_1 = class UserNotificationModel extends SequelizeModel {
    static listForApi(options) {
        const { userId, start, count, sort, unread, typeOneOf } = options;
        const countWhere = { userId };
        const query = {
            offset: start,
            limit: count,
            sort,
            userId,
            unread,
            typeOneOf
        };
        if (unread !== undefined)
            countWhere['read'] = !unread;
        if (typeOneOf !== undefined)
            countWhere['type'] = { [Op.in]: typeOneOf };
        return Promise.all([
            UserNotificationModel_1.count({ where: countWhere })
                .then(count => count || 0),
            count === 0
                ? []
                : new UserNotificationListQueryBuilder(this.sequelize, query).listNotifications()
        ]).then(([total, data]) => ({ total, data }));
    }
    static markAsRead(userId, notificationIds) {
        const query = {
            where: {
                userId,
                id: {
                    [Op.in]: notificationIds
                },
                read: false
            }
        };
        return UserNotificationModel_1.update({ read: true }, query);
    }
    static markAllAsRead(userId) {
        const query = { where: { userId, read: false } };
        return UserNotificationModel_1.update({ read: true }, query);
    }
    static removeNotificationsOf(options) {
        const id = forceNumber(options.id);
        function buildAccountWhereQuery(base) {
            const whereSuffix = options.forUserId
                ? ` AND "userNotification"."userId" = ${options.forUserId}`
                : '';
            if (options.type === 'account') {
                return base +
                    ` WHERE "account"."id" = ${id} ${whereSuffix}`;
            }
            return base +
                ` WHERE "actor"."serverId" = ${id} ${whereSuffix}`;
        }
        const queries = [
            buildAccountWhereQuery(`SELECT "userNotification"."id" FROM "userNotification" ` +
                `INNER JOIN "account" ON "userNotification"."accountId" = "account"."id" ` +
                `INNER JOIN actor ON "actor"."id" = "account"."actorId" `),
            buildAccountWhereQuery(`SELECT "userNotification"."id" FROM "userNotification" ` +
                `INNER JOIN "actorFollow" ON "actorFollow".id = "userNotification"."actorFollowId" ` +
                `INNER JOIN actor ON actor.id = "actorFollow"."actorId" ` +
                `INNER JOIN account ON account."actorId" = actor.id `),
            buildAccountWhereQuery(`SELECT "userNotification"."id" FROM "userNotification" ` +
                `INNER JOIN "actorFollow" ON "actorFollow".id = "userNotification"."actorFollowId" ` +
                `INNER JOIN actor ON actor.id = "actorFollow"."actorId" ` +
                `INNER JOIN account ON account."actorId" = actor.id `),
            buildAccountWhereQuery(`SELECT "userNotification"."id" FROM "userNotification" ` +
                `INNER JOIN "videoComment" ON "videoComment".id = "userNotification"."commentId" ` +
                `INNER JOIN account ON account.id = "videoComment"."accountId" ` +
                `INNER JOIN actor ON "actor"."id" = "account"."actorId" `)
        ];
        const query = `DELETE FROM "userNotification" WHERE id IN (${queries.join(' UNION ')})`;
        return UserNotificationModel_1.sequelize.query(query);
    }
    toFormattedJSON() {
        const video = this.Video
            ? Object.assign(Object.assign({}, this.formatVideo(this.Video)), { channel: this.formatActor(this.Video.VideoChannel) }) : undefined;
        const videoImport = this.VideoImport
            ? {
                id: this.VideoImport.id,
                video: this.VideoImport.Video
                    ? this.formatVideo(this.VideoImport.Video)
                    : undefined,
                torrentName: this.VideoImport.torrentName,
                magnetUri: this.VideoImport.magnetUri,
                targetUrl: this.VideoImport.targetUrl
            }
            : undefined;
        const comment = this.VideoComment
            ? {
                id: this.VideoComment.id,
                threadId: this.VideoComment.getThreadId(),
                account: this.formatActor(this.VideoComment.Account),
                video: this.formatVideo(this.VideoComment.Video),
                heldForReview: this.VideoComment.heldForReview
            }
            : undefined;
        const abuse = this.Abuse ? this.formatAbuse(this.Abuse) : undefined;
        const videoBlacklist = this.VideoBlacklist
            ? {
                id: this.VideoBlacklist.id,
                video: this.formatVideo(this.VideoBlacklist.Video)
            }
            : undefined;
        const account = this.Account ? this.formatActor(this.Account) : undefined;
        const actorFollowingType = {
            Application: 'instance',
            Group: 'channel',
            Person: 'account'
        };
        const actorFollow = this.ActorFollow
            ? {
                id: this.ActorFollow.id,
                state: this.ActorFollow.state,
                follower: Object.assign({ id: this.ActorFollow.ActorFollower.Account.id, displayName: this.ActorFollow.ActorFollower.Account.getDisplayName(), name: this.ActorFollow.ActorFollower.preferredUsername, host: this.ActorFollow.ActorFollower.getHost() }, this.formatAvatars(this.ActorFollow.ActorFollower.Avatars)),
                following: {
                    type: actorFollowingType[this.ActorFollow.ActorFollowing.type],
                    displayName: (this.ActorFollow.ActorFollowing.VideoChannel || this.ActorFollow.ActorFollowing.Account).getDisplayName(),
                    name: this.ActorFollow.ActorFollowing.preferredUsername,
                    host: this.ActorFollow.ActorFollowing.getHost()
                }
            }
            : undefined;
        const plugin = this.Plugin
            ? {
                name: this.Plugin.name,
                type: this.Plugin.type,
                latestVersion: this.Plugin.latestVersion
            }
            : undefined;
        const peertube = this.Application
            ? { latestVersion: this.Application.latestPeerTubeVersion }
            : undefined;
        const registration = this.UserRegistration
            ? { id: this.UserRegistration.id, username: this.UserRegistration.username }
            : undefined;
        const videoCaption = this.VideoCaption
            ? {
                id: this.VideoCaption.id,
                language: {
                    id: this.VideoCaption.language,
                    label: VideoCaptionModel.getLanguageLabel(this.VideoCaption.language)
                },
                video: this.formatVideo(this.VideoCaption.Video)
            }
            : undefined;
        return {
            id: this.id,
            type: this.type,
            read: this.read,
            video,
            videoImport,
            comment,
            abuse,
            videoBlacklist,
            account,
            actorFollow,
            plugin,
            peertube,
            registration,
            videoCaption,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }
    formatVideo(video) {
        return {
            id: video.id,
            uuid: video.uuid,
            shortUUID: uuidToShort(video.uuid),
            name: video.name,
            state: {
                id: video.state,
                label: getStateLabel(video.state)
            }
        };
    }
    formatAbuse(abuse) {
        var _a, _b;
        const commentAbuse = ((_a = abuse.VideoCommentAbuse) === null || _a === void 0 ? void 0 : _a.VideoComment)
            ? {
                threadId: abuse.VideoCommentAbuse.VideoComment.getThreadId(),
                video: abuse.VideoCommentAbuse.VideoComment.Video
                    ? this.formatVideo(abuse.VideoCommentAbuse.VideoComment.Video)
                    : undefined
            }
            : undefined;
        const videoAbuse = ((_b = abuse.VideoAbuse) === null || _b === void 0 ? void 0 : _b.Video)
            ? this.formatVideo(abuse.VideoAbuse.Video)
            : undefined;
        const accountAbuse = (!commentAbuse && !videoAbuse && abuse.FlaggedAccount)
            ? this.formatActor(abuse.FlaggedAccount)
            : undefined;
        return {
            id: abuse.id,
            state: abuse.state,
            video: videoAbuse,
            comment: commentAbuse,
            account: accountAbuse
        };
    }
    formatActor(accountOrChannel) {
        return Object.assign({ id: accountOrChannel.id, displayName: accountOrChannel.getDisplayName(), name: accountOrChannel.Actor.preferredUsername, host: accountOrChannel.Actor.getHost() }, this.formatAvatars(accountOrChannel.Actor.Avatars));
    }
    formatAvatars(avatars) {
        if (!avatars || avatars.length === 0)
            return { avatar: undefined, avatars: [] };
        return {
            avatar: this.formatAvatar(maxBy(avatars, 'width')),
            avatars: avatars.map(a => this.formatAvatar(a))
        };
    }
    formatAvatar(a) {
        return {
            fileUrl: ActorImageModel.getImageUrl(a),
            path: a.getStaticPath(),
            width: a.width
        };
    }
};
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationType', value => throwIfNotValid(value, isUserNotificationTypeValid, 'type')),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "type", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Is('UserNotificationRead', value => throwIfNotValid(value, isBooleanValid, 'read')),
    Column,
    __metadata("design:type", Boolean)
], UserNotificationModel.prototype, "read", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], UserNotificationModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], UserNotificationModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "User", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "Video", void 0);
__decorate([
    ForeignKey(() => VideoCommentModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "commentId", void 0);
__decorate([
    BelongsTo(() => VideoCommentModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "VideoComment", void 0);
__decorate([
    ForeignKey(() => AbuseModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "abuseId", void 0);
__decorate([
    BelongsTo(() => AbuseModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "Abuse", void 0);
__decorate([
    ForeignKey(() => VideoBlacklistModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "videoBlacklistId", void 0);
__decorate([
    BelongsTo(() => VideoBlacklistModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "VideoBlacklist", void 0);
__decorate([
    ForeignKey(() => VideoImportModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "videoImportId", void 0);
__decorate([
    BelongsTo(() => VideoImportModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "VideoImport", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "Account", void 0);
__decorate([
    ForeignKey(() => ActorFollowModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "actorFollowId", void 0);
__decorate([
    BelongsTo(() => ActorFollowModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "ActorFollow", void 0);
__decorate([
    ForeignKey(() => PluginModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "pluginId", void 0);
__decorate([
    BelongsTo(() => PluginModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "Plugin", void 0);
__decorate([
    ForeignKey(() => ApplicationModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "applicationId", void 0);
__decorate([
    BelongsTo(() => ApplicationModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "Application", void 0);
__decorate([
    ForeignKey(() => UserRegistrationModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "userRegistrationId", void 0);
__decorate([
    BelongsTo(() => UserRegistrationModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "UserRegistration", void 0);
__decorate([
    ForeignKey(() => VideoCaptionModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationModel.prototype, "videoCaptionId", void 0);
__decorate([
    BelongsTo(() => VideoCaptionModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationModel.prototype, "VideoCaption", void 0);
UserNotificationModel = UserNotificationModel_1 = __decorate([
    Table({
        tableName: 'userNotification',
        indexes: [
            {
                fields: ['userId']
            },
            {
                fields: ['videoId'],
                where: {
                    videoId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['commentId'],
                where: {
                    commentId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['abuseId'],
                where: {
                    abuseId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['videoBlacklistId'],
                where: {
                    videoBlacklistId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['videoImportId'],
                where: {
                    videoImportId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['accountId'],
                where: {
                    accountId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['actorFollowId'],
                where: {
                    actorFollowId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['pluginId'],
                where: {
                    pluginId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['applicationId'],
                where: {
                    applicationId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['userRegistrationId'],
                where: {
                    userRegistrationId: {
                        [Op.ne]: null
                    }
                }
            }
        ]
    })
], UserNotificationModel);
export { UserNotificationModel };
//# sourceMappingURL=user-notification.js.map