import { query } from 'express-validator';
import { PAGINATION } from '../../initializers/constants.js';
import { areValidationErrors } from './shared/index.js';
const paginationValidator = paginationValidatorBuilder();
function paginationValidatorBuilder(tags = []) {
    return [
        query('start')
            .optional()
            .isInt({ min: 0 }),
        query('count')
            .optional()
            .isInt({ min: 0, max: PAGINATION.GLOBAL.COUNT.MAX }).withMessage(`Should have a number count (max: ${PAGINATION.GLOBAL.COUNT.MAX})`),
        (req, res, next) => {
            if (areValidationErrors(req, res, { tags }))
                return;
            return next();
        }
    ];
}
export { paginationValidator, paginationValidatorBuilder };
//# sourceMappingURL=pagination.js.map