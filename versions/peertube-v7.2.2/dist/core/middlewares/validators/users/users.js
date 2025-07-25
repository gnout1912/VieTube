import { arrayify, forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode, ServerErrorCode, UserRole } from '@peertube/peertube-models';
import { isStringArray } from '../../../helpers/custom-validators/search.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { body, param, query } from 'express-validator';
import { exists, isIdValid, toBooleanOrNull, toIntOrNull } from '../../../helpers/custom-validators/misc.js';
import { isThemeNameValid } from '../../../helpers/custom-validators/plugins.js';
import { isUserAdminFlagsValid, isUserAutoPlayNextVideoValid, isUserAutoPlayVideoValid, isUserBlockedReasonValid, isUserDescriptionValid, isUserDisplayNameValid, isUserEmailPublicValid, isUserNoModal, isUserNSFWPolicyValid, isUserP2PEnabledValid, isUserPasswordValid, isUserPasswordValidOrEmpty, isUserRoleValid, isUserUsernameValid, isUserVideoLanguages, isUserVideoQuotaDailyValid, isUserVideoQuotaValid, isUserVideosHistoryEnabledValid } from '../../../helpers/custom-validators/users.js';
import { isVideoChannelUsernameValid } from '../../../helpers/custom-validators/video-channels.js';
import { logger } from '../../../helpers/logger.js';
import { isThemeRegistered } from '../../../lib/plugins/theme-utils.js';
import { Redis } from '../../../lib/redis.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { areValidationErrors, checkEmailDoesNotAlreadyExist, checkUserEmailExistPermissive, checkUserIdExist, checkUsernameOrEmailDoNotAlreadyExist, doesChannelIdExist, doesVideoExist, isValidVideoIdParam } from '../shared/index.js';
import { isNSFWFlagsValid } from '../../../helpers/custom-validators/videos.js';
export const usersListValidator = [
    query('blocked')
        .optional()
        .customSanitizer(toBooleanOrNull)
        .isBoolean().withMessage('Should be a valid blocked boolean'),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
export const usersAddValidator = [
    body('username')
        .custom(isUserUsernameValid)
        .withMessage('Should have a valid username (lowercase alphanumeric characters)'),
    body('password')
        .custom(isUserPasswordValidOrEmpty),
    body('email')
        .isEmail(),
    body('channelName')
        .optional()
        .custom(isVideoChannelUsernameValid),
    body('videoQuota')
        .optional()
        .custom(isUserVideoQuotaValid),
    body('videoQuotaDaily')
        .optional()
        .custom(isUserVideoQuotaDailyValid),
    body('role')
        .customSanitizer(toIntOrNull)
        .custom(isUserRoleValid),
    body('adminFlags')
        .optional()
        .custom(isUserAdminFlagsValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res, { omitBodyLog: true }))
            return;
        if (!await checkUsernameOrEmailDoNotAlreadyExist(req.body.username, req.body.email, res))
            return;
        const authUser = res.locals.oauth.token.User;
        if (authUser.role !== UserRole.ADMINISTRATOR && req.body.role !== UserRole.USER) {
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message: 'You can only create users (and not administrators or moderators)'
            });
        }
        if (req.body.channelName) {
            if (req.body.channelName === req.body.username) {
                return res.fail({ message: 'Channel name cannot be the same as user username.' });
            }
            const existing = await ActorModel.loadLocalByName(req.body.channelName);
            if (existing) {
                return res.fail({
                    status: HttpStatusCode.CONFLICT_409,
                    message: `Channel with name ${req.body.channelName} already exists.`
                });
            }
        }
        return next();
    }
];
export const usersRemoveValidator = [
    param('id')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await checkUserIdExist(req.params.id, res))
            return;
        const user = res.locals.user;
        if (user.username === 'root') {
            return res.fail({ message: 'Cannot remove the root user' });
        }
        if (!checkUserCanModerate(user, res))
            return;
        return next();
    }
];
export const usersBlockToggleValidator = [
    param('id')
        .custom(isIdValid),
    body('reason')
        .optional()
        .custom(isUserBlockedReasonValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await checkUserIdExist(req.params.id, res))
            return;
        const user = res.locals.user;
        if (user.username === 'root') {
            return res.fail({ message: 'Cannot block the root user' });
        }
        if (!checkUserCanModerate(user, res))
            return;
        return next();
    }
];
export const deleteMeValidator = [
    (req, res, next) => {
        const user = res.locals.oauth.token.User;
        if (user.username === 'root') {
            return res.fail({ message: 'You cannot delete your root account.' });
        }
        return next();
    }
];
export const usersUpdateValidator = [
    param('id').custom(isIdValid),
    body('password')
        .optional()
        .custom(isUserPasswordValid),
    body('email')
        .optional()
        .isEmail(),
    body('emailVerified')
        .optional()
        .isBoolean(),
    body('videoQuota')
        .optional()
        .custom(isUserVideoQuotaValid),
    body('videoQuotaDaily')
        .optional()
        .custom(isUserVideoQuotaDailyValid),
    body('pluginAuth')
        .optional()
        .exists(),
    body('role')
        .optional()
        .customSanitizer(toIntOrNull)
        .custom(isUserRoleValid),
    body('adminFlags')
        .optional()
        .custom(isUserAdminFlagsValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res, { omitBodyLog: true }))
            return;
        if (!await checkUserIdExist(req.params.id, res))
            return;
        const user = res.locals.user;
        if (user.username === 'root' && req.body.role !== undefined && user.role !== req.body.role) {
            return res.fail({ message: 'Cannot change root role.' });
        }
        if (!checkUserCanModerate(user, res))
            return;
        if (req.body.email && req.body.email !== user.email && !await checkEmailDoesNotAlreadyExist(req.body.email, res))
            return;
        return next();
    }
];
export const usersUpdateMeValidator = [
    body('displayName')
        .optional()
        .custom(isUserDisplayNameValid),
    body('description')
        .optional()
        .custom(isUserDescriptionValid),
    body('currentPassword')
        .optional()
        .custom(exists),
    body('password')
        .optional()
        .custom(isUserPasswordValid),
    body('emailPublic')
        .optional()
        .custom(isUserEmailPublicValid),
    body('email')
        .optional()
        .isEmail(),
    body('nsfwPolicy')
        .optional()
        .custom(isUserNSFWPolicyValid),
    body('nsfwFlagsDisplayed')
        .optional()
        .custom(isNSFWFlagsValid),
    body('nsfwFlagsHidden')
        .optional()
        .custom(isNSFWFlagsValid),
    body('nsfwFlagsWarned')
        .optional()
        .custom(isNSFWFlagsValid),
    body('nsfwFlagsBlurred')
        .optional()
        .custom(isNSFWFlagsValid),
    body('autoPlayVideo')
        .optional()
        .custom(isUserAutoPlayVideoValid),
    body('p2pEnabled')
        .optional()
        .custom(isUserP2PEnabledValid).withMessage('Should have a valid p2p enabled boolean'),
    body('videoLanguages')
        .optional()
        .custom(isUserVideoLanguages),
    body('videosHistoryEnabled')
        .optional()
        .custom(isUserVideosHistoryEnabledValid).withMessage('Should have a valid videos history enabled boolean'),
    body('theme')
        .optional()
        .custom(v => isThemeNameValid(v) && isThemeRegistered(v)),
    body('noInstanceConfigWarningModal')
        .optional()
        .custom(v => isUserNoModal(v)).withMessage('Should have a valid noInstanceConfigWarningModal boolean'),
    body('noWelcomeModal')
        .optional()
        .custom(v => isUserNoModal(v)).withMessage('Should have a valid noWelcomeModal boolean'),
    body('noAccountSetupWarningModal')
        .optional()
        .custom(v => isUserNoModal(v)).withMessage('Should have a valid noAccountSetupWarningModal boolean'),
    body('autoPlayNextVideo')
        .optional()
        .custom(v => isUserAutoPlayNextVideoValid(v)).withMessage('Should have a valid autoPlayNextVideo boolean'),
    async (req, res, next) => {
        const user = res.locals.oauth.token.User;
        const body = req.body;
        if (((body.nsfwFlagsBlurred || 0) & (body.nsfwFlagsWarned || 0)) !== 0 ||
            ((body.nsfwFlagsBlurred || 0) & (body.nsfwFlagsDisplayed || 0)) !== 0 ||
            ((body.nsfwFlagsBlurred || 0) & (body.nsfwFlagsHidden || 0)) !== 0 ||
            ((body.nsfwFlagsDisplayed || 0) & (body.nsfwFlagsHidden || 0)) !== 0 ||
            ((body.nsfwFlagsDisplayed || 0) & (body.nsfwFlagsWarned || 0)) !== 0 ||
            ((body.nsfwFlagsHidden || 0) & (body.nsfwFlagsWarned || 0)) !== 0) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Cannot use same flags in nsfwFlagsDisplayed, nsfwFlagsHidden, nsfwFlagsBlurred and nsfwFlagsWarned at the same time'
            });
        }
        if (body.password || body.email) {
            if (user.pluginAuth !== null) {
                return res.fail({ message: 'You cannot update your email or password that is associated with an external auth system.' });
            }
            if (!body.currentPassword) {
                return res.fail({ message: 'currentPassword parameter is missing' });
            }
            if (await user.isPasswordMatch(body.currentPassword) !== true) {
                return res.fail({
                    status: HttpStatusCode.UNAUTHORIZED_401,
                    message: 'currentPassword is invalid.',
                    type: ServerErrorCode.CURRENT_PASSWORD_IS_INVALID
                });
            }
        }
        if (areValidationErrors(req, res, { omitBodyLog: true }))
            return;
        if (body.email && body.email !== user.email && !await checkEmailDoesNotAlreadyExist(body.email, res))
            return;
        return next();
    }
];
export const usersGetValidator = [
    param('id')
        .custom(isIdValid),
    query('withStats')
        .optional()
        .isBoolean().withMessage('Should have a valid withStats boolean'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await checkUserIdExist(req.params.id, res, req.query.withStats))
            return;
        return next();
    }
];
export const usersVideoRatingValidator = [
    isValidVideoIdParam('videoId'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.videoId, res, 'id'))
            return;
        return next();
    }
];
export const usersVideosValidator = [
    query('channelId')
        .optional()
        .customSanitizer(toIntOrNull)
        .custom(isIdValid),
    query('channelNameOneOf')
        .optional()
        .customSanitizer(arrayify)
        .custom(isStringArray).withMessage('Should have a valid channelNameOneOf array'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (req.query.channelId && !await doesChannelIdExist({ id: req.query.channelId, checkManage: true, checkIsLocal: true, res }))
            return;
        return next();
    }
];
export const usersAskResetPasswordValidator = [
    body('email')
        .isEmail(),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const { email } = await Hooks.wrapObject({
            email: req.body.email
        }, 'filter:api.users.ask-reset-password.body');
        const exists = await checkUserEmailExistPermissive(email, res, false);
        if (!exists) {
            logger.debug('User with email %s does not exist (asking reset password).', email);
            return res.status(HttpStatusCode.NO_CONTENT_204).end();
        }
        if (res.locals.user.pluginAuth) {
            return res.fail({
                status: HttpStatusCode.CONFLICT_409,
                message: 'Cannot recover password of a user that uses a plugin authentication.'
            });
        }
        return next();
    }
];
export const usersResetPasswordValidator = [
    param('id')
        .custom(isIdValid),
    body('verificationString')
        .not().isEmpty(),
    body('password')
        .custom(isUserPasswordValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await checkUserIdExist(req.params.id, res))
            return;
        const user = res.locals.user;
        const redisVerificationString = await Redis.Instance.getResetPasswordVerificationString(user.id);
        if (redisVerificationString !== req.body.verificationString) {
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message: 'Invalid verification string.'
            });
        }
        return next();
    }
];
export const usersCheckCurrentPasswordFactory = (targetUserIdGetter) => {
    return [
        body('currentPassword').optional().custom(exists),
        async (req, res, next) => {
            if (areValidationErrors(req, res))
                return;
            const user = res.locals.oauth.token.User;
            const isAdminOrModerator = user.role === UserRole.ADMINISTRATOR || user.role === UserRole.MODERATOR;
            const targetUserId = forceNumber(targetUserIdGetter(req));
            if (isAdminOrModerator && targetUserId !== user.id) {
                return next();
            }
            if (!req.body.currentPassword) {
                return res.fail({
                    status: HttpStatusCode.BAD_REQUEST_400,
                    message: 'currentPassword is missing'
                });
            }
            if (await user.isPasswordMatch(req.body.currentPassword) !== true) {
                return res.fail({
                    status: HttpStatusCode.FORBIDDEN_403,
                    message: 'currentPassword is invalid.',
                    type: ServerErrorCode.CURRENT_PASSWORD_IS_INVALID
                });
            }
            return next();
        }
    ];
};
export const userAutocompleteValidator = [
    param('search')
        .isString()
        .not().isEmpty()
];
function checkUserCanModerate(onUser, res) {
    const authUser = res.locals.oauth.token.User;
    if (authUser.role === UserRole.ADMINISTRATOR)
        return true;
    if (authUser.role === UserRole.MODERATOR && onUser.role === UserRole.USER)
        return true;
    res.fail({
        status: HttpStatusCode.FORBIDDEN_403,
        message: 'Users can only be managed by moderators or admins.'
    });
    return false;
}
//# sourceMappingURL=users.js.map