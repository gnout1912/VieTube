import { VideoBlacklistModel } from '../../../models/video/video-blacklist.js';
import { HttpStatusCode } from '@peertube/peertube-models';
async function doesVideoBlacklistExist(videoId, res) {
    const videoBlacklist = await VideoBlacklistModel.loadByVideoId(videoId);
    if (videoBlacklist === null) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Blacklisted video not found'
        });
        return false;
    }
    res.locals.videoBlacklist = videoBlacklist;
    return true;
}
export { doesVideoBlacklistExist };
//# sourceMappingURL=video-blacklists.js.map