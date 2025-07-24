import { arrayify } from '@peertube/peertube-core-utils';
import { isActorTypeValid } from '../../../helpers/custom-validators/activitypub/actor.js';
import { isRedundancyAccepted } from '../../redundancy.js';
import { isCacheFileObjectValid } from '../../../helpers/custom-validators/activitypub/cache-file.js';
import { sanitizeAndCheckVideoTorrentObject } from '../../../helpers/custom-validators/activitypub/videos.js';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { logger } from '../../../helpers/logger.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { fetchAPObjectIfNeeded } from '../activity.js';
import { APActorUpdater } from '../actors/updater.js';
import { createOrUpdateCacheFile } from '../cache-file.js';
import { createOrUpdateVideoPlaylist } from '../playlists/index.js';
import { forwardVideoRelatedActivity } from '../send/shared/send-utils.js';
import { APVideoUpdater, canVideoBeFederated, getOrCreateAPVideo } from '../videos/index.js';
async function processUpdateActivity(options) {
    const { activity, byActor } = options;
    const object = await fetchAPObjectIfNeeded(activity.object);
    const objectType = object.type;
    if (objectType === 'Video') {
        return retryTransactionWrapper(processUpdateVideo, activity);
    }
    if (isActorTypeValid(objectType)) {
        const byActorFull = await ActorModel.loadByUrlAndPopulateAccountAndChannel(byActor.url);
        return retryTransactionWrapper(processUpdateActor, byActorFull, object);
    }
    if (objectType === 'CacheFile') {
        const byActorFull = await ActorModel.loadByUrlAndPopulateAccountAndChannel(byActor.url);
        return retryTransactionWrapper(processUpdateCacheFile, byActorFull, activity, object);
    }
    if (objectType === 'Playlist') {
        return retryTransactionWrapper(processUpdatePlaylist, byActor, activity, object);
    }
    return undefined;
}
export { processUpdateActivity };
async function processUpdateVideo(activity) {
    const videoObject = activity.object;
    if (sanitizeAndCheckVideoTorrentObject(videoObject) === false) {
        logger.debug('Video sent by update is not valid.', { videoObject });
        return undefined;
    }
    const { video, created } = await getOrCreateAPVideo({
        videoObject: videoObject.id,
        allowRefresh: false,
        fetchType: 'all'
    });
    if (created)
        return;
    const updater = new APVideoUpdater(videoObject, video);
    return updater.update(arrayify(activity.to));
}
async function processUpdateCacheFile(byActor, activity, cacheFileObject) {
    if (await isRedundancyAccepted(activity, byActor) !== true)
        return;
    if (!isCacheFileObjectValid(cacheFileObject)) {
        logger.debug('Cache file object sent by update is not valid.', { cacheFileObject });
        return undefined;
    }
    const { video } = await getOrCreateAPVideo({ videoObject: cacheFileObject.object });
    if (video.isOwned() && !canVideoBeFederated(video)) {
        logger.warn(`Do not process update cache file on video ${activity.object} that cannot be federated`);
        return;
    }
    await sequelizeTypescript.transaction(async (t) => {
        await createOrUpdateCacheFile(cacheFileObject, video, byActor, t);
    });
    if (video.isOwned()) {
        const exceptions = [byActor];
        await forwardVideoRelatedActivity(activity, undefined, exceptions, video);
    }
}
async function processUpdateActor(actor, actorObject) {
    logger.debug(`Updating remote account "${actorObject.id}".`);
    const updater = new APActorUpdater(actorObject, actor);
    return updater.update();
}
async function processUpdatePlaylist(byActor, activity, playlistObject) {
    const byAccount = byActor.Account;
    if (!byAccount)
        throw new Error('Cannot update video playlist with the non account actor ' + byActor.url);
    await createOrUpdateVideoPlaylist({ playlistObject, contextUrl: byActor.url, to: arrayify(activity.to) });
}
//# sourceMappingURL=process-update.js.map