import { logger } from '../../../../helpers/logger.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class AbstractOwnedVideoPublication extends AbstractNotification {
    async prepare() {
        this.user = await UserModel.loadByVideoId(this.payload.id);
    }
    log() {
        logger.info('Notifying user %s of the publication of its video %s.', this.user.username, this.payload.url);
    }
    getSetting(user) {
        return user.NotificationSetting.myVideoPublished;
    }
    getTargetUsers() {
        if (!this.user)
            return [];
        return [this.user];
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.MY_VIDEO_PUBLISHED,
            userId: user.id,
            videoId: this.payload.id
        });
        notification.Video = this.payload;
        return notification;
    }
    createEmail(to) {
        const videoUrl = WEBSERVER.URL + this.payload.getWatchStaticPath();
        return {
            to,
            subject: `Your video ${this.payload.name} has been published`,
            text: `Your video "${this.payload.name}" has been published.`,
            locals: {
                title: 'Your video is live',
                action: {
                    text: 'View video',
                    url: videoUrl
                }
            }
        };
    }
}
//# sourceMappingURL=abstract-owned-video-publication.js.map