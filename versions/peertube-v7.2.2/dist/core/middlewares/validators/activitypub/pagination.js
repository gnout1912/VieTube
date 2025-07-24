import { query } from 'express-validator';
import { PAGINATION } from '../../../initializers/constants.js';
import { areValidationErrors } from '../shared/index.js';
const apPaginationValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 }),
    query('size')
        .optional()
        .isInt({ min: 0, max: PAGINATION.OUTBOX.COUNT.MAX }).withMessage(`Should have a valid page size (max: ${PAGINATION.OUTBOX.COUNT.MAX})`),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
export { apPaginationValidator };
//# sourceMappingURL=pagination.js.map