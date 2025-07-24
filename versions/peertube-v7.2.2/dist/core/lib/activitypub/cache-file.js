import { VideoStreamingPlaylistType } from '@peertube/peertube-models';
import { logger } from '../../helpers/logger.js';
import { VideoRedundancyModel } from '../../models/redundancy/video-redundancy.js';
async function createOrUpdateCacheFile(cacheFileObject, video, byActor, t) {
    const redundancyModel = await VideoRedundancyModel.loadByUrl(cacheFileObject.id, t);
    if (redundancyModel) {
        return updateCacheFile(cacheFileObject, redundancyModel, video, byActor, t);
    }
    return createCacheFile(cacheFileObject, video, byActor, t);
}
export { createOrUpdateCacheFile };
function createCacheFile(cacheFileObject, video, byActor, t) {
    const attributes = cacheFileActivityObjectToDBAttributes(cacheFileObject, video, byActor);
    if (!attributes)
        return;
    return VideoRedundancyModel.create(attributes, { transaction: t });
}
function updateCacheFile(cacheFileObject, redundancyModel, video, byActor, t) {
    if (redundancyModel.actorId !== byActor.id) {
        throw new Error('Cannot update redundancy ' + redundancyModel.url + ' of another actor.');
    }
    const attributes = cacheFileActivityObjectToDBAttributes(cacheFileObject, video, byActor);
    if (!attributes)
        return;
    redundancyModel.expiresOn = attributes.expiresOn;
    redundancyModel.fileUrl = attributes.fileUrl;
    return redundancyModel.save({ transaction: t });
}
function cacheFileActivityObjectToDBAttributes(cacheFileObject, video, byActor) {
    if (cacheFileObject.url.mediaType !== 'application/x-mpegURL') {
        logger.debug('Do not create remote cache file of non application/x-mpegURL media type', { cacheFileObject });
        return undefined;
    }
    const url = cacheFileObject.url;
    const playlist = video.VideoStreamingPlaylists.find(t => t.type === VideoStreamingPlaylistType.HLS);
    if (!playlist)
        throw new Error('Cannot find HLS playlist of video ' + video.url);
    return {
        expiresOn: cacheFileObject.expires ? new Date(cacheFileObject.expires) : null,
        url: cacheFileObject.id,
        fileUrl: url.href,
        strategy: null,
        videoStreamingPlaylistId: playlist.id,
        actorId: byActor.id
    };
}
//# sourceMappingURL=cache-file.js.map