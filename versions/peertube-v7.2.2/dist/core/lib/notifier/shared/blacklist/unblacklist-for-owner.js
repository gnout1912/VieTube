import { logger } from '../../../../helpers/logger.js';
import { CONFIG } from '../../../../initializers/config.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class UnblacklistForOwner extends AbstractNotification {
    async prepare() {
        this.user = await UserModel.loadByVideoId(this.payload.id);
    }
    log() {
        logger.info('Notifying user %s that its video %s has been unblacklisted.', this.user.username, this.payload.url);
    }
    getSetting(user) {
        return user.NotificationSetting.blacklistOnMyVideo;
    }
    getTargetUsers() {
        if (!this.user)
            return [];
        return [this.user];
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.UNBLACKLIST_ON_MY_VIDEO,
            userId: user.id,
            videoId: this.payload.id
        });
        notification.Video = this.payload;
        return notification;
    }
    createEmail(to) {
        const video = this.payload;
        const videoUrl = WEBSERVER.URL + video.getWatchStaticPath();
        return {
            to,
            subject: `Video ${video.name} unblacklisted`,
            text: `Your video "${video.name}" (${videoUrl}) on ${CONFIG.INSTANCE.NAME} has been unblacklisted.`,
            locals: {
                title: 'Your video was unblacklisted'
            }
        };
    }
}
//# sourceMappingURL=unblacklist-for-owner.js.map