import { body, param } from 'express-validator';
import { isIdValid } from '../../../helpers/custom-validators/misc.js';
import { isRunnerDescriptionValid, isRunnerNameValid, isRunnerRegistrationTokenValid, isRunnerTokenValid } from '../../../helpers/custom-validators/runners/runners.js';
import { RunnerModel } from '../../../models/runner/runner.js';
import { RunnerRegistrationTokenModel } from '../../../models/runner/runner-registration-token.js';
import { forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode, ServerErrorCode } from '@peertube/peertube-models';
import { areValidationErrors } from '../shared/utils.js';
const tags = ['runner'];
const registerRunnerValidator = [
    body('registrationToken').custom(isRunnerRegistrationTokenValid),
    body('name').custom(isRunnerNameValid),
    body('description').optional().custom(isRunnerDescriptionValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res, { tags }))
            return;
        const body = req.body;
        const runnerRegistrationToken = await RunnerRegistrationTokenModel.loadByRegistrationToken(body.registrationToken);
        if (!runnerRegistrationToken) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Registration token is invalid',
                tags
            });
        }
        const existing = await RunnerModel.loadByName(body.name);
        if (existing) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'This runner name already exists on this instance',
                tags
            });
        }
        res.locals.runnerRegistrationToken = runnerRegistrationToken;
        return next();
    }
];
const deleteRunnerValidator = [
    param('runnerId').custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res, { tags }))
            return;
        const runner = await RunnerModel.load(forceNumber(req.params.runnerId));
        if (!runner) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Runner not found',
                tags
            });
        }
        res.locals.runner = runner;
        return next();
    }
];
const getRunnerFromTokenValidator = [
    body('runnerToken').custom(isRunnerTokenValid),
    body('jobTypes').optional().isArray(),
    async (req, res, next) => {
        if (areValidationErrors(req, res, { tags }))
            return;
        const runner = await RunnerModel.loadByToken(req.body.runnerToken);
        if (!runner) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Unknown runner token',
                type: ServerErrorCode.UNKNOWN_RUNNER_TOKEN,
                tags
            });
        }
        res.locals.runner = runner;
        return next();
    }
];
export { registerRunnerValidator, deleteRunnerValidator, getRunnerFromTokenValidator };
//# sourceMappingURL=runners.js.map