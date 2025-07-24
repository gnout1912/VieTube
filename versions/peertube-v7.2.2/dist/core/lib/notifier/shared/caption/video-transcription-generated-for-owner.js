import { UserNotificationType } from '@peertube/peertube-models';
import { logger } from '../../../../helpers/logger.js';
import { VIDEO_LANGUAGES, WEBSERVER } from '../../../../initializers/constants.js';
import { UserNotificationModel } from '../../../../models/user/user-notification.js';
import { UserModel } from '../../../../models/user/user.js';
import { AbstractNotification } from '../common/abstract-notification.js';
export class VideoTranscriptionGeneratedForOwner extends AbstractNotification {
    async prepare() {
        this.user = await UserModel.loadByVideoId(this.payload.videoId);
    }
    log() {
        logger.info('Notifying user %s the transcription %s of video %s is generated.', this.user.username, this.payload.language, this.payload.Video.url);
    }
    getSetting(user) {
        return user.NotificationSetting.myVideoTranscriptionGenerated;
    }
    getTargetUsers() {
        if (!this.user)
            return [];
        return [this.user];
    }
    createNotification(user) {
        const notification = UserNotificationModel.build({
            type: UserNotificationType.MY_VIDEO_TRANSCRIPTION_GENERATED,
            userId: user.id,
            videoCaptionId: this.payload.id
        });
        notification.VideoCaption = this.payload;
        return notification;
    }
    createEmail(to) {
        const video = this.payload.Video;
        const videoUrl = WEBSERVER.URL + video.getWatchStaticPath();
        const language = VIDEO_LANGUAGES[this.payload.language];
        return {
            to,
            subject: `Transcription in ${language} of your video ${video.name} has been generated`,
            text: `Transcription in ${language} of your video ${video.name} has been generated.`,
            locals: {
                title: 'Transcription has been generated',
                action: {
                    text: 'View video',
                    url: videoUrl
                }
            }
        };
    }
}
//# sourceMappingURL=video-transcription-generated-for-owner.js.map