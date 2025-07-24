import { logger } from '../../../../helpers/logger.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType, VideoPrivacy, VideoState } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class NewVideoOrLiveForSubscribers extends AbstractNotification {
    async prepare() {
        this.users = await UserModel.listUserSubscribersOf(this.payload.VideoChannel.actorId);
    }
    log() {
        logger.info('Notifying %d users of new video %s.', this.users.length, this.payload.url);
    }
    isDisabled() {
        if (this.payload.privacy !== VideoPrivacy.PUBLIC && this.payload.privacy !== VideoPrivacy.INTERNAL)
            return true;
        if (this.payload.state !== VideoState.PUBLISHED)
            return true;
        if (this.payload.isBlacklisted())
            return true;
        return false;
    }
    getSetting(user) {
        return user.NotificationSetting.newVideoFromSubscription;
    }
    getTargetUsers() {
        return this.users;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: this.payload.isLive
                ? UserNotificationType.NEW_LIVE_FROM_SUBSCRIPTION
                : UserNotificationType.NEW_VIDEO_FROM_SUBSCRIPTION,
            userId: user.id,
            videoId: this.payload.id
        });
        notification.Video = this.payload;
        return notification;
    }
    createEmail(to) {
        const channelName = this.payload.VideoChannel.getDisplayName();
        const videoUrl = WEBSERVER.URL + this.payload.getWatchStaticPath();
        if (this.payload.isLive)
            return this.createLiveEmail(to, channelName, videoUrl);
        return this.createVideoEmail(to, channelName, videoUrl);
    }
    createVideoEmail(to, channelName, videoUrl) {
        return {
            to,
            subject: channelName + ' just published a new video',
            text: `Your subscription ${channelName} just published a new video: "${this.payload.name}".`,
            locals: {
                title: 'New content ',
                action: {
                    text: 'View video',
                    url: videoUrl
                }
            }
        };
    }
    createLiveEmail(to, channelName, videoUrl) {
        return {
            to,
            subject: channelName + ' is live streaming',
            text: `Your subscription ${channelName} is live streaming: "${this.payload.name}".`,
            locals: {
                title: 'New content ',
                action: {
                    text: 'View video',
                    url: videoUrl
                }
            }
        };
    }
}
//# sourceMappingURL=new-video-or-live-for-subscribers.js.map