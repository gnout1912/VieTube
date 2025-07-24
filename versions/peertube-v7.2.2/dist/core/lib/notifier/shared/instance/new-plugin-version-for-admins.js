import { logger } from '../../../../helpers/logger.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserNotificationType, UserRight } from '@peertube/peertube-models';
import { AbstractNotification } from '../common/abstract-notification.js';
export class NewPluginVersionForAdmins extends AbstractNotification {
    async prepare() {
        this.admins = await UserModel.listWithRight(UserRight.MANAGE_DEBUG);
    }
    log() {
        logger.info('Notifying %s admins of new PeerTube version %s.', this.admins.length, this.payload.latestVersion);
    }
    getSetting(user) {
        return user.NotificationSetting.newPluginVersion;
    }
    getTargetUsers() {
        return this.admins;
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.NEW_PLUGIN_VERSION,
            userId: user.id,
            pluginId: this.plugin.id
        });
        notification.Plugin = this.plugin;
        return notification;
    }
    createEmail(to) {
        const pluginUrl = WEBSERVER.URL + '/admin/settings/plugins/list-installed?pluginType=' + this.plugin.type;
        return {
            to,
            template: 'plugin-version-new',
            subject: `A new plugin/theme version is available: ${this.plugin.name}@${this.plugin.latestVersion}`,
            locals: {
                pluginName: this.plugin.name,
                latestVersion: this.plugin.latestVersion,
                pluginUrl
            }
        };
    }
    get plugin() {
        return this.payload;
    }
}
//# sourceMappingURL=new-plugin-version-for-admins.js.map