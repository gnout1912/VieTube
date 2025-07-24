var UserModel_1;
import { __decorate, __metadata } from "tslib";
import { forceNumber, hasUserRight, USER_ROLE_LABELS } from '@peertube/peertube-core-utils';
import { AbuseState, NSFWFlag, UserAdminFlag, UserRole, VideoPlaylistType } from '@peertube/peertube-models';
import { isNSFWFlagsValid } from '../../helpers/custom-validators/videos.js';
import { CONFIG } from '../../initializers/config.js';
import { TokensCache } from '../../lib/auth/tokens-cache.js';
import { LiveQuotaStore } from '../../lib/live/index.js';
import { col, fn, literal, Op, QueryTypes, where } from 'sequelize';
import { AfterDestroy, AfterUpdate, AllowNull, BeforeCreate, BeforeUpdate, Column, CreatedAt, DataType, Default, DefaultScope, HasMany, HasOne, Is, IsEmail, IsUUID, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { isThemeNameValid } from '../../helpers/custom-validators/plugins.js';
import { isUserAdminFlagsValid, isUserAutoPlayNextVideoPlaylistValid, isUserAutoPlayNextVideoValid, isUserAutoPlayVideoValid, isUserBlockedReasonValid, isUserBlockedValid, isUserEmailVerifiedValid, isUserNoModal, isUserNSFWPolicyValid, isUserP2PEnabledValid, isUserPasswordValid, isUserRoleValid, isUserVideoLanguages, isUserVideoQuotaDailyValid, isUserVideoQuotaValid, isUserVideosHistoryEnabledValid } from '../../helpers/custom-validators/users.js';
import { comparePassword, cryptPassword } from '../../helpers/peertube-crypto.js';
import { DEFAULT_USER_THEME_NAME, NSFW_POLICY_TYPES } from '../../initializers/constants.js';
import { getThemeOrDefault } from '../../lib/plugins/theme-utils.js';
import { AccountModel } from '../account/account.js';
import { ActorFollowModel } from '../actor/actor-follow.js';
import { ActorImageModel } from '../actor/actor-image.js';
import { ActorModel } from '../actor/actor.js';
import { OAuthTokenModel } from '../oauth/oauth-token.js';
import { getAdminUsersSort, parseAggregateResult, SequelizeModel, throwIfNotValid } from '../shared/index.js';
import { VideoChannelModel } from '../video/video-channel.js';
import { VideoImportModel } from '../video/video-import.js';
import { VideoLiveModel } from '../video/video-live.js';
import { VideoPlaylistModel } from '../video/video-playlist.js';
import { VideoModel } from '../video/video.js';
import { UserExportModel } from './user-export.js';
import { UserNotificationSettingModel } from './user-notification-setting.js';
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["FOR_ME_API"] = "FOR_ME_API";
    ScopeNames["WITH_VIDEOCHANNELS"] = "WITH_VIDEOCHANNELS";
    ScopeNames["WITH_QUOTA"] = "WITH_QUOTA";
    ScopeNames["WITH_TOTAL_FILE_SIZES"] = "WITH_TOTAL_FILE_SIZES";
    ScopeNames["WITH_STATS"] = "WITH_STATS";
})(ScopeNames || (ScopeNames = {}));
let UserModel = UserModel_1 = class UserModel extends SequelizeModel {
    constructor() {
        super(...arguments);
        this.skipPasswordEncryption = false;
    }
    static async cryptPasswordIfNeeded(instance) {
        if (instance.skipPasswordEncryption)
            return;
        if (!instance.changed('password'))
            return;
        if (!instance.password)
            return;
        instance.password = await cryptPassword(instance.password);
    }
    static removeTokenCache(instance) {
        return TokensCache.Instance.clearCacheByUserId(instance.id);
    }
    static countTotal() {
        return UserModel_1.unscoped().count();
    }
    static listForAdminApi(parameters) {
        const { start, count, sort, search, blocked } = parameters;
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
        if (blocked !== undefined) {
            Object.assign(where, { blocked });
        }
        const query = {
            offset: start,
            limit: count,
            order: getAdminUsersSort(sort),
            where
        };
        return Promise.all([
            UserModel_1.unscoped().count(query),
            UserModel_1.scope(['defaultScope', ScopeNames.WITH_QUOTA, ScopeNames.WITH_TOTAL_FILE_SIZES]).findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static listWithRight(right) {
        const roles = Object.keys(USER_ROLE_LABELS)
            .map(k => parseInt(k, 10))
            .filter(role => hasUserRight(role, right));
        const query = {
            where: {
                role: {
                    [Op.in]: roles
                }
            }
        };
        return UserModel_1.findAll(query);
    }
    static listUserSubscribersOf(actorId) {
        const query = {
            include: [
                {
                    model: UserNotificationSettingModel.unscoped(),
                    required: true
                },
                {
                    attributes: ['userId'],
                    model: AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: [],
                            model: ActorModel.unscoped(),
                            required: true,
                            where: {
                                serverId: null
                            },
                            include: [
                                {
                                    attributes: [],
                                    as: 'ActorFollowings',
                                    model: ActorFollowModel.unscoped(),
                                    required: true,
                                    where: {
                                        state: 'accepted',
                                        targetActorId: actorId
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        return UserModel_1.unscoped().findAll(query);
    }
    static listByUsernames(usernames) {
        const query = {
            where: {
                username: usernames
            }
        };
        return UserModel_1.findAll(query);
    }
    static loadById(id) {
        return UserModel_1.unscoped().findByPk(id);
    }
    static loadByIdFull(id) {
        return UserModel_1.findByPk(id);
    }
    static loadByIdWithChannels(id, withStats = false) {
        const scopes = [ScopeNames.WITH_VIDEOCHANNELS];
        if (withStats) {
            const scopeOptions = { whereUserId: '$userId' };
            scopes.push({ method: [ScopeNames.WITH_QUOTA, scopeOptions] });
            scopes.push({ method: [ScopeNames.WITH_STATS, scopeOptions] });
            scopes.push({ method: [ScopeNames.WITH_TOTAL_FILE_SIZES, scopeOptions] });
        }
        return UserModel_1.scope(scopes).findOne({
            where: { id },
            bind: { userId: id }
        });
    }
    static loadByUsername(username) {
        const query = {
            where: {
                username
            }
        };
        return UserModel_1.findOne(query);
    }
    static loadForMeAPI(id) {
        const query = {
            where: {
                id
            }
        };
        return UserModel_1.scope(ScopeNames.FOR_ME_API).findOne(query);
    }
    static loadByEmailCaseInsensitive(email) {
        const query = {
            where: where(fn('LOWER', col('email')), '=', email.toLowerCase())
        };
        return UserModel_1.findAll(query);
    }
    static loadByPendingEmailCaseInsensitive(pendingEmail) {
        const query = {
            where: where(fn('LOWER', col('pendingEmail')), '=', pendingEmail.toLowerCase())
        };
        return UserModel_1.findAll(query);
    }
    static loadByUsernameOrEmailCaseInsensitive(usernameOrEmail) {
        const query = {
            where: {
                [Op.or]: [
                    where(fn('lower', col('username')), fn('lower', usernameOrEmail)),
                    where(fn('lower', col('email')), fn('lower', usernameOrEmail))
                ]
            }
        };
        return UserModel_1.findAll(query);
    }
    static loadByVideoId(videoId) {
        const query = {
            include: [
                {
                    required: true,
                    attributes: ['id'],
                    model: AccountModel.unscoped(),
                    include: [
                        {
                            required: true,
                            attributes: ['id'],
                            model: VideoChannelModel.unscoped(),
                            include: [
                                {
                                    required: true,
                                    attributes: ['id'],
                                    model: VideoModel.unscoped(),
                                    where: {
                                        id: videoId
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        return UserModel_1.findOne(query);
    }
    static loadByVideoImportId(videoImportId) {
        const query = {
            include: [
                {
                    required: true,
                    attributes: ['id'],
                    model: VideoImportModel.unscoped(),
                    where: {
                        id: videoImportId
                    }
                }
            ]
        };
        return UserModel_1.findOne(query);
    }
    static loadByChannelActorId(videoChannelActorId) {
        const query = {
            include: [
                {
                    required: true,
                    attributes: ['id'],
                    model: AccountModel.unscoped(),
                    include: [
                        {
                            required: true,
                            attributes: ['id'],
                            model: VideoChannelModel.unscoped(),
                            where: {
                                actorId: videoChannelActorId
                            }
                        }
                    ]
                }
            ]
        };
        return UserModel_1.findOne(query);
    }
    static loadByAccountId(accountId) {
        const query = {
            include: [
                {
                    required: true,
                    attributes: ['id'],
                    model: AccountModel.unscoped(),
                    where: {
                        id: accountId
                    }
                }
            ]
        };
        return UserModel_1.findOne(query);
    }
    static loadByAccountActorId(accountActorId) {
        const query = {
            include: [
                {
                    required: true,
                    attributes: ['id'],
                    model: AccountModel.unscoped(),
                    where: {
                        actorId: accountActorId
                    }
                }
            ]
        };
        return UserModel_1.findOne(query);
    }
    static loadByLiveId(liveId) {
        const query = {
            include: [
                {
                    attributes: ['id'],
                    model: AccountModel.unscoped(),
                    required: true,
                    include: [
                        {
                            attributes: ['id'],
                            model: VideoChannelModel.unscoped(),
                            required: true,
                            include: [
                                {
                                    attributes: ['id'],
                                    model: VideoModel.unscoped(),
                                    required: true,
                                    include: [
                                        {
                                            attributes: [],
                                            model: VideoLiveModel.unscoped(),
                                            required: true,
                                            where: {
                                                id: liveId
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        return UserModel_1.unscoped().findOne(query);
    }
    static generateUserQuotaBaseSQL(options) {
        const { daily, whereUserId, onlyMaxResolution } = options;
        const andWhere = daily === true
            ? 'AND "video"."createdAt" > now() - interval \'24 hours\''
            : '';
        const videoChannelJoin = 'INNER JOIN "videoChannel" ON "videoChannel"."id" = "video"."channelId" ' +
            'INNER JOIN "account" ON "videoChannel"."accountId" = "account"."id" ' +
            `WHERE "account"."userId" = ${whereUserId} ${andWhere}`;
        const webVideoFiles = 'SELECT "videoFile"."size" AS "size", "video"."id" AS "videoId" FROM "videoFile" ' +
            'INNER JOIN "video" ON "videoFile"."videoId" = "video"."id" AND "video"."isLive" IS FALSE ' +
            videoChannelJoin;
        const hlsFiles = 'SELECT "videoFile"."size" AS "size", "video"."id" AS "videoId" FROM "videoFile" ' +
            'INNER JOIN "videoStreamingPlaylist" ON "videoFile"."videoStreamingPlaylistId" = "videoStreamingPlaylist".id ' +
            'INNER JOIN "video" ON "videoStreamingPlaylist"."videoId" = "video"."id" AND "video"."isLive" IS FALSE ' +
            videoChannelJoin;
        const sizeSelect = onlyMaxResolution
            ? 'MAX("t1"."size")'
            : 'SUM("t1"."size")';
        return 'SELECT COALESCE(SUM("size"), 0) AS "total" ' +
            'FROM (' +
            `SELECT ${sizeSelect} AS "size" FROM (${webVideoFiles} UNION ${hlsFiles}) t1 ` +
            'GROUP BY "t1"."videoId"' +
            ') t2';
    }
    static async getUserQuota(options) {
        const { daily, userId } = options;
        const sql = this.generateUserQuotaBaseSQL({ daily, whereUserId: '$userId', onlyMaxResolution: true });
        const queryOptions = {
            bind: { userId },
            type: QueryTypes.SELECT
        };
        const [{ total }] = await UserModel_1.sequelize.query(sql, queryOptions);
        if (!total)
            return 0;
        return parseInt(total, 10);
    }
    static getStats() {
        const query = `SELECT ` +
            `COUNT(*) AS "totalUsers", ` +
            `COUNT(*) FILTER (WHERE "lastLoginDate" > NOW() - INTERVAL '1d') AS "totalDailyActiveUsers", ` +
            `COUNT(*) FILTER (WHERE "lastLoginDate" > NOW() - INTERVAL '7d') AS "totalWeeklyActiveUsers", ` +
            `COUNT(*) FILTER (WHERE "lastLoginDate" > NOW() - INTERVAL '30d') AS "totalMonthlyActiveUsers", ` +
            `COUNT(*) FILTER (WHERE "lastLoginDate" > NOW() - INTERVAL '180d') AS "totalHalfYearActiveUsers", ` +
            `COUNT(*) FILTER (WHERE "role" = ${UserRole.MODERATOR}) AS "totalModerators", ` +
            `COUNT(*) FILTER (WHERE "role" = ${UserRole.ADMINISTRATOR}) AS "totalAdmins" ` +
            `FROM "user"`;
        return UserModel_1.sequelize.query(query, {
            type: QueryTypes.SELECT,
            raw: true
        }).then(([row]) => {
            return {
                totalUsers: parseAggregateResult(row.totalUsers),
                totalDailyActiveUsers: parseAggregateResult(row.totalDailyActiveUsers),
                totalWeeklyActiveUsers: parseAggregateResult(row.totalWeeklyActiveUsers),
                totalMonthlyActiveUsers: parseAggregateResult(row.totalMonthlyActiveUsers),
                totalHalfYearActiveUsers: parseAggregateResult(row.totalHalfYearActiveUsers),
                totalModerators: parseAggregateResult(row.totalModerators),
                totalAdmins: parseAggregateResult(row.totalAdmins)
            };
        });
    }
    static autoComplete(search) {
        const query = {
            where: {
                username: {
                    [Op.like]: `%${search}%`
                }
            },
            limit: 10
        };
        return UserModel_1.findAll(query)
            .then(u => u.map(u => u.username));
    }
    hasRight(right) {
        return hasUserRight(this.role, right);
    }
    hasAdminFlag(flag) {
        return this.adminFlags & flag;
    }
    isPasswordMatch(password) {
        if (!password || !this.password)
            return false;
        return comparePassword(password, this.password);
    }
    toFormattedJSON(parameters = {}) {
        const videoQuotaUsed = this.get('videoQuotaUsed');
        const videoQuotaUsedDaily = this.get('videoQuotaUsedDaily');
        const videosCount = this.get('videosCount');
        const [abusesCount, abusesAcceptedCount] = (this.get('abusesCount') || ':').split(':');
        const abusesCreatedCount = this.get('abusesCreatedCount');
        const videoCommentsCount = this.get('videoCommentsCount');
        const totalVideoFileSize = this.get('totalVideoFileSize');
        const json = {
            id: this.id,
            username: this.username,
            email: this.email,
            theme: getThemeOrDefault(this.theme, DEFAULT_USER_THEME_NAME),
            pendingEmail: this.pendingEmail,
            emailPublic: this.emailPublic,
            emailVerified: this.emailVerified,
            nsfwPolicy: this.nsfwPolicy,
            nsfwFlagsDisplayed: CONFIG.NSFW_FLAGS_SETTINGS.ENABLED
                ? this.nsfwFlagsDisplayed
                : NSFWFlag.NONE,
            nsfwFlagsHidden: CONFIG.NSFW_FLAGS_SETTINGS.ENABLED
                ? this.nsfwFlagsHidden
                : NSFWFlag.NONE,
            nsfwFlagsWarned: CONFIG.NSFW_FLAGS_SETTINGS.ENABLED
                ? this.nsfwFlagsWarned
                : NSFWFlag.NONE,
            nsfwFlagsBlurred: CONFIG.NSFW_FLAGS_SETTINGS.ENABLED
                ? this.nsfwFlagsBlurred
                : NSFWFlag.NONE,
            p2pEnabled: this.p2pEnabled,
            videosHistoryEnabled: this.videosHistoryEnabled,
            autoPlayVideo: this.autoPlayVideo,
            autoPlayNextVideo: this.autoPlayNextVideo,
            autoPlayNextVideoPlaylist: this.autoPlayNextVideoPlaylist,
            videoLanguages: this.videoLanguages,
            role: {
                id: this.role,
                label: USER_ROLE_LABELS[this.role]
            },
            videoQuota: this.videoQuota,
            videoQuotaDaily: this.videoQuotaDaily,
            totalVideoFileSize: totalVideoFileSize !== undefined
                ? forceNumber(totalVideoFileSize)
                : undefined,
            videoQuotaUsed: videoQuotaUsed !== undefined
                ? forceNumber(videoQuotaUsed) + LiveQuotaStore.Instance.getLiveQuotaOfUser(this.id)
                : undefined,
            videoQuotaUsedDaily: videoQuotaUsedDaily !== undefined
                ? forceNumber(videoQuotaUsedDaily) + LiveQuotaStore.Instance.getLiveQuotaOfUser(this.id)
                : undefined,
            videosCount: videosCount !== undefined
                ? forceNumber(videosCount)
                : undefined,
            abusesCount: abusesCount
                ? forceNumber(abusesCount)
                : undefined,
            abusesAcceptedCount: abusesAcceptedCount
                ? forceNumber(abusesAcceptedCount)
                : undefined,
            abusesCreatedCount: abusesCreatedCount !== undefined
                ? forceNumber(abusesCreatedCount)
                : undefined,
            videoCommentsCount: videoCommentsCount !== undefined
                ? forceNumber(videoCommentsCount)
                : undefined,
            noInstanceConfigWarningModal: this.noInstanceConfigWarningModal,
            noWelcomeModal: this.noWelcomeModal,
            noAccountSetupWarningModal: this.noAccountSetupWarningModal,
            blocked: this.blocked,
            blockedReason: this.blockedReason,
            account: this.Account.toFormattedJSON(),
            notificationSettings: this.NotificationSetting
                ? this.NotificationSetting.toFormattedJSON()
                : undefined,
            videoChannels: [],
            createdAt: this.createdAt,
            pluginAuth: this.pluginAuth,
            lastLoginDate: this.lastLoginDate,
            twoFactorEnabled: !!this.otpSecret
        };
        if (parameters.withAdminFlags) {
            Object.assign(json, { adminFlags: this.adminFlags });
        }
        if (Array.isArray(this.Account.VideoChannels) === true) {
            json.videoChannels = this.Account.VideoChannels
                .map(c => c.toFormattedJSON())
                .sort((v1, v2) => {
                if (v1.createdAt < v2.createdAt)
                    return -1;
                if (v1.createdAt === v2.createdAt)
                    return 0;
                return 1;
            });
        }
        return json;
    }
    toMeFormattedJSON() {
        const formatted = this.toFormattedJSON({ withAdminFlags: true });
        const specialPlaylists = this.Account.VideoPlaylists
            .map(p => ({ id: p.id, name: p.name, type: p.type }));
        return Object.assign(formatted, { specialPlaylists });
    }
};
__decorate([
    AllowNull(true),
    Is('UserPassword', value => throwIfNotValid(value, isUserPasswordValid, 'user password', true)),
    Column,
    __metadata("design:type", String)
], UserModel.prototype, "password", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], UserModel.prototype, "username", void 0);
__decorate([
    AllowNull(false),
    IsEmail,
    Column(DataType.STRING(400)),
    __metadata("design:type", String)
], UserModel.prototype, "email", void 0);
__decorate([
    AllowNull(true),
    IsEmail,
    Column(DataType.STRING(400)),
    __metadata("design:type", String)
], UserModel.prototype, "pendingEmail", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('UserEmailVerified', value => throwIfNotValid(value, isUserEmailVerifiedValid, 'email verified boolean', true)),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "emailVerified", void 0);
__decorate([
    AllowNull(false),
    Is('UserNSFWPolicy', value => throwIfNotValid(value, isUserNSFWPolicyValid, 'NSFW policy')),
    Column(DataType.ENUM(...Object.values(NSFW_POLICY_TYPES))),
    __metadata("design:type", String)
], UserModel.prototype, "nsfwPolicy", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    Is('UserNSFWFlagsDisplayed', value => throwIfNotValid(value, isNSFWFlagsValid, 'NSFW flags')),
    Column,
    __metadata("design:type", Number)
], UserModel.prototype, "nsfwFlagsDisplayed", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    Is('UserNSFWFlagsHidden', value => throwIfNotValid(value, isNSFWFlagsValid, 'NSFW flags')),
    Column,
    __metadata("design:type", Number)
], UserModel.prototype, "nsfwFlagsHidden", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    Is('nsfwFlagsBlurred', value => throwIfNotValid(value, isNSFWFlagsValid, 'NSFW flags')),
    Column,
    __metadata("design:type", Number)
], UserModel.prototype, "nsfwFlagsBlurred", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    Is('UserNSFWFlagsWarned', value => throwIfNotValid(value, isNSFWFlagsValid, 'NSFW flags')),
    Column,
    __metadata("design:type", Number)
], UserModel.prototype, "nsfwFlagsWarned", void 0);
__decorate([
    AllowNull(false),
    Is('p2pEnabled', value => throwIfNotValid(value, isUserP2PEnabledValid, 'P2P enabled')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "p2pEnabled", void 0);
__decorate([
    AllowNull(false),
    Default(true),
    Is('UserVideosHistoryEnabled', value => throwIfNotValid(value, isUserVideosHistoryEnabledValid, 'Videos history enabled')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "videosHistoryEnabled", void 0);
__decorate([
    AllowNull(false),
    Default(true),
    Is('UserAutoPlayVideo', value => throwIfNotValid(value, isUserAutoPlayVideoValid, 'auto play video boolean')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "autoPlayVideo", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Is('UserAutoPlayNextVideo', value => throwIfNotValid(value, isUserAutoPlayNextVideoValid, 'auto play next video boolean')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "autoPlayNextVideo", void 0);
__decorate([
    AllowNull(false),
    Default(true),
    Is('UserAutoPlayNextVideoPlaylist', value => throwIfNotValid(value, isUserAutoPlayNextVideoPlaylistValid, 'auto play next video for playlists boolean')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "autoPlayNextVideoPlaylist", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('UserVideoLanguages', value => throwIfNotValid(value, isUserVideoLanguages, 'video languages')),
    Column(DataType.ARRAY(DataType.STRING)),
    __metadata("design:type", Array)
], UserModel.prototype, "videoLanguages", void 0);
__decorate([
    AllowNull(false),
    Default(UserAdminFlag.NONE),
    Is('UserAdminFlags', value => throwIfNotValid(value, isUserAdminFlagsValid, 'user admin flags')),
    Column,
    __metadata("design:type", Number)
], UserModel.prototype, "adminFlags", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Is('UserBlocked', value => throwIfNotValid(value, isUserBlockedValid, 'blocked boolean')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "blocked", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('UserBlockedReason', value => throwIfNotValid(value, isUserBlockedReasonValid, 'blocked reason', true)),
    Column,
    __metadata("design:type", String)
], UserModel.prototype, "blockedReason", void 0);
__decorate([
    AllowNull(false),
    Is('UserRole', value => throwIfNotValid(value, isUserRoleValid, 'role')),
    Column,
    __metadata("design:type", Number)
], UserModel.prototype, "role", void 0);
__decorate([
    AllowNull(false),
    Is('UserVideoQuota', value => throwIfNotValid(value, isUserVideoQuotaValid, 'video quota')),
    Column(DataType.BIGINT),
    __metadata("design:type", Number)
], UserModel.prototype, "videoQuota", void 0);
__decorate([
    AllowNull(false),
    Is('UserVideoQuotaDaily', value => throwIfNotValid(value, isUserVideoQuotaDailyValid, 'video quota daily')),
    Column(DataType.BIGINT),
    __metadata("design:type", Number)
], UserModel.prototype, "videoQuotaDaily", void 0);
__decorate([
    AllowNull(false),
    Default(DEFAULT_USER_THEME_NAME),
    Is('UserTheme', value => throwIfNotValid(value, isThemeNameValid, 'theme')),
    Column,
    __metadata("design:type", String)
], UserModel.prototype, "theme", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Is('UserNoInstanceConfigWarningModal', value => throwIfNotValid(value, isUserNoModal, 'no instance config warning modal')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "noInstanceConfigWarningModal", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Is('UserNoWelcomeModal', value => throwIfNotValid(value, isUserNoModal, 'no welcome modal')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "noWelcomeModal", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Is('UserNoAccountSetupWarningModal', value => throwIfNotValid(value, isUserNoModal, 'no account setup warning modal')),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "noAccountSetupWarningModal", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", String)
], UserModel.prototype, "pluginAuth", void 0);
__decorate([
    AllowNull(false),
    Default(DataType.UUIDV4),
    IsUUID(4),
    Column(DataType.UUID),
    __metadata("design:type", String)
], UserModel.prototype, "feedToken", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Date)
], UserModel.prototype, "lastLoginDate", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Column,
    __metadata("design:type", Boolean)
], UserModel.prototype, "emailPublic", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", String)
], UserModel.prototype, "otpSecret", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], UserModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], UserModel.prototype, "updatedAt", void 0);
__decorate([
    HasOne(() => AccountModel, {
        foreignKey: 'userId',
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Object)
], UserModel.prototype, "Account", void 0);
__decorate([
    HasOne(() => UserNotificationSettingModel, {
        foreignKey: 'userId',
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Object)
], UserModel.prototype, "NotificationSetting", void 0);
__decorate([
    HasMany(() => VideoImportModel, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], UserModel.prototype, "VideoImports", void 0);
__decorate([
    HasMany(() => OAuthTokenModel, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], UserModel.prototype, "OAuthTokens", void 0);
__decorate([
    HasMany(() => UserExportModel, {
        foreignKey: 'userId',
        onDelete: 'cascade',
        hooks: true
    }),
    __metadata("design:type", Array)
], UserModel.prototype, "UserExports", void 0);
__decorate([
    BeforeCreate,
    BeforeUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UserModel]),
    __metadata("design:returntype", Promise)
], UserModel, "cryptPasswordIfNeeded", null);
__decorate([
    AfterUpdate,
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UserModel]),
    __metadata("design:returntype", void 0)
], UserModel, "removeTokenCache", null);
UserModel = UserModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: AccountModel,
                required: true
            },
            {
                model: UserNotificationSettingModel,
                required: true
            }
        ]
    })),
    Scopes(() => ({
        [ScopeNames.FOR_ME_API]: {
            include: [
                {
                    model: AccountModel,
                    include: [
                        {
                            model: VideoChannelModel.unscoped(),
                            include: [
                                {
                                    model: ActorModel,
                                    required: true,
                                    include: [
                                        {
                                            model: ActorImageModel,
                                            as: 'Banners',
                                            required: false
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            attributes: ['id', 'name', 'type'],
                            model: VideoPlaylistModel.unscoped(),
                            required: true,
                            where: {
                                type: {
                                    [Op.ne]: VideoPlaylistType.REGULAR
                                }
                            }
                        }
                    ]
                },
                {
                    model: UserNotificationSettingModel,
                    required: true
                }
            ]
        },
        [ScopeNames.WITH_VIDEOCHANNELS]: {
            include: [
                {
                    model: AccountModel,
                    include: [
                        {
                            model: VideoChannelModel
                        },
                        {
                            attributes: ['id', 'name', 'type'],
                            model: VideoPlaylistModel.unscoped(),
                            required: true,
                            where: {
                                type: {
                                    [Op.ne]: VideoPlaylistType.REGULAR
                                }
                            }
                        }
                    ]
                }
            ]
        },
        [ScopeNames.WITH_QUOTA]: (options = {}) => {
            var _a, _b;
            return {
                attributes: {
                    include: [
                        [
                            literal('(' +
                                UserModel.generateUserQuotaBaseSQL({
                                    whereUserId: (_a = options.whereUserId) !== null && _a !== void 0 ? _a : '"UserModel"."id"',
                                    daily: false,
                                    onlyMaxResolution: true
                                }) +
                                ')'),
                            'videoQuotaUsed'
                        ],
                        [
                            literal('(' +
                                UserModel.generateUserQuotaBaseSQL({
                                    whereUserId: (_b = options.whereUserId) !== null && _b !== void 0 ? _b : '"UserModel"."id"',
                                    daily: true,
                                    onlyMaxResolution: true
                                }) +
                                ')'),
                            'videoQuotaUsedDaily'
                        ]
                    ]
                }
            };
        },
        [ScopeNames.WITH_TOTAL_FILE_SIZES]: (options = {}) => {
            var _a;
            return {
                attributes: {
                    include: [
                        [
                            literal('(' +
                                UserModel.generateUserQuotaBaseSQL({
                                    whereUserId: (_a = options.whereUserId) !== null && _a !== void 0 ? _a : '"UserModel"."id"',
                                    daily: false,
                                    onlyMaxResolution: false
                                }) +
                                ')'),
                            'totalVideoFileSize'
                        ]
                    ]
                }
            };
        },
        [ScopeNames.WITH_STATS]: (options = {}) => {
            return {
                attributes: {
                    include: [
                        [
                            literal('(' +
                                'SELECT COUNT("video"."id") ' +
                                'FROM "video" ' +
                                'INNER JOIN "videoChannel" ON "videoChannel"."id" = "video"."channelId" ' +
                                'INNER JOIN "account" ON "account"."id" = "videoChannel"."accountId" ' +
                                `WHERE "account"."userId" = ${options.whereUserId}` +
                                ')'),
                            'videosCount'
                        ],
                        [
                            literal('(' +
                                `SELECT concat_ws(':', "abuses", "acceptedAbuses") ` +
                                'FROM (' +
                                'SELECT COUNT("abuse"."id") AS "abuses", ' +
                                `COUNT("abuse"."id") FILTER (WHERE "abuse"."state" = ${AbuseState.ACCEPTED}) AS "acceptedAbuses" ` +
                                'FROM "abuse" ' +
                                'INNER JOIN "account" ON "account"."id" = "abuse"."flaggedAccountId" ' +
                                `WHERE "account"."userId" = ${options.whereUserId}` +
                                ') t' +
                                ')'),
                            'abusesCount'
                        ],
                        [
                            literal('(' +
                                'SELECT COUNT("abuse"."id") ' +
                                'FROM "abuse" ' +
                                'INNER JOIN "account" ON "account"."id" = "abuse"."reporterAccountId" ' +
                                `WHERE "account"."userId" = ${options.whereUserId}` +
                                ')'),
                            'abusesCreatedCount'
                        ],
                        [
                            literal('(' +
                                'SELECT COUNT("videoComment"."id") ' +
                                'FROM "videoComment" ' +
                                'INNER JOIN "account" ON "account"."id" = "videoComment"."accountId" ' +
                                `WHERE "account"."userId" = ${options.whereUserId}` +
                                ')'),
                            'videoCommentsCount'
                        ]
                    ]
                }
            };
        }
    })),
    Table({
        tableName: 'user',
        indexes: [
            {
                fields: ['username'],
                unique: true
            },
            {
                fields: ['email'],
                unique: true
            }
        ]
    })
], UserModel);
export { UserModel };
//# sourceMappingURL=user.js.map