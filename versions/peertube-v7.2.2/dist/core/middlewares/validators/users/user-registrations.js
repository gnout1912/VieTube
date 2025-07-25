import { body, param, query } from 'express-validator';
import { exists, isBooleanValid, isIdValid, toBooleanOrNull } from '../../../helpers/custom-validators/misc.js';
import { isRegistrationModerationResponseValid, isRegistrationReasonValid } from '../../../helpers/custom-validators/user-registration.js';
import { CONFIG } from '../../../initializers/config.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { HttpStatusCode, UserRegistrationState } from '@peertube/peertube-models';
import { isUserDisplayNameValid, isUserPasswordValid, isUserUsernameValid } from '../../../helpers/custom-validators/users.js';
import { isVideoChannelDisplayNameValid, isVideoChannelUsernameValid } from '../../../helpers/custom-validators/video-channels.js';
import { isSignupAllowed, isSignupAllowedForCurrentIP } from '../../../lib/signup.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { areValidationErrors, checkUsernameOrEmailDoNotAlreadyExist } from '../shared/index.js';
import { checkRegistrationHandlesDoNotAlreadyExist, checkRegistrationIdExist } from './shared/user-registrations.js';
const usersDirectRegistrationValidator = usersCommonRegistrationValidatorFactory();
const usersRequestRegistrationValidator = [
    ...usersCommonRegistrationValidatorFactory([
        body('registrationReason')
            .custom(isRegistrationReasonValid)
    ]),
    async (req, res, next) => {
        var _a;
        const body = req.body;
        if (CONFIG.SIGNUP.REQUIRES_APPROVAL !== true) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Signup approval is not enabled on this instance'
            });
        }
        const options = { username: body.username, email: body.email, channelHandle: (_a = body.channel) === null || _a === void 0 ? void 0 : _a.name, res };
        if (!await checkRegistrationHandlesDoNotAlreadyExist(options))
            return;
        return next();
    }
];
function ensureUserRegistrationAllowedFactory(signupMode) {
    return async (req, res, next) => {
        const allowedParams = {
            body: req.body,
            ip: req.ip,
            signupMode
        };
        const allowedResult = await Hooks.wrapPromiseFun(isSignupAllowed, allowedParams, signupMode === 'direct-registration'
            ? 'filter:api.user.signup.allowed.result'
            : 'filter:api.user.request-signup.allowed.result');
        if (allowedResult.allowed === false) {
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message: allowedResult.errorMessage || 'User registration is not allowed'
            });
        }
        return next();
    };
}
const ensureUserRegistrationAllowedForIP = [
    (req, res, next) => {
        const allowed = isSignupAllowedForCurrentIP(req.ip);
        if (allowed === false) {
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message: 'You are not on a network authorized for registration.'
            });
        }
        return next();
    }
];
const acceptOrRejectRegistrationValidator = [
    param('registrationId')
        .custom(isIdValid),
    body('moderationResponse')
        .custom(isRegistrationModerationResponseValid),
    body('preventEmailDelivery')
        .optional()
        .customSanitizer(toBooleanOrNull)
        .custom(isBooleanValid).withMessage('Should have preventEmailDelivery boolean'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await checkRegistrationIdExist(req.params.registrationId, res))
            return;
        if (res.locals.userRegistration.state !== UserRegistrationState.PENDING) {
            return res.fail({
                status: HttpStatusCode.CONFLICT_409,
                message: 'This registration is already accepted or rejected.'
            });
        }
        return next();
    }
];
const getRegistrationValidator = [
    param('registrationId')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await checkRegistrationIdExist(req.params.registrationId, res))
            return;
        return next();
    }
];
const listRegistrationsValidator = [
    query('search')
        .optional()
        .custom(exists),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
export { usersDirectRegistrationValidator, usersRequestRegistrationValidator, ensureUserRegistrationAllowedFactory, ensureUserRegistrationAllowedForIP, getRegistrationValidator, listRegistrationsValidator, acceptOrRejectRegistrationValidator };
function usersCommonRegistrationValidatorFactory(additionalValidationChain = []) {
    return [
        body('username')
            .custom(isUserUsernameValid),
        body('password')
            .custom(isUserPasswordValid),
        body('email')
            .isEmail(),
        body('displayName')
            .optional()
            .custom(isUserDisplayNameValid),
        body('channel.name')
            .optional()
            .custom(isVideoChannelUsernameValid),
        body('channel.displayName')
            .optional()
            .custom(isVideoChannelDisplayNameValid),
        ...additionalValidationChain,
        async (req, res, next) => {
            if (areValidationErrors(req, res, { omitBodyLog: true }))
                return;
            const body = req.body;
            if (!await checkUsernameOrEmailDoNotAlreadyExist(body.username, body.email, res))
                return;
            if (body.channel) {
                if (!body.channel.name || !body.channel.displayName) {
                    return res.fail({ message: 'Channel is optional but if you specify it, channel.name and channel.displayName are required.' });
                }
                if (body.channel.name === body.username) {
                    return res.fail({ message: 'Channel name cannot be the same as user username.' });
                }
                const existing = await ActorModel.loadLocalByName(body.channel.name);
                if (existing) {
                    return res.fail({
                        status: HttpStatusCode.CONFLICT_409,
                        message: `Channel with name ${body.channel.name} already exists.`
                    });
                }
            }
            return next();
        }
    ];
}
//# sourceMappingURL=user-registrations.js.map