import { UserNotificationType, UserRight } from '@peertube/peertube-models';
import { logger } from '../../../../helpers/logger.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserModel } from '../../../../models/user/user.js';
import { VideoChannelModel } from '../../../../models/video/video-channel.js';
import { AbstractNotification } from '../common/abstract-notification.js';
export class NewAutoBlacklistForModerators extends AbstractNotification {
    async prepare() {
        this.moderators = await UserModel.listWithRight(UserRight.MANAGE_VIDEO_BLACKLIST);
    }
    log() {
        logger.info('Notifying %s moderators of video auto-blacklist %s.', this.moderators.length, this.payload.Video.url);
    }
    getSetting(user) {
        return user.NotificationSetting.videoAutoBlacklistAsModerator;
    }
    getTargetUsers() {
        return this.moderators;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.VIDEO_AUTO_BLACKLIST_FOR_MODERATORS,
            userId: user.id,
            videoBlacklistId: this.payload.id
        });
        notification.VideoBlacklist = this.payload;
        return notification;
    }
    async createEmail(to) {
        const videoAutoBlacklistUrl = WEBSERVER.URL + '/admin/moderation/video-blocks/list';
        const videoUrl = WEBSERVER.URL + this.payload.Video.getWatchStaticPath();
        const channel = await VideoChannelModel.loadAndPopulateAccount(this.payload.Video.channelId);
        return {
            template: 'video-auto-blacklist-new',
            to,
            subject: 'A new video is pending moderation',
            locals: {
                channel: channel.toFormattedSummaryJSON(),
                videoUrl,
                videoName: this.payload.Video.name,
                action: {
                    text: 'Review autoblacklist',
                    url: videoAutoBlacklistUrl
                }
            }
        };
    }
}
//# sourceMappingURL=new-auto-blacklist-for-moderators.js.map