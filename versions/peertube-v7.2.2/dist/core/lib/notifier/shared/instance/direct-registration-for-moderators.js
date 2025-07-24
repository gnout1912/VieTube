import { logger } from '../../../../helpers/logger.js';
import { CONFIG } from '../../../../initializers/config.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType, UserRight } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class DirectRegistrationForModerators extends AbstractNotification {
    async prepare() {
        this.moderators = await UserModel.listWithRight(UserRight.MANAGE_USERS);
    }
    log() {
        logger.info('Notifying %s moderators of new user registration of %s.', this.moderators.length, this.payload.username);
    }
    getSetting(user) {
        return user.NotificationSetting.newUserRegistration;
    }
    getTargetUsers() {
        return this.moderators;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.NEW_USER_REGISTRATION,
            userId: user.id,
            accountId: this.payload.Account.id
        });
        notification.Account = this.payload.Account;
        return notification;
    }
    createEmail(to) {
        return {
            template: 'user-registered',
            to,
            subject: `A new user registered on ${CONFIG.INSTANCE.NAME}: ${this.payload.username}`,
            locals: {
                user: this.payload
            }
        };
    }
}
//# sourceMappingURL=direct-registration-for-moderators.js.map