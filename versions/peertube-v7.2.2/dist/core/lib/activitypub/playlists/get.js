import { VideoPlaylistModel } from '../../../models/video/video-playlist.js';
import { getAPId } from '../activity.js';
import { createOrUpdateVideoPlaylist } from './create-update.js';
import { scheduleRefreshIfNeeded } from './refresh.js';
import { fetchRemoteVideoPlaylist } from './shared/index.js';
export async function getOrCreateAPVideoPlaylist(playlistUrl) {
    const playlistFromDatabase = await VideoPlaylistModel.loadByUrlWithAccountAndChannelSummary(playlistUrl);
    if (playlistFromDatabase) {
        scheduleRefreshIfNeeded(playlistFromDatabase);
        return playlistFromDatabase;
    }
    const { playlistObject } = await fetchRemoteVideoPlaylist(playlistUrl);
    if (!playlistObject)
        throw new Error('Cannot fetch remote playlist with url: ' + playlistUrl);
    if (playlistObject.id !== playlistUrl)
        return getOrCreateAPVideoPlaylist(getAPId(playlistObject));
    const playlistCreated = await createOrUpdateVideoPlaylist({ playlistObject, contextUrl: playlistUrl });
    return playlistCreated;
}
//# sourceMappingURL=get.js.map