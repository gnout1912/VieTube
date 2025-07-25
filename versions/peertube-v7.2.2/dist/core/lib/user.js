import { UserAdminFlag, UserNotificationSettingValue, UserRole } from '@peertube/peertube-models';
import { logger } from '../helpers/logger.js';
import { CONFIG } from '../initializers/config.js';
import { UserModel } from '../models/user/user.js';
import { SERVER_ACTOR_NAME, WEBSERVER } from '../initializers/constants.js';
import { sequelizeTypescript } from '../initializers/database.js';
import { AccountModel } from '../models/account/account.js';
import { UserNotificationSettingModel } from '../models/user/user-notification-setting.js';
import { generateAndSaveActorKeys } from './activitypub/actors/index.js';
import { getLocalAccountActivityPubUrl } from './activitypub/url.js';
import { Emailer } from './emailer.js';
import { LiveQuotaStore } from './live/live-quota-store.js';
import { buildActorInstance, findAvailableLocalActorName } from './local-actor.js';
import { Redis } from './redis.js';
import { createLocalVideoChannelWithoutKeys } from './video-channel.js';
import { createWatchLaterPlaylist } from './video-playlist.js';
export function buildUser(options) {
    const { username, password, email, role = UserRole.USER, emailVerified, videoQuota = CONFIG.USER.VIDEO_QUOTA, videoQuotaDaily = CONFIG.USER.VIDEO_QUOTA_DAILY, adminFlags = UserAdminFlag.NONE, pluginAuth } = options;
    return new UserModel({
        username,
        password,
        email,
        nsfwPolicy: CONFIG.INSTANCE.DEFAULT_NSFW_POLICY,
        p2pEnabled: CONFIG.DEFAULTS.P2P.WEBAPP.ENABLED,
        videosHistoryEnabled: CONFIG.USER.HISTORY.VIDEOS.ENABLED,
        autoPlayVideo: CONFIG.DEFAULTS.PLAYER.AUTO_PLAY,
        role,
        emailVerified,
        adminFlags,
        videoQuota,
        videoQuotaDaily,
        pluginAuth
    });
}
export async function createUserAccountAndChannelAndPlaylist(parameters) {
    const { userToCreate, userDisplayName, channelNames, validateUser = true } = parameters;
    const { user, account, videoChannel } = await sequelizeTypescript.transaction(async (t) => {
        const userOptions = {
            transaction: t,
            validate: validateUser
        };
        const userCreated = await userToCreate.save(userOptions);
        userCreated.NotificationSetting = await createDefaultUserNotificationSettings(userCreated, t);
        const accountCreated = await createLocalAccountWithoutKeys({
            name: userCreated.username,
            displayName: userDisplayName,
            userId: userCreated.id,
            applicationId: null,
            t
        });
        userCreated.Account = accountCreated;
        const channelAttributes = await buildChannelAttributes({ user: userCreated, transaction: t, channelNames });
        const videoChannel = await createLocalVideoChannelWithoutKeys(channelAttributes, accountCreated, t);
        const videoPlaylist = await createWatchLaterPlaylist(accountCreated, t);
        return { user: userCreated, account: accountCreated, videoChannel, videoPlaylist };
    });
    const [accountActorWithKeys, channelActorWithKeys] = await Promise.all([
        generateAndSaveActorKeys(account.Actor),
        generateAndSaveActorKeys(videoChannel.Actor)
    ]);
    account.Actor = accountActorWithKeys;
    videoChannel.Actor = channelActorWithKeys;
    return { user, account, videoChannel };
}
export async function createLocalAccountWithoutKeys(parameters) {
    const { name, displayName, userId, applicationId, t, type = 'Person' } = parameters;
    const url = getLocalAccountActivityPubUrl(name);
    const actorInstance = buildActorInstance(type, url, name);
    const actorInstanceCreated = await actorInstance.save({ transaction: t });
    const accountInstance = new AccountModel({
        name: displayName || name,
        userId,
        applicationId,
        actorId: actorInstanceCreated.id
    });
    const accountInstanceCreated = await accountInstance.save({ transaction: t });
    accountInstanceCreated.Actor = actorInstanceCreated;
    return accountInstanceCreated;
}
export async function createApplicationActor(applicationId) {
    const accountCreated = await createLocalAccountWithoutKeys({
        name: SERVER_ACTOR_NAME,
        userId: null,
        applicationId,
        t: undefined,
        type: 'Application'
    });
    accountCreated.Actor = await generateAndSaveActorKeys(accountCreated.Actor);
    return accountCreated;
}
export async function buildUserVerifyEmail(user, isPendingEmail) {
    const verificationString = await Redis.Instance.setUserVerifyEmailVerificationString(user.id);
    const verifyEmailUrl = `${WEBSERVER.URL}/verify-account/email?userId=${user.id}&verificationString=${verificationString}`;
    if (isPendingEmail)
        return verifyEmailUrl + '&isPendingEmail=true';
    return verifyEmailUrl;
}
export async function buildRegistrationRequestVerifyEmail(registration) {
    const verificationString = await Redis.Instance.setRegistrationVerifyEmailVerificationString(registration.id);
    return `${WEBSERVER.URL}/verify-account/email?registrationId=${registration.id}&verificationString=${verificationString}`;
}
export async function sendVerifyUserChangeEmail(user) {
    Emailer.Instance.addUserVerifyChangeEmailJob({
        username: user.username,
        to: user.pendingEmail,
        verifyEmailUrl: await buildUserVerifyEmail(user, true)
    });
}
export async function sendVerifyRegistrationRequestEmail(registration) {
    Emailer.Instance.addRegistrationVerifyEmailJob({
        username: registration.username,
        to: registration.email,
        verifyEmailUrl: await buildRegistrationRequestVerifyEmail(registration),
        isRegistrationRequest: true
    });
}
export async function sendVerifyRegistrationEmail(user) {
    Emailer.Instance.addRegistrationVerifyEmailJob({
        username: user.username,
        to: user.email,
        verifyEmailUrl: await buildUserVerifyEmail(user, false),
        isRegistrationRequest: true
    });
}
export async function getOriginalVideoFileTotalFromUser(user) {
    const base = await UserModel.getUserQuota({ userId: user.id, daily: false });
    return base + LiveQuotaStore.Instance.getLiveQuotaOfUser(user.id);
}
export async function getOriginalVideoFileTotalDailyFromUser(user) {
    const base = await UserModel.getUserQuota({ userId: user.id, daily: true });
    return base + LiveQuotaStore.Instance.getLiveQuotaOfUser(user.id);
}
export async function isUserQuotaValid(options) {
    const { userId, uploadSize, checkDaily = true } = options;
    const user = await UserModel.loadById(userId);
    if (user.videoQuota === -1 && user.videoQuotaDaily === -1)
        return Promise.resolve(true);
    const [totalBytes, totalBytesDaily] = await Promise.all([
        getOriginalVideoFileTotalFromUser(user),
        getOriginalVideoFileTotalDailyFromUser(user)
    ]);
    const uploadedTotal = uploadSize + totalBytes;
    const uploadedDaily = uploadSize + totalBytesDaily;
    logger.debug('Check user %d quota to upload content.', userId, { totalBytes, totalBytesDaily, videoQuota: user.videoQuota, videoQuotaDaily: user.videoQuotaDaily, uploadSize });
    if (checkDaily && user.videoQuotaDaily !== -1 && uploadedDaily >= user.videoQuotaDaily)
        return false;
    if (user.videoQuota !== -1 && uploadedTotal >= user.videoQuota)
        return false;
    return true;
}
export function getByEmailPermissive(users, email, field = 'email') {
    if (users.length === 1)
        return users[0];
    return users.find(r => r[field] === email);
}
function createDefaultUserNotificationSettings(user, t) {
    const values = {
        userId: user.id,
        newVideoFromSubscription: UserNotificationSettingValue.WEB,
        newCommentOnMyVideo: UserNotificationSettingValue.WEB,
        myVideoImportFinished: UserNotificationSettingValue.WEB,
        myVideoPublished: UserNotificationSettingValue.WEB,
        abuseAsModerator: UserNotificationSettingValue.WEB | UserNotificationSettingValue.EMAIL,
        videoAutoBlacklistAsModerator: UserNotificationSettingValue.WEB | UserNotificationSettingValue.EMAIL,
        blacklistOnMyVideo: UserNotificationSettingValue.WEB | UserNotificationSettingValue.EMAIL,
        newUserRegistration: UserNotificationSettingValue.WEB,
        commentMention: UserNotificationSettingValue.WEB,
        newFollow: UserNotificationSettingValue.WEB,
        newInstanceFollower: UserNotificationSettingValue.WEB,
        abuseNewMessage: UserNotificationSettingValue.WEB | UserNotificationSettingValue.EMAIL,
        abuseStateChange: UserNotificationSettingValue.WEB | UserNotificationSettingValue.EMAIL,
        autoInstanceFollowing: UserNotificationSettingValue.WEB,
        newPeerTubeVersion: UserNotificationSettingValue.WEB | UserNotificationSettingValue.EMAIL,
        newPluginVersion: UserNotificationSettingValue.WEB,
        myVideoStudioEditionFinished: UserNotificationSettingValue.WEB,
        myVideoTranscriptionGenerated: UserNotificationSettingValue.WEB
    };
    return UserNotificationSettingModel.create(values, { transaction: t });
}
async function buildChannelAttributes(options) {
    const { user, transaction, channelNames } = options;
    if (channelNames)
        return channelNames;
    const channelName = await findAvailableLocalActorName(user.username + '_channel', transaction);
    const videoChannelDisplayName = CONFIG.USER.DEFAULT_CHANNEL_NAME.replace('$1', user.username);
    return {
        name: channelName,
        displayName: videoChannelDisplayName
    };
}
//# sourceMappingURL=user.js.map