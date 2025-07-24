import { HttpStatusCode, UserRight, VideoPrivacy } from '@peertube/peertube-models';
import { forceNumber } from '@peertube/peertube-core-utils';
import { VideoPasswordModel } from '../../../models/video/video-password.js';
import { header } from 'express-validator';
import { getVideoWithAttributes } from '../../../helpers/video.js';
function isValidVideoPasswordHeader() {
    return header('x-peertube-video-password')
        .optional()
        .isString();
}
function checkVideoIsPasswordProtected(res) {
    const video = getVideoWithAttributes(res);
    if (video.privacy !== VideoPrivacy.PASSWORD_PROTECTED) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: 'Video is not password protected'
        });
        return false;
    }
    return true;
}
async function doesVideoPasswordExist(idArg, res) {
    const video = getVideoWithAttributes(res);
    const id = forceNumber(idArg);
    const videoPassword = await VideoPasswordModel.loadByIdAndVideo({ id, videoId: video.id });
    if (!videoPassword) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video password not found'
        });
        return false;
    }
    res.locals.videoPassword = videoPassword;
    return true;
}
async function isVideoPasswordDeletable(res) {
    const user = res.locals.oauth.token.User;
    const userAccount = user.Account;
    const video = res.locals.videoAll;
    if (user.hasRight(UserRight.UPDATE_ANY_VIDEO) === false &&
        video.VideoChannel.accountId !== userAccount.id) {
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'Cannot remove passwords of another user\'s video'
        });
        return false;
    }
    const passwordCount = await VideoPasswordModel.countByVideoId(video.id);
    if (passwordCount <= 1) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: 'Cannot delete the last password of the protected video'
        });
        return false;
    }
    return true;
}
export { isValidVideoPasswordHeader, checkVideoIsPasswordProtected as isVideoPasswordProtected, doesVideoPasswordExist, isVideoPasswordDeletable };
//# sourceMappingURL=video-passwords.js.map