import { HttpStatusCode } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { JobQueue } from '../../job-queue/index.js';
import { createOrUpdateVideoPlaylist } from './create-update.js';
import { fetchRemoteVideoPlaylist } from './shared/index.js';
function scheduleRefreshIfNeeded(playlist) {
    if (!playlist.isOutdated())
        return;
    JobQueue.Instance.createJobAsync({ type: 'activitypub-refresher', payload: { type: 'video-playlist', url: playlist.url } });
}
async function refreshVideoPlaylistIfNeeded(videoPlaylist) {
    if (!videoPlaylist.isOutdated())
        return videoPlaylist;
    const lTags = loggerTagsFactory('ap', 'video-playlist', 'refresh', videoPlaylist.uuid, videoPlaylist.url);
    logger.info('Refreshing playlist %s.', videoPlaylist.url, lTags());
    try {
        const { playlistObject } = await fetchRemoteVideoPlaylist(videoPlaylist.url);
        if (playlistObject === undefined) {
            logger.warn('Cannot refresh remote playlist %s: invalid body.', videoPlaylist.url, lTags());
            await videoPlaylist.setAsRefreshed();
            return videoPlaylist;
        }
        await createOrUpdateVideoPlaylist({ playlistObject, contextUrl: videoPlaylist.url });
        return videoPlaylist;
    }
    catch (err) {
        const statusCode = err.statusCode;
        if (statusCode === HttpStatusCode.NOT_FOUND_404 || statusCode === HttpStatusCode.GONE_410) {
            logger.info('Cannot refresh not existing playlist (404/410 error code) %s. Deleting it.', videoPlaylist.url, lTags());
            await videoPlaylist.destroy();
            return undefined;
        }
        logger.warn('Cannot refresh video playlist %s.', videoPlaylist.url, Object.assign({ err }, lTags()));
        await videoPlaylist.setAsRefreshed();
        return videoPlaylist;
    }
}
export { refreshVideoPlaylistIfNeeded, scheduleRefreshIfNeeded };
//# sourceMappingURL=refresh.js.map