import { logger } from '../../../../helpers/logger.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType, UserRight } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class AutoFollowForInstance extends AbstractNotification {
    async prepare() {
        this.admins = await UserModel.listWithRight(UserRight.MANAGE_SERVER_FOLLOW);
    }
    log() {
        logger.info('Notifying %d administrators of auto instance following: %s.', this.admins.length, this.actorFollow.ActorFollowing.url);
    }
    getSetting(user) {
        return user.NotificationSetting.autoInstanceFollowing;
    }
    getTargetUsers() {
        return this.admins;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.AUTO_INSTANCE_FOLLOWING,
            userId: user.id,
            actorFollowId: this.actorFollow.id
        });
        notification.ActorFollow = this.actorFollow;
        return notification;
    }
    createEmail(to) {
        const instanceUrl = this.actorFollow.ActorFollowing.url;
        return {
            to,
            subject: 'Auto instance following',
            text: `Your instance automatically followed a new instance: <a href="${instanceUrl}">${instanceUrl}</a>.`
        };
    }
    get actorFollow() {
        return this.payload;
    }
}
//# sourceMappingURL=auto-follow-for-instance.js.map