import { VideoPlaylistModel } from '../../../models/video/video-playlist.js';
import { HttpStatusCode } from '@peertube/peertube-models';
async function doesVideoPlaylistExist(id, res, fetchType = 'summary') {
    if (fetchType === 'summary') {
        const videoPlaylist = await VideoPlaylistModel.loadWithAccountAndChannelSummary(id, undefined);
        res.locals.videoPlaylistSummary = videoPlaylist;
        return handleVideoPlaylist(videoPlaylist, res);
    }
    const videoPlaylist = await VideoPlaylistModel.loadWithAccountAndChannel(id, undefined);
    res.locals.videoPlaylistFull = videoPlaylist;
    return handleVideoPlaylist(videoPlaylist, res);
}
export { doesVideoPlaylistExist };
function handleVideoPlaylist(videoPlaylist, res) {
    if (!videoPlaylist) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video playlist not found'
        });
        return false;
    }
    return true;
}
//# sourceMappingURL=video-playlists.js.map