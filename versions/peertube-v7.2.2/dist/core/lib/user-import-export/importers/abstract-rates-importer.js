import { AbstractUserImporter } from './abstract-user-importer.js';
import { loadOrCreateVideoIfAllowedForUser } from '../../model-loaders/video.js';
import { userRateVideo } from '../../rate.js';
import { VideoModel } from '../../../models/video/video.js';
import { isUrlValid } from '../../../helpers/custom-validators/activitypub/misc.js';
import { pick } from '@peertube/peertube-core-utils';
export class AbstractRatesImporter extends AbstractUserImporter {
    sanitizeRate(data) {
        if (!isUrlValid(data.videoUrl))
            return undefined;
        return pick(data, ['videoUrl']);
    }
    async importRate(data, rateType) {
        const videoUrl = data.videoUrl;
        const videoImmutable = await loadOrCreateVideoIfAllowedForUser(videoUrl);
        if (!videoImmutable) {
            throw new Error(`Cannot get or create video ${videoUrl} to import user ${rateType}`);
        }
        const video = await VideoModel.loadFull(videoImmutable.id);
        await userRateVideo({ account: this.user.Account, rateType, video });
        return { duplicate: false };
    }
}
//# sourceMappingURL=abstract-rates-importer.js.map