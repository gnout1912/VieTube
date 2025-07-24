import { body, param, query } from 'express-validator';
import { forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { areAbusePredefinedReasonsValid, isAbuseFilterValid, isAbuseMessageValid, isAbuseModerationCommentValid, isAbusePredefinedReasonValid, isAbuseReasonValid, isAbuseStateValid, isAbuseTimestampCoherent, isAbuseTimestampValid, isAbuseVideoIsValid } from '../../helpers/custom-validators/abuses.js';
import { exists, isIdOrUUIDValid, isIdValid, toCompleteUUID, toIntOrNull } from '../../helpers/custom-validators/misc.js';
import { logger } from '../../helpers/logger.js';
import { AbuseMessageModel } from '../../models/abuse/abuse-message.js';
import { areValidationErrors, doesAbuseExist, doesAccountIdExist, doesCommentIdExist, doesVideoExist } from './shared/index.js';
const abuseReportValidator = [
    body('account.id')
        .optional()
        .custom(isIdValid),
    body('video.id')
        .optional()
        .customSanitizer(toCompleteUUID)
        .custom(isIdOrUUIDValid),
    body('video.startAt')
        .optional()
        .customSanitizer(toIntOrNull)
        .custom(isAbuseTimestampValid),
    body('video.endAt')
        .optional()
        .customSanitizer(toIntOrNull)
        .custom(isAbuseTimestampValid)
        .bail()
        .custom(isAbuseTimestampCoherent)
        .withMessage('Should have a startAt timestamp beginning before endAt'),
    body('comment.id')
        .optional()
        .custom(isIdValid),
    body('reason')
        .custom(isAbuseReasonValid),
    body('predefinedReasons')
        .optional()
        .custom(areAbusePredefinedReasonsValid),
    async (req, res, next) => {
        var _a, _b, _c, _d, _e, _f;
        if (areValidationErrors(req, res))
            return;
        const body = req.body;
        if (((_a = body.video) === null || _a === void 0 ? void 0 : _a.id) && !await doesVideoExist(body.video.id, res))
            return;
        if (((_b = body.account) === null || _b === void 0 ? void 0 : _b.id) && !await doesAccountIdExist({ id: body.account.id, res, checkIsLocal: false, checkManage: false }))
            return;
        if (((_c = body.comment) === null || _c === void 0 ? void 0 : _c.id) && !await doesCommentIdExist(body.comment.id, res))
            return;
        if (!((_d = body.video) === null || _d === void 0 ? void 0 : _d.id) && !((_e = body.account) === null || _e === void 0 ? void 0 : _e.id) && !((_f = body.comment) === null || _f === void 0 ? void 0 : _f.id)) {
            res.fail({ message: 'video id or account id or comment id is required.' });
            return;
        }
        return next();
    }
];
const abuseGetValidator = [
    param('id')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesAbuseExist(req.params.id, res))
            return;
        return next();
    }
];
const abuseUpdateValidator = [
    param('id')
        .custom(isIdValid),
    body('state')
        .optional()
        .custom(isAbuseStateValid),
    body('moderationComment')
        .optional()
        .custom(isAbuseModerationCommentValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesAbuseExist(req.params.id, res))
            return;
        return next();
    }
];
const abuseListForAdminsValidator = [
    query('id')
        .optional()
        .custom(isIdValid),
    query('filter')
        .optional()
        .custom(isAbuseFilterValid),
    query('predefinedReason')
        .optional()
        .custom(isAbusePredefinedReasonValid),
    query('search')
        .optional()
        .custom(exists),
    query('state')
        .optional()
        .custom(isAbuseStateValid),
    query('videoIs')
        .optional()
        .custom(isAbuseVideoIsValid),
    query('searchReporter')
        .optional()
        .custom(exists),
    query('searchReportee')
        .optional()
        .custom(exists),
    query('searchVideo')
        .optional()
        .custom(exists),
    query('searchVideoChannel')
        .optional()
        .custom(exists),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
const abuseListForUserValidator = [
    query('id')
        .optional()
        .custom(isIdValid),
    query('search')
        .optional()
        .custom(exists),
    query('state')
        .optional()
        .custom(isAbuseStateValid),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
const getAbuseValidator = [
    param('id')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesAbuseExist(req.params.id, res))
            return;
        const user = res.locals.oauth.token.user;
        const abuse = res.locals.abuse;
        if (user.hasRight(UserRight.MANAGE_ABUSES) !== true && abuse.reporterAccountId !== user.Account.id) {
            const message = `User ${user.username} does not have right to get abuse ${abuse.id}`;
            logger.warn(message);
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message
            });
        }
        return next();
    }
];
const checkAbuseValidForMessagesValidator = [
    (req, res, next) => {
        const abuse = res.locals.abuse;
        if (abuse.ReporterAccount.isOwned() === false) {
            return res.fail({ message: 'This abuse was created by a user of your instance.' });
        }
        return next();
    }
];
const addAbuseMessageValidator = [
    body('message')
        .custom(isAbuseMessageValid),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
const deleteAbuseMessageValidator = [
    param('messageId')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const user = res.locals.oauth.token.user;
        const abuse = res.locals.abuse;
        const messageId = forceNumber(req.params.messageId);
        const abuseMessage = await AbuseMessageModel.loadByIdAndAbuseId(messageId, abuse.id);
        if (!abuseMessage) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Abuse message not found'
            });
        }
        if (user.hasRight(UserRight.MANAGE_ABUSES) !== true && abuseMessage.accountId !== user.Account.id) {
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message: 'Cannot delete this abuse message'
            });
        }
        res.locals.abuseMessage = abuseMessage;
        return next();
    }
];
export { abuseListForAdminsValidator, abuseReportValidator, abuseGetValidator, addAbuseMessageValidator, checkAbuseValidForMessagesValidator, abuseUpdateValidator, deleteAbuseMessageValidator, abuseListForUserValidator, getAbuseValidator };
//# sourceMappingURL=abuse.js.map