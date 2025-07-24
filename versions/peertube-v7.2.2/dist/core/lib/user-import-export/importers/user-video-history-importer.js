import { pick } from '@peertube/peertube-core-utils';
import { isUrlValid } from '../../../helpers/custom-validators/activitypub/misc.js';
import { loadOrCreateVideoIfAllowedForUser } from '../../model-loaders/video.js';
import { UserVideoHistoryModel } from '../../../models/user/user-video-history.js';
import { AbstractUserImporter } from './abstract-user-importer.js';
export class UserVideoHistoryImporter extends AbstractUserImporter {
    getImportObjects(json) {
        return json.watchedVideos;
    }
    sanitize(data) {
        if (!isUrlValid(data.videoUrl))
            return undefined;
        return pick(data, ['videoUrl', 'lastTimecode']);
    }
    async importObject(data) {
        if (!this.user.videosHistoryEnabled)
            return { duplicate: false };
        const videoUrl = data.videoUrl;
        const videoImmutable = await loadOrCreateVideoIfAllowedForUser(videoUrl);
        if (!videoImmutable) {
            throw new Error(`Cannot get or create video ${videoUrl} to import user history`);
        }
        await UserVideoHistoryModel.upsert({
            videoId: videoImmutable.id,
            userId: this.user.id,
            currentTime: data.lastTimecode
        });
        return { duplicate: false };
    }
}
//# sourceMappingURL=user-video-history-importer.js.map