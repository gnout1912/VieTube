import { logger } from '../../../../helpers/logger.js';
import { toSafeHtml } from '../../../../helpers/markdown.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { AccountBlocklistModel } from '../../../../models/account/account-blocklist.js';
import { getServerActor } from '../../../../models/application/application.js';
import { ServerBlocklistModel } from '../../../../models/server/server-blocklist.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationSettingValue, UserNotificationType } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/index.js';
export class CommentMention extends AbstractNotification {
    isDisabled() {
        return this.payload.heldForReview === true;
    }
    async prepare() {
        const extractedUsernames = this.payload.extractMentions();
        logger.debug('Extracted %d username from comment %s.', extractedUsernames.length, this.payload.url, { usernames: extractedUsernames, text: this.payload.text });
        this.users = await UserModel.listByUsernames(extractedUsernames);
        if (this.payload.Video.isOwned()) {
            const userException = await UserModel.loadByVideoId(this.payload.videoId);
            this.users = this.users.filter(u => u.id !== userException.id);
        }
        this.users = this.users.filter(u => u.Account.id !== this.payload.accountId);
        if (this.users.length === 0)
            return;
        this.serverAccountId = (await getServerActor()).Account.id;
        const sourceAccounts = this.users.map(u => u.Account.id).concat([this.serverAccountId]);
        this.accountMutedHash = await AccountBlocklistModel.isAccountMutedByAccounts(sourceAccounts, this.payload.accountId);
        this.instanceMutedHash = await ServerBlocklistModel.isServerMutedByAccounts(sourceAccounts, this.payload.Account.Actor.serverId);
    }
    log() {
        logger.info('Notifying %d users of new comment mention %s.', this.users.length, this.payload.url);
    }
    getSetting(user) {
        const accountId = user.Account.id;
        if (this.accountMutedHash[accountId] === true || this.instanceMutedHash[accountId] === true ||
            this.accountMutedHash[this.serverAccountId] === true || this.instanceMutedHash[this.serverAccountId] === true) {
            return UserNotificationSettingValue.NONE;
        }
        return user.NotificationSetting.commentMention;
    }
    getTargetUsers() {
        return this.users;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.COMMENT_MENTION,
            userId: user.id,
            commentId: this.payload.id
        });
        notification.VideoComment = this.payload;
        return notification;
    }
    createEmail(to) {
        const comment = this.payload;
        const accountName = comment.Account.getDisplayName();
        const video = comment.Video;
        const videoUrl = WEBSERVER.URL + comment.Video.getWatchStaticPath();
        const commentUrl = WEBSERVER.URL + comment.getCommentStaticPath();
        const commentHtml = toSafeHtml(comment.text);
        return {
            template: 'video-comment-mention',
            to,
            subject: 'Mention on video ' + video.name,
            locals: {
                comment,
                commentHtml,
                video,
                videoUrl,
                accountName,
                action: {
                    text: 'View comment',
                    url: commentUrl
                }
            }
        };
    }
}
//# sourceMappingURL=comment-mention.js.map