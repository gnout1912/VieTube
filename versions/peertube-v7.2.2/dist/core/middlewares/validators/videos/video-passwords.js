import { areValidationErrors, doesVideoExist, isVideoPasswordProtected, isValidVideoIdParam, doesVideoPasswordExist, isVideoPasswordDeletable, checkUserCanManageVideo } from '../shared/index.js';
import { body, param } from 'express-validator';
import { isIdValid } from '../../../helpers/custom-validators/misc.js';
import { isValidPasswordProtectedPrivacy } from '../../../helpers/custom-validators/videos.js';
import { UserRight } from '@peertube/peertube-models';
const listVideoPasswordValidator = [
    isValidVideoIdParam('videoId'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.videoId, res))
            return;
        if (!isVideoPasswordProtected(res))
            return;
        const user = res.locals.oauth.token.User;
        if (!checkUserCanManageVideo(user, res.locals.videoAll, UserRight.SEE_ALL_VIDEOS, res))
            return;
        return next();
    }
];
const updateVideoPasswordListValidator = [
    body('passwords')
        .optional()
        .isArray()
        .withMessage('Video passwords should be an array.'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.videoId, res))
            return;
        if (!isValidPasswordProtectedPrivacy(req, res))
            return;
        const user = res.locals.oauth.token.User;
        if (!checkUserCanManageVideo(user, res.locals.videoAll, UserRight.UPDATE_ANY_VIDEO, res))
            return;
        return next();
    }
];
const removeVideoPasswordValidator = [
    isValidVideoIdParam('videoId'),
    param('passwordId')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.videoId, res))
            return;
        if (!isVideoPasswordProtected(res))
            return;
        if (!await doesVideoPasswordExist(req.params.passwordId, res))
            return;
        if (!await isVideoPasswordDeletable(res))
            return;
        return next();
    }
];
export { listVideoPasswordValidator, updateVideoPasswordListValidator, removeVideoPasswordValidator };
//# sourceMappingURL=video-passwords.js.map