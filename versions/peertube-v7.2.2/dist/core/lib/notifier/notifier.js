import { UserNotificationSettingValue } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { JobQueue } from '../job-queue/index.js';
import { PeerTubeSocket } from '../peertube-socket.js';
import { Hooks } from '../plugins/hooks.js';
import { AbuseStateChangeForReporter, AutoFollowForInstance, CommentMention, DirectRegistrationForModerators, FollowForInstance, FollowForUser, ImportFinishedForOwner, NewAbuseForModerators, NewAbuseMessageForModerators, NewAbuseMessageForReporter, NewAutoBlacklistForModerators, NewBlacklistForOwner, NewCommentForVideoOwner, NewPeerTubeVersionForAdmins, NewPluginVersionForAdmins, NewVideoOrLiveForSubscribers, OwnedPublicationAfterAutoUnblacklist, OwnedPublicationAfterScheduleUpdate, OwnedPublicationAfterTranscoding, RegistrationRequestForModerators, StudioEditionFinishedForOwner, UnblacklistForOwner, VideoTranscriptionGeneratedForOwner } from './shared/index.js';
const lTags = loggerTagsFactory('notifier');
class Notifier {
    constructor() {
        this.notificationModels = {
            newVideoOrLive: [NewVideoOrLiveForSubscribers],
            publicationAfterTranscoding: [OwnedPublicationAfterTranscoding],
            publicationAfterScheduleUpdate: [OwnedPublicationAfterScheduleUpdate],
            publicationAfterAutoUnblacklist: [OwnedPublicationAfterAutoUnblacklist],
            newComment: [CommentMention, NewCommentForVideoOwner],
            commentApproval: [CommentMention],
            newAbuse: [NewAbuseForModerators],
            newBlacklist: [NewBlacklistForOwner],
            unblacklist: [UnblacklistForOwner],
            importFinished: [ImportFinishedForOwner],
            directRegistration: [DirectRegistrationForModerators],
            registrationRequest: [RegistrationRequestForModerators],
            userFollow: [FollowForUser],
            instanceFollow: [FollowForInstance],
            autoInstanceFollow: [AutoFollowForInstance],
            newAutoBlacklist: [NewAutoBlacklistForModerators],
            abuseStateChange: [AbuseStateChangeForReporter],
            newAbuseMessage: [NewAbuseMessageForReporter, NewAbuseMessageForModerators],
            newPeertubeVersion: [NewPeerTubeVersionForAdmins],
            newPluginVersion: [NewPluginVersionForAdmins],
            videoStudioEditionFinished: [StudioEditionFinishedForOwner],
            videoTranscriptionGenerated: [VideoTranscriptionGeneratedForOwner]
        };
    }
    notifyOnNewVideoOrLiveIfNeeded(video) {
        const models = this.notificationModels.newVideoOrLive;
        logger.debug('Notify on new video or live if needed', Object.assign({ video: video.url }, lTags()));
        this.sendNotifications(models, video)
            .catch(err => logger.error('Cannot notify subscribers of new video %s.', video.url, { err }));
    }
    notifyOnVideoPublishedAfterTranscoding(video) {
        const models = this.notificationModels.publicationAfterTranscoding;
        logger.debug('Notify on published video after transcoding', Object.assign({ video: video.url }, lTags()));
        this.sendNotifications(models, video)
            .catch(err => logger.error('Cannot notify owner that its video %s has been published after transcoding.', video.url, { err }));
    }
    notifyOnVideoPublishedAfterScheduledUpdate(video) {
        const models = this.notificationModels.publicationAfterScheduleUpdate;
        logger.debug('Notify on published video after scheduled update', Object.assign({ video: video.url }, lTags()));
        this.sendNotifications(models, video)
            .catch(err => logger.error('Cannot notify owner that its video %s has been published after scheduled update.', video.url, { err }));
    }
    notifyOnVideoPublishedAfterRemovedFromAutoBlacklist(video) {
        const models = this.notificationModels.publicationAfterAutoUnblacklist;
        logger.debug('Notify on published video after being removed from auto blacklist', Object.assign({ video: video.url }, lTags()));
        this.sendNotifications(models, video)
            .catch(err => {
            logger.error('Cannot notify owner that its video %s has been published after removed from auto-blacklist.', video.url, { err });
        });
    }
    notifyOnNewComment(comment) {
        const models = this.notificationModels.newComment;
        logger.debug('Notify on new comment', Object.assign({ comment: comment.url }, lTags()));
        this.sendNotifications(models, comment)
            .catch(err => logger.error('Cannot notify of new comment %s.', comment.url, { err }));
    }
    notifyOnNewCommentApproval(comment) {
        const models = this.notificationModels.commentApproval;
        logger.debug('Notify on comment approval', Object.assign({ comment: comment.url }, lTags()));
        this.sendNotifications(models, comment)
            .catch(err => logger.error('Cannot notify on comment approval %s.', comment.url, { err }));
    }
    notifyOnNewAbuse(payload) {
        const models = this.notificationModels.newAbuse;
        logger.debug('Notify on new abuse', Object.assign({ abuse: payload.abuseInstance.id }, lTags()));
        this.sendNotifications(models, payload)
            .catch(err => logger.error('Cannot notify of new abuse %d.', payload.abuseInstance.id, { err }));
    }
    notifyOnVideoAutoBlacklist(videoBlacklist) {
        var _a;
        const models = this.notificationModels.newAutoBlacklist;
        logger.debug('Notify on video auto blacklist', Object.assign({ video: (_a = videoBlacklist === null || videoBlacklist === void 0 ? void 0 : videoBlacklist.Video) === null || _a === void 0 ? void 0 : _a.url }, lTags()));
        this.sendNotifications(models, videoBlacklist)
            .catch(err => logger.error('Cannot notify of auto-blacklist of video %s.', videoBlacklist.Video.url, { err }));
    }
    notifyOnVideoBlacklist(videoBlacklist) {
        var _a;
        const models = this.notificationModels.newBlacklist;
        logger.debug('Notify on video manual blacklist', Object.assign({ video: (_a = videoBlacklist === null || videoBlacklist === void 0 ? void 0 : videoBlacklist.Video) === null || _a === void 0 ? void 0 : _a.url }, lTags()));
        this.sendNotifications(models, videoBlacklist)
            .catch(err => logger.error('Cannot notify video owner of new video blacklist of %s.', videoBlacklist.Video.url, { err }));
    }
    notifyOnVideoUnblacklist(video) {
        const models = this.notificationModels.unblacklist;
        logger.debug('Notify on video unblacklist', Object.assign({ video: video.url }, lTags()));
        this.sendNotifications(models, video)
            .catch(err => logger.error('Cannot notify video owner of unblacklist of %s.', video.url, { err }));
    }
    notifyOnFinishedVideoImport(payload) {
        const models = this.notificationModels.importFinished;
        logger.debug('Notify on finished video import', Object.assign({ import: payload.videoImport.getTargetIdentifier() }, lTags()));
        this.sendNotifications(models, payload)
            .catch(err => {
            logger.error('Cannot notify owner that its video import %s is finished.', payload.videoImport.getTargetIdentifier(), { err });
        });
    }
    notifyOnNewDirectRegistration(user) {
        const models = this.notificationModels.directRegistration;
        logger.debug('Notify on new direct registration', Object.assign({ user: user.username }, lTags()));
        this.sendNotifications(models, user)
            .catch(err => logger.error('Cannot notify moderators of new user registration (%s).', user.username, { err }));
    }
    notifyOnNewRegistrationRequest(registration) {
        const models = this.notificationModels.registrationRequest;
        logger.debug('Notify on new registration request', Object.assign({ registration: registration.username }, lTags()));
        this.sendNotifications(models, registration)
            .catch(err => logger.error('Cannot notify moderators of new registration request (%s).', registration.username, { err }));
    }
    notifyOfNewUserFollow(actorFollow) {
        var _a, _b, _c, _d;
        const models = this.notificationModels.userFollow;
        const following = (_b = (_a = actorFollow === null || actorFollow === void 0 ? void 0 : actorFollow.ActorFollowing) === null || _a === void 0 ? void 0 : _a.VideoChannel) === null || _b === void 0 ? void 0 : _b.getDisplayName();
        const follower = (_d = (_c = actorFollow === null || actorFollow === void 0 ? void 0 : actorFollow.ActorFollower) === null || _c === void 0 ? void 0 : _c.Account) === null || _d === void 0 ? void 0 : _d.getDisplayName();
        logger.debug('Notify on new user follow', Object.assign({ following, follower }, lTags()));
        this.sendNotifications(models, actorFollow)
            .catch(err => {
            logger.error('Cannot notify owner of channel %s of a new follow by %s.', following, follower, { err });
        });
    }
    notifyOfNewInstanceFollow(actorFollow) {
        const models = this.notificationModels.instanceFollow;
        logger.debug('Notify on new instance follow', Object.assign({ follower: actorFollow.ActorFollower.url }, lTags()));
        this.sendNotifications(models, actorFollow)
            .catch(err => logger.error('Cannot notify administrators of new follower %s.', actorFollow.ActorFollower.url, { err }));
    }
    notifyOfAutoInstanceFollowing(actorFollow) {
        const models = this.notificationModels.autoInstanceFollow;
        logger.debug('Notify on new instance auto following', Object.assign({ following: actorFollow.ActorFollowing.url }, lTags()));
        this.sendNotifications(models, actorFollow)
            .catch(err => logger.error('Cannot notify administrators of auto instance following %s.', actorFollow.ActorFollowing.url, { err }));
    }
    notifyOnAbuseStateChange(abuse) {
        const models = this.notificationModels.abuseStateChange;
        logger.debug('Notify on abuse state change', Object.assign({ abuse: abuse.id }, lTags()));
        this.sendNotifications(models, abuse)
            .catch(err => logger.error('Cannot notify of abuse %d state change.', abuse.id, { err }));
    }
    notifyOnAbuseMessage(abuse, message) {
        const models = this.notificationModels.newAbuseMessage;
        logger.debug('Notify on abuse message', Object.assign({ abuse: abuse.id, message }, lTags()));
        this.sendNotifications(models, { abuse, message })
            .catch(err => logger.error('Cannot notify on new abuse %d message.', abuse.id, { err }));
    }
    notifyOfNewPeerTubeVersion(application, latestVersion) {
        const models = this.notificationModels.newPeertubeVersion;
        logger.debug('Notify on new peertube version', Object.assign({ currentVersion: application.version, latestVersion }, lTags()));
        this.sendNotifications(models, { application, latestVersion })
            .catch(err => logger.error('Cannot notify on new PeerTube version %s.', latestVersion, { err }));
    }
    notifyOfNewPluginVersion(plugin) {
        const models = this.notificationModels.newPluginVersion;
        logger.debug('Notify on new plugin version', Object.assign({ plugin: plugin.name }, lTags()));
        this.sendNotifications(models, plugin)
            .catch(err => logger.error('Cannot notify on new plugin version %s.', plugin.name, { err }));
    }
    notifyOfFinishedVideoStudioEdition(video) {
        const models = this.notificationModels.videoStudioEditionFinished;
        logger.debug('Notify on finished video studio edition', Object.assign({ video: video.url }, lTags()));
        this.sendNotifications(models, video)
            .catch(err => logger.error('Cannot notify on finished studio edition %s.', video.url, { err }));
    }
    notifyOfGeneratedVideoTranscription(caption) {
        const models = this.notificationModels.videoTranscriptionGenerated;
        const video = caption.Video;
        logger.debug('Notify on generated video transcription', Object.assign({ language: caption.language, video: video.url }, lTags()));
        this.sendNotifications(models, caption)
            .catch(err => logger.error('Cannot notify on generated video transcription %s of video %s.', caption.language, video.url, { err }));
    }
    async notify(object) {
        await object.prepare();
        const users = object.getTargetUsers();
        if (users.length === 0)
            return;
        if (await object.isDisabled())
            return;
        object.log();
        const toEmails = [];
        for (const user of users) {
            const setting = object.getSetting(user);
            const webNotificationEnabled = this.isWebNotificationEnabled(setting);
            const emailNotificationEnabled = this.isEmailEnabled(user, setting);
            const notification = object.createNotification(user);
            if (webNotificationEnabled) {
                await notification.save();
                PeerTubeSocket.Instance.sendNotification(user.id, notification);
            }
            if (emailNotificationEnabled) {
                toEmails.push(user.email);
            }
            Hooks.runAction('action:notifier.notification.created', { webNotificationEnabled, emailNotificationEnabled, user, notification });
        }
        for (const to of toEmails) {
            const payload = await object.createEmail(to);
            JobQueue.Instance.createJobAsync({ type: 'email', payload });
        }
    }
    isEmailEnabled(user, value) {
        if (CONFIG.SIGNUP.REQUIRES_EMAIL_VERIFICATION === true && user.emailVerified === false)
            return false;
        return (value & UserNotificationSettingValue.EMAIL) === UserNotificationSettingValue.EMAIL;
    }
    isWebNotificationEnabled(value) {
        return (value & UserNotificationSettingValue.WEB) === UserNotificationSettingValue.WEB;
    }
    async sendNotifications(models, payload) {
        for (const model of models) {
            await this.notify(new model(payload));
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { Notifier };
//# sourceMappingURL=notifier.js.map