import { logger } from '../../../../helpers/logger.js';
import { isBlockedByServerOrAccount } from '../../../blocklist.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class FollowForUser extends AbstractNotification {
    async prepare() {
        this.followType = 'channel';
        this.user = await UserModel.loadByChannelActorId(this.actorFollow.ActorFollowing.id);
        if (!this.user) {
            this.user = await UserModel.loadByAccountActorId(this.actorFollow.ActorFollowing.id);
            this.followType = 'account';
        }
    }
    async isDisabled() {
        if (this.payload.ActorFollowing.isOwned() === false)
            return true;
        const followerAccount = this.actorFollow.ActorFollower.Account;
        const followerAccountWithActor = Object.assign(followerAccount, { Actor: this.actorFollow.ActorFollower });
        return isBlockedByServerOrAccount(followerAccountWithActor, this.user.Account);
    }
    log() {
        logger.info('Notifying user %s of new follower: %s.', this.user.username, this.actorFollow.ActorFollower.Account.getDisplayName());
    }
    getSetting(user) {
        return user.NotificationSetting.newFollow;
    }
    getTargetUsers() {
        if (!this.user)
            return [];
        return [this.user];
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.NEW_FOLLOW,
            userId: user.id,
            actorFollowId: this.actorFollow.id
        });
        notification.ActorFollow = this.actorFollow;
        return notification;
    }
    createEmail(to) {
        const following = this.actorFollow.ActorFollowing;
        const follower = this.actorFollow.ActorFollower;
        const followingName = (following.VideoChannel || following.Account).getDisplayName();
        return {
            template: 'follower-on-channel',
            to,
            subject: `New follower on your channel ${followingName}`,
            locals: {
                followerName: follower.Account.getDisplayName(),
                followerUrl: follower.url,
                followingName,
                followingUrl: following.url,
                followType: this.followType
            }
        };
    }
    get actorFollow() {
        return this.payload;
    }
}
//# sourceMappingURL=follow-for-user.js.map