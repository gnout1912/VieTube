import { AbstractUserExporter } from './abstract-user-exporter.js';
import { UserVideoHistoryModel } from '../../../models/user/user-video-history.js';
export class UserVideoHistoryExporter extends AbstractUserExporter {
    async export() {
        const videos = await UserVideoHistoryModel.listForExport(this.user);
        return {
            json: {
                watchedVideos: videos.map(v => ({
                    videoUrl: v.videoUrl,
                    lastTimecode: v.currentTime,
                    createdAt: v.createdAt.toISOString(),
                    updatedAt: v.updatedAt.toISOString()
                }))
            },
            staticFiles: []
        };
    }
}
//# sourceMappingURL=user-video-history-exporter.js.map