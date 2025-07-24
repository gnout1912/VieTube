import { HttpStatusCode, UserRight, VideoChangeOwnershipStatus, VideoState } from '@peertube/peertube-models';
import { isIdValid } from '../../../helpers/custom-validators/misc.js';
import { checkUserCanTerminateOwnershipChange } from '../../../helpers/custom-validators/video-ownership.js';
import { AccountModel } from '../../../models/account/account.js';
import { param } from 'express-validator';
import { areValidationErrors, checkUserCanManageVideo, checkUserQuota, doesChangeVideoOwnershipExist, doesVideoChannelOfAccountExist, doesVideoExist, isValidVideoIdParam } from '../shared/index.js';
export const videosChangeOwnershipValidator = [
    isValidVideoIdParam('videoId'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.videoId, res))
            return;
        if (!checkUserCanManageVideo(res.locals.oauth.token.User, res.locals.videoAll, UserRight.CHANGE_VIDEO_OWNERSHIP, res))
            return;
        const nextOwner = await AccountModel.loadLocalByName(req.body.username);
        if (!nextOwner) {
            res.fail({ message: 'Changing video ownership to a remote account is not supported yet' });
            return;
        }
        res.locals.nextOwner = nextOwner;
        return next();
    }
];
export const videosTerminateChangeOwnershipValidator = [
    param('id')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesChangeVideoOwnershipExist(req.params.id, res))
            return;
        if (!checkUserCanTerminateOwnershipChange(res.locals.oauth.token.User, res.locals.videoChangeOwnership, res))
            return;
        const videoChangeOwnership = res.locals.videoChangeOwnership;
        if (videoChangeOwnership.status !== VideoChangeOwnershipStatus.WAITING) {
            res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message: 'Ownership already accepted or refused'
            });
            return;
        }
        return next();
    }
];
export const videosAcceptChangeOwnershipValidator = [
    async (req, res, next) => {
        const body = req.body;
        if (!await doesVideoChannelOfAccountExist(body.channelId, res.locals.oauth.token.User, res))
            return;
        const videoChangeOwnership = res.locals.videoChangeOwnership;
        const video = videoChangeOwnership.Video;
        if (!await checkCanAccept(video, res))
            return;
        return next();
    }
];
async function checkCanAccept(video, res) {
    if (video.isLive) {
        if (video.state !== VideoState.WAITING_FOR_LIVE) {
            res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'You can accept an ownership change of a published live.'
            });
            return false;
        }
        return true;
    }
    const user = res.locals.oauth.token.User;
    if (!await checkUserQuota(user, video.getMaxQualityBytes(), res))
        return false;
    return true;
}
//# sourceMappingURL=video-ownership-changes.js.map