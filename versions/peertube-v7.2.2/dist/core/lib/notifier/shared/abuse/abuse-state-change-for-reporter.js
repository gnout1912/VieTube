import { logger } from '../../../../helpers/logger.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { getAbuseIdentifier } from '../../../activitypub/url.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { AbuseState, UserNotificationType } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class AbuseStateChangeForReporter extends AbstractNotification {
    async prepare() {
        const reporter = this.abuse.ReporterAccount;
        if (reporter.isOwned() !== true)
            return;
        this.user = await UserModel.loadByAccountActorId(this.abuse.ReporterAccount.actorId);
    }
    log() {
        logger.info('Notifying reporter of abuse % of state change.', getAbuseIdentifier(this.abuse));
    }
    getSetting(user) {
        return user.NotificationSetting.abuseStateChange;
    }
    getTargetUsers() {
        if (!this.user)
            return [];
        return [this.user];
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.ABUSE_STATE_CHANGE,
            userId: user.id,
            abuseId: this.abuse.id
        });
        notification.Abuse = this.abuse;
        return notification;
    }
    createEmail(to) {
        const text = this.abuse.state === AbuseState.ACCEPTED
            ? 'Report #' + this.abuse.id + ' has been accepted'
            : 'Report #' + this.abuse.id + ' has been rejected';
        const abuseUrl = WEBSERVER.URL + '/my-account/abuses?search=%23' + this.abuse.id;
        const action = {
            text: 'View report #' + this.abuse.id,
            url: abuseUrl
        };
        return {
            template: 'abuse-state-change',
            to,
            subject: text,
            locals: {
                action,
                abuseId: this.abuse.id,
                abuseUrl,
                isAccepted: this.abuse.state === AbuseState.ACCEPTED
            }
        };
    }
    get abuse() {
        return this.payload;
    }
}
//# sourceMappingURL=abuse-state-change-for-reporter.js.map