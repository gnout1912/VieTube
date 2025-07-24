import { CONFIG } from '../../initializers/config.js';
import { VideoModel } from '../../models/video/video.js';
import { getOrCreateAPVideo } from '../activitypub/videos/get.js';
function loadVideo(id, fetchType, userId) {
    if (fetchType === 'for-api')
        return VideoModel.loadForGetAPI({ id, userId });
    if (fetchType === 'all')
        return VideoModel.loadFull(id, undefined, userId);
    if (fetchType === 'unsafe-only-immutable-attributes')
        return VideoModel.loadImmutableAttributes(id);
    if (fetchType === 'only-video-and-blacklist')
        return VideoModel.loadWithBlacklist(id);
    if (fetchType === 'id' || fetchType === 'none')
        return VideoModel.loadOnlyId(id);
}
function loadVideoByUrl(url, fetchType) {
    if (fetchType === 'all')
        return VideoModel.loadByUrlAndPopulateAccountAndFiles(url);
    if (fetchType === 'unsafe-only-immutable-attributes')
        return VideoModel.loadByUrlImmutableAttributes(url);
    if (fetchType === 'only-video-and-blacklist')
        return VideoModel.loadByUrlWithBlacklist(url);
}
async function loadOrCreateVideoIfAllowedForUser(videoUrl) {
    if (CONFIG.SEARCH.REMOTE_URI.USERS) {
        try {
            const res = await getOrCreateAPVideo({
                videoObject: videoUrl,
                fetchType: 'unsafe-only-immutable-attributes',
                allowRefresh: false
            });
            return res === null || res === void 0 ? void 0 : res.video;
        }
        catch (_a) {
            return undefined;
        }
    }
    return VideoModel.loadByUrlImmutableAttributes(videoUrl);
}
export { loadOrCreateVideoIfAllowedForUser, loadVideo, loadVideoByUrl };
//# sourceMappingURL=video.js.map