import { refreshVideoPlaylistIfNeeded } from '../../activitypub/playlists/index.js';
import { refreshVideoIfNeeded } from '../../activitypub/videos/index.js';
import { loadVideoByUrl } from '../../model-loaders/index.js';
import { logger } from '../../../helpers/logger.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { VideoPlaylistModel } from '../../../models/video/video-playlist.js';
import { refreshActorIfNeeded } from '../../activitypub/actors/index.js';
async function refreshAPObject(job) {
    const payload = job.data;
    logger.info('Processing AP refresher in job %s for %s.', job.id, payload.url);
    if (payload.type === 'video')
        return refreshVideo(payload.url);
    if (payload.type === 'video-playlist')
        return refreshVideoPlaylist(payload.url);
    if (payload.type === 'actor')
        return refreshActor(payload.url);
}
export { refreshAPObject };
async function refreshVideo(videoUrl) {
    const fetchType = 'all';
    const syncParam = { rates: true, shares: true, comments: true };
    const videoFromDatabase = await loadVideoByUrl(videoUrl, fetchType);
    if (videoFromDatabase) {
        const refreshOptions = {
            video: videoFromDatabase,
            fetchedType: fetchType,
            syncParam
        };
        await refreshVideoIfNeeded(refreshOptions);
    }
}
async function refreshActor(actorUrl) {
    const fetchType = 'all';
    const actor = await ActorModel.loadByUrlAndPopulateAccountAndChannel(actorUrl);
    if (actor) {
        await refreshActorIfNeeded({ actor, fetchedType: fetchType });
    }
}
async function refreshVideoPlaylist(playlistUrl) {
    const playlist = await VideoPlaylistModel.loadByUrlAndPopulateAccount(playlistUrl);
    if (playlist) {
        await refreshVideoPlaylistIfNeeded(playlist);
    }
}
//# sourceMappingURL=activitypub-refresher.js.map