import { UserNotificationType } from '@peertube/peertube-models';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { AccountModel } from '../../../../models/account/account.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { AbstractNotification } from '../common/abstract-notification.js';
export class AbstractNewAbuseMessage extends AbstractNotification {
    async loadMessageAccount() {
        this.messageAccount = await AccountModel.load(this.message.accountId);
    }
    getSetting(user) {
        return user.NotificationSetting.abuseNewMessage;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.ABUSE_NEW_MESSAGE,
            userId: user.id,
            abuseId: this.abuse.id
        });
        notification.Abuse = this.abuse;
        return notification;
    }
    createEmailFor(to, target) {
        const text = 'New message on report #' + this.abuse.id;
        const abuseUrl = target === 'moderator'
            ? WEBSERVER.URL + '/admin/moderation/abuses/list?search=%23' + this.abuse.id
            : WEBSERVER.URL + '/my-account/abuses?search=%23' + this.abuse.id;
        const action = {
            text: 'View report #' + this.abuse.id,
            url: abuseUrl
        };
        return {
            template: 'abuse-new-message',
            to,
            subject: text,
            locals: {
                abuseId: this.abuse.id,
                abuseUrl: action.url,
                messageAccountName: this.messageAccount.getDisplayName(),
                messageText: this.message.message,
                action
            }
        };
    }
    get abuse() {
        return this.payload.abuse;
    }
    get message() {
        return this.payload.message;
    }
}
//# sourceMappingURL=abstract-new-abuse-message.js.map