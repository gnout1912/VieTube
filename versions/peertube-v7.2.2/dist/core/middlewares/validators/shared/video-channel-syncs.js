import { VideoChannelSyncModel } from '../../../models/video/video-channel-sync.js';
import { HttpStatusCode } from '@peertube/peertube-models';
async function doesVideoChannelSyncIdExist(id, res) {
    const sync = await VideoChannelSyncModel.loadWithChannel(+id);
    if (!sync) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video channel sync not found'
        });
        return false;
    }
    res.locals.videoChannelSync = sync;
    return true;
}
export { doesVideoChannelSyncIdExist };
//# sourceMappingURL=video-channel-syncs.js.map