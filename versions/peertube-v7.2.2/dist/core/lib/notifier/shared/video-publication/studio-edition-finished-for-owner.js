import { logger } from '../../../../helpers/logger.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class StudioEditionFinishedForOwner extends AbstractNotification {
    async prepare() {
        this.user = await UserModel.loadByVideoId(this.payload.id);
    }
    log() {
        logger.info('Notifying user %s its video studio edition %s is finished.', this.user.username, this.payload.url);
    }
    getSetting(user) {
        return user.NotificationSetting.myVideoStudioEditionFinished;
    }
    getTargetUsers() {
        if (!this.user)
            return [];
        return [this.user];
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.MY_VIDEO_STUDIO_EDITION_FINISHED,
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
            subject: `Edition of your video ${this.payload.name} has finished`,
            text: `Edition of your video ${this.payload.name} has finished.`,
            locals: {
                title: 'Video edition has finished',
                action: {
                    text: 'View video',
                    url: videoUrl
                }
            }
        };
    }
}
//# sourceMappingURL=studio-edition-finished-for-owner.js.map