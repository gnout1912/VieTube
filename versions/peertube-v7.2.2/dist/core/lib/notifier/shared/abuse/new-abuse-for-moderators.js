import { logger } from '../../../../helpers/logger.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { getAbuseIdentifier } from '../../../activitypub/url.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType, UserRight } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class NewAbuseForModerators extends AbstractNotification {
    async prepare() {
        this.moderators = await UserModel.listWithRight(UserRight.MANAGE_ABUSES);
    }
    log() {
        logger.info('Notifying %s user/moderators of new abuse %s.', this.moderators.length, getAbuseIdentifier(this.payload.abuseInstance));
    }
    getSetting(user) {
        return user.NotificationSetting.abuseAsModerator;
    }
    getTargetUsers() {
        return this.moderators;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.NEW_ABUSE_FOR_MODERATORS,
            userId: user.id,
            abuseId: this.payload.abuseInstance.id
        });
        notification.Abuse = this.payload.abuseInstance;
        return notification;
    }
    createEmail(to) {
        const abuseInstance = this.payload.abuseInstance;
        if (abuseInstance.VideoAbuse)
            return this.createVideoAbuseEmail(to);
        if (abuseInstance.VideoCommentAbuse)
            return this.createCommentAbuseEmail(to);
        return this.createAccountAbuseEmail(to);
    }
    createVideoAbuseEmail(to) {
        const video = this.payload.abuseInstance.VideoAbuse.Video;
        const videoUrl = WEBSERVER.URL + video.getWatchStaticPath();
        return {
            template: 'video-abuse-new',
            to,
            subject: `New video abuse report from ${this.payload.reporter}`,
            locals: {
                videoUrl,
                isLocal: video.remote === false,
                videoCreatedAt: new Date(video.createdAt).toLocaleString(),
                videoPublishedAt: new Date(video.publishedAt).toLocaleString(),
                videoName: video.name,
                reason: this.payload.abuse.reason,
                videoChannel: this.payload.abuse.video.channel,
                reporter: this.payload.reporter,
                action: this.buildEmailAction()
            }
        };
    }
    createCommentAbuseEmail(to) {
        const comment = this.payload.abuseInstance.VideoCommentAbuse.VideoComment;
        const commentUrl = WEBSERVER.URL + comment.Video.getWatchStaticPath() + ';threadId=' + comment.getThreadId();
        return {
            template: 'video-comment-abuse-new',
            to,
            subject: `New comment abuse report from ${this.payload.reporter}`,
            locals: {
                commentUrl,
                videoName: comment.Video.name,
                isLocal: comment.isOwned(),
                commentCreatedAt: new Date(comment.createdAt).toLocaleString(),
                reason: this.payload.abuse.reason,
                flaggedAccount: this.payload.abuseInstance.FlaggedAccount.getDisplayName(),
                reporter: this.payload.reporter,
                action: this.buildEmailAction()
            }
        };
    }
    createAccountAbuseEmail(to) {
        const account = this.payload.abuseInstance.FlaggedAccount;
        const accountUrl = account.getClientUrl();
        return {
            template: 'account-abuse-new',
            to,
            subject: `New account abuse report from ${this.payload.reporter}`,
            locals: {
                accountUrl,
                accountDisplayName: account.getDisplayName(),
                isLocal: account.isOwned(),
                reason: this.payload.abuse.reason,
                reporter: this.payload.reporter,
                action: this.buildEmailAction()
            }
        };
    }
    buildEmailAction() {
        return {
            text: 'View report #' + this.payload.abuseInstance.id,
            url: WEBSERVER.URL + '/admin/moderation/abuses/list?search=%23' + this.payload.abuseInstance.id
        };
    }
}
//# sourceMappingURL=new-abuse-for-moderators.js.map