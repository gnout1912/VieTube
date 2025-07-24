import { logger } from '../../../../helpers/logger.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType, UserRight } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class NewPeerTubeVersionForAdmins extends AbstractNotification {
    async prepare() {
        this.admins = await UserModel.listWithRight(UserRight.MANAGE_DEBUG);
    }
    log() {
        logger.info('Notifying %s admins of new PeerTube version %s.', this.admins.length, this.payload.latestVersion);
    }
    getSetting(user) {
        return user.NotificationSetting.newPeerTubeVersion;
    }
    getTargetUsers() {
        return this.admins;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.NEW_PEERTUBE_VERSION,
            userId: user.id,
            applicationId: this.payload.application.id
        });
        notification.Application = this.payload.application;
        return notification;
    }
    createEmail(to) {
        return {
            to,
            template: 'peertube-version-new',
            subject: `A new PeerTube version is available: ${this.payload.latestVersion}`,
            locals: {
                latestVersion: this.payload.latestVersion
            }
        };
    }
}
//# sourceMappingURL=new-peertube-version-for-admins.js.map