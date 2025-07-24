import { logger } from '../../../../helpers/logger.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType, UserRight } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class RegistrationRequestForModerators extends AbstractNotification {
    async prepare() {
        this.moderators = await UserModel.listWithRight(UserRight.MANAGE_REGISTRATIONS);
    }
    log() {
        logger.info('Notifying %s moderators of new user registration request of %s.', this.moderators.length, this.payload.username);
    }
    getSetting(user) {
        return user.NotificationSetting.newUserRegistration;
    }
    getTargetUsers() {
        return this.moderators;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.NEW_USER_REGISTRATION_REQUEST,
            userId: user.id,
            userRegistrationId: this.payload.id
        });
        notification.UserRegistration = this.payload;
        return notification;
    }
    createEmail(to) {
        return {
            template: 'user-registration-request',
            to,
            subject: `A new user wants to register: ${this.payload.username}`,
            locals: {
                registration: this.payload
            }
        };
    }
}
//# sourceMappingURL=registration-request-for-moderators.js.map