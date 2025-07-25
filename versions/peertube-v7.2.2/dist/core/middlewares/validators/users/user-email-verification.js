import { HttpStatusCode } from '@peertube/peertube-models';
import { toBooleanOrNull } from '../../../helpers/custom-validators/misc.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { getByEmailPermissive } from '../../../lib/user.js';
import { UserModel } from '../../../models/user/user.js';
import { body, param } from 'express-validator';
import { logger } from '../../../helpers/logger.js';
import { Redis } from '../../../lib/redis.js';
import { areValidationErrors, checkUserIdExist } from '../shared/index.js';
import { checkRegistrationEmailExistPermissive, checkRegistrationIdExist } from './shared/user-registrations.js';
export const usersAskSendUserVerifyEmailValidator = [
    body('email').isEmail().not().isEmpty().withMessage('Should have a valid email'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const { email } = await Hooks.wrapObject({
            email: req.body.email
        }, 'filter:api.email-verification.ask-send-verify-email.body');
        const [userEmail, userPendingEmail] = await Promise.all([
            UserModel.loadByEmailCaseInsensitive(email).then(users => getByEmailPermissive(users, email)),
            UserModel.loadByPendingEmailCaseInsensitive(email).then(users => getByEmailPermissive(users, email))
        ]);
        if (userEmail && userPendingEmail) {
            logger.error(`Found 2 users with email ${email} to send verification link.`);
            return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
        }
        if (!userEmail && !userPendingEmail) {
            logger.debug(`User with email ${email} does not exist (asking verify email).`);
            return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
        }
        res.locals.userEmail = userEmail;
        res.locals.userPendingEmail = userPendingEmail;
        const user = userEmail || userPendingEmail;
        if (user.pluginAuth) {
            return res.fail({
                status: HttpStatusCode.CONFLICT_409,
                message: 'Cannot ask verification email of a user that uses a plugin authentication.'
            });
        }
        return next();
    }
];
export const usersAskSendRegistrationVerifyEmailValidator = [
    body('email').isEmail().not().isEmpty().withMessage('Should have a valid email'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const { email } = await Hooks.wrapObject({
            email: req.body.email
        }, 'filter:api.email-verification.ask-send-verify-email.body');
        const registrationExists = await checkRegistrationEmailExistPermissive(email, res, false);
        if (!registrationExists) {
            logger.debug(`Registration with email ${email} does not exist (asking verify email).`);
            return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
        }
        return next();
    }
];
export const usersVerifyEmailValidator = [
    param('id')
        .isInt().not().isEmpty().withMessage('Should have a valid id'),
    body('verificationString')
        .not().isEmpty().withMessage('Should have a valid verification string'),
    body('isPendingEmail')
        .optional()
        .customSanitizer(toBooleanOrNull),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await checkUserIdExist(req.params.id, res))
            return;
        const user = res.locals.user;
        const redisVerificationString = await Redis.Instance.getUserVerifyEmailLink(user.id);
        if (redisVerificationString !== req.body.verificationString) {
            return res.fail({ status: HttpStatusCode.FORBIDDEN_403, message: 'Invalid verification string.' });
        }
        return next();
    }
];
export const registrationVerifyEmailValidator = [
    param('registrationId')
        .isInt().not().isEmpty().withMessage('Should have a valid registrationId'),
    body('verificationString')
        .not().isEmpty().withMessage('Should have a valid verification string'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await checkRegistrationIdExist(req.params.registrationId, res))
            return;
        const registration = res.locals.userRegistration;
        const redisVerificationString = await Redis.Instance.getRegistrationVerifyEmailLink(registration.id);
        if (redisVerificationString !== req.body.verificationString) {
            return res.fail({ status: HttpStatusCode.FORBIDDEN_403, message: 'Invalid verification string.' });
        }
        return next();
    }
];
//# sourceMappingURL=user-email-verification.js.map