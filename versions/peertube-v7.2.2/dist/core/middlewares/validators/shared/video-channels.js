import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { checkUserCanManageAccount } from './users.js';
export async function doesChannelIdExist(options) {
    const { id, checkManage, checkIsLocal, res } = options;
    const channel = await VideoChannelModel.loadAndPopulateAccount(+id);
    return processVideoChannelExist({ channel, checkManage, checkIsLocal, res });
}
export async function doesChannelHandleExist(options) {
    const { handle, checkManage, checkIsLocal, res } = options;
    const channel = await VideoChannelModel.loadByHandleAndPopulateAccount(handle);
    return processVideoChannelExist({ channel, checkManage, checkIsLocal, res });
}
function processVideoChannelExist(options) {
    const { channel, res, checkManage, checkIsLocal } = options;
    if (!channel) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video channel not found'
        });
        return false;
    }
    if (checkManage) {
        const user = res.locals.oauth.token.User;
        if (!checkUserCanManageAccount({ account: channel.Account, user, res, specialRight: UserRight.MANAGE_ANY_VIDEO_CHANNEL })) {
            return false;
        }
    }
    if (checkIsLocal && channel.Actor.isOwned() === false) {
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'This channel is not owned.'
        });
        return false;
    }
    res.locals.videoChannel = channel;
    return true;
}
//# sourceMappingURL=video-channels.js.map