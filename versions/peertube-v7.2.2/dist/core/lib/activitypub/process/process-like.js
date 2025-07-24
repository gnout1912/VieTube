import { logger } from '../../../helpers/logger.js';
import { VideoModel } from '../../../models/video/video.js';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { getAPId } from '../activity.js';
import { AccountVideoRateModel } from '../../../models/account/account-video-rate.js';
import { canVideoBeFederated, federateVideoIfNeeded, maybeGetOrCreateAPVideo } from '../videos/index.js';
async function processLikeActivity(options) {
    const { activity, byActor } = options;
    return retryTransactionWrapper(processLikeVideo, byActor, activity);
}
export { processLikeActivity };
async function processLikeVideo(byActor, activity) {
    const videoUrl = getAPId(activity.object);
    const byAccount = byActor.Account;
    if (!byAccount)
        throw new Error('Cannot create like with the non account actor ' + byActor.url);
    const { video: onlyVideo } = await maybeGetOrCreateAPVideo({ videoObject: videoUrl, fetchType: 'only-video-and-blacklist' });
    if (!(onlyVideo === null || onlyVideo === void 0 ? void 0 : onlyVideo.isOwned()))
        return;
    if (!canVideoBeFederated(onlyVideo)) {
        logger.warn(`Do not process like on video ${videoUrl} that cannot be federated`);
        return;
    }
    return sequelizeTypescript.transaction(async (t) => {
        const video = await VideoModel.loadFull(onlyVideo.id, t);
        const existingRate = await AccountVideoRateModel.loadByAccountAndVideoOrUrl(byAccount.id, video.id, activity.id, t);
        if (existingRate && existingRate.type === 'like')
            return;
        if (existingRate && existingRate.type === 'dislike') {
            await video.decrement('dislikes', { transaction: t });
            video.dislikes--;
        }
        await video.increment('likes', { transaction: t });
        video.likes++;
        const rate = existingRate || new AccountVideoRateModel();
        rate.type = 'like';
        rate.videoId = video.id;
        rate.accountId = byAccount.id;
        rate.url = activity.id;
        await rate.save({ transaction: t });
        await federateVideoIfNeeded(video, false, t);
    });
}
//# sourceMappingURL=process-like.js.map