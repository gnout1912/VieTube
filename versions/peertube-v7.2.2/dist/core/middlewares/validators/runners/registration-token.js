import { param } from 'express-validator';
import { isIdValid } from '../../../helpers/custom-validators/misc.js';
import { RunnerRegistrationTokenModel } from '../../../models/runner/runner-registration-token.js';
import { forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode } from '@peertube/peertube-models';
import { areValidationErrors } from '../shared/utils.js';
const tags = ['runner'];
const deleteRegistrationTokenValidator = [
    param('id').custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res, { tags }))
            return;
        const registrationToken = await RunnerRegistrationTokenModel.load(forceNumber(req.params.id));
        if (!registrationToken) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Registration token not found',
                tags
            });
        }
        res.locals.runnerRegistrationToken = registrationToken;
        return next();
    }
];
export { deleteRegistrationTokenValidator };
//# sourceMappingURL=registration-token.js.map