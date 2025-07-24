var UserNotificationSettingModel_1;
import { __decorate, __metadata } from "tslib";
import { TokensCache } from '../../lib/auth/tokens-cache.js';
import { AfterDestroy, AfterUpdate, AllowNull, BelongsTo, Column, CreatedAt, Default, ForeignKey, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isUserNotificationSettingValid } from '../../helpers/custom-validators/user-notifications.js';
import { SequelizeModel, throwIfNotValid } from '../shared/index.js';
import { UserModel } from './user.js';
let UserNotificationSettingModel = UserNotificationSettingModel_1 = class UserNotificationSettingModel extends SequelizeModel {
    static removeTokenCache(instance) {
        return TokensCache.Instance.clearCacheByUserId(instance.userId);
    }
    static updateUserSettings(settings, userId) {
        const query = {
            where: {
                userId
            }
        };
        return UserNotificationSettingModel_1.update(settings, query);
    }
    toFormattedJSON() {
        return {
            newCommentOnMyVideo: this.newCommentOnMyVideo,
            newVideoFromSubscription: this.newVideoFromSubscription,
            abuseAsModerator: this.abuseAsModerator,
            videoAutoBlacklistAsModerator: this.videoAutoBlacklistAsModerator,
            blacklistOnMyVideo: this.blacklistOnMyVideo,
            myVideoPublished: this.myVideoPublished,
            myVideoImportFinished: this.myVideoImportFinished,
            newUserRegistration: this.newUserRegistration,
            commentMention: this.commentMention,
            newFollow: this.newFollow,
            newInstanceFollower: this.newInstanceFollower,
            autoInstanceFollowing: this.autoInstanceFollowing,
            abuseNewMessage: this.abuseNewMessage,
            abuseStateChange: this.abuseStateChange,
            newPeerTubeVersion: this.newPeerTubeVersion,
            myVideoStudioEditionFinished: this.myVideoStudioEditionFinished,
            myVideoTranscriptionGenerated: this.myVideoTranscriptionGenerated,
            newPluginVersion: this.newPluginVersion
        };
    }
};
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingNewVideoFromSubscription', value => throwIfNotValid(value, isUserNotificationSettingValid, 'newVideoFromSubscription')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "newVideoFromSubscription", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingNewCommentOnMyVideo', value => throwIfNotValid(value, isUserNotificationSettingValid, 'newCommentOnMyVideo')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "newCommentOnMyVideo", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingAbuseAsModerator', value => throwIfNotValid(value, isUserNotificationSettingValid, 'abuseAsModerator')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "abuseAsModerator", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingVideoAutoBlacklistAsModerator', value => throwIfNotValid(value, isUserNotificationSettingValid, 'videoAutoBlacklistAsModerator')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "videoAutoBlacklistAsModerator", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingBlacklistOnMyVideo', value => throwIfNotValid(value, isUserNotificationSettingValid, 'blacklistOnMyVideo')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "blacklistOnMyVideo", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingMyVideoPublished', value => throwIfNotValid(value, isUserNotificationSettingValid, 'myVideoPublished')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "myVideoPublished", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingMyVideoImportFinished', value => throwIfNotValid(value, isUserNotificationSettingValid, 'myVideoImportFinished')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "myVideoImportFinished", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingNewUserRegistration', value => throwIfNotValid(value, isUserNotificationSettingValid, 'newUserRegistration')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "newUserRegistration", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingNewInstanceFollower', value => throwIfNotValid(value, isUserNotificationSettingValid, 'newInstanceFollower')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "newInstanceFollower", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingNewInstanceFollower', value => throwIfNotValid(value, isUserNotificationSettingValid, 'autoInstanceFollowing')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "autoInstanceFollowing", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingNewFollow', value => throwIfNotValid(value, isUserNotificationSettingValid, 'newFollow')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "newFollow", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingCommentMention', value => throwIfNotValid(value, isUserNotificationSettingValid, 'commentMention')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "commentMention", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingAbuseStateChange', value => throwIfNotValid(value, isUserNotificationSettingValid, 'abuseStateChange')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "abuseStateChange", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingAbuseNewMessage', value => throwIfNotValid(value, isUserNotificationSettingValid, 'abuseNewMessage')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "abuseNewMessage", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingNewPeerTubeVersion', value => throwIfNotValid(value, isUserNotificationSettingValid, 'newPeerTubeVersion')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "newPeerTubeVersion", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingNewPeerPluginVersion', value => throwIfNotValid(value, isUserNotificationSettingValid, 'newPluginVersion')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "newPluginVersion", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingMyVideoStudioEditionFinished', value => throwIfNotValid(value, isUserNotificationSettingValid, 'myVideoStudioEditionFinished')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "myVideoStudioEditionFinished", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('UserNotificationSettingTranscriptionGeneratedForOwner', value => throwIfNotValid(value, isUserNotificationSettingValid, 'myVideoTranscriptionGenerated')),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "myVideoTranscriptionGenerated", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], UserNotificationSettingModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], UserNotificationSettingModel.prototype, "User", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], UserNotificationSettingModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], UserNotificationSettingModel.prototype, "updatedAt", void 0);
__decorate([
    AfterUpdate,
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UserNotificationSettingModel]),
    __metadata("design:returntype", void 0)
], UserNotificationSettingModel, "removeTokenCache", null);
UserNotificationSettingModel = UserNotificationSettingModel_1 = __decorate([
    Table({
        tableName: 'userNotificationSetting',
        indexes: [
            {
                fields: ['userId'],
                unique: true
            }
        ]
    })
], UserNotificationSettingModel);
export { UserNotificationSettingModel };
//# sourceMappingURL=user-notification-setting.js.map