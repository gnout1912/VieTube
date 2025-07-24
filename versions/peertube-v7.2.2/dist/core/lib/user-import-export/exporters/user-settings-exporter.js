import { AbstractUserExporter } from './abstract-user-exporter.js';
export class UserSettingsExporter extends AbstractUserExporter {
    export() {
        return {
            json: {
                email: this.user.email,
                emailPublic: this.user.emailPublic,
                nsfwPolicy: this.user.nsfwPolicy,
                autoPlayVideo: this.user.autoPlayVideo,
                autoPlayNextVideo: this.user.autoPlayNextVideo,
                autoPlayNextVideoPlaylist: this.user.autoPlayNextVideoPlaylist,
                p2pEnabled: this.user.p2pEnabled,
                videosHistoryEnabled: this.user.videosHistoryEnabled,
                videoLanguages: this.user.videoLanguages,
                theme: this.user.theme,
                createdAt: this.user.createdAt,
                notificationSettings: this.user.NotificationSetting.toFormattedJSON()
            },
            staticFiles: []
        };
    }
}
//# sourceMappingURL=user-settings-exporter.js.map