import { logger } from '../../helpers/logger.js';
import { body, header } from 'express-validator';
import { areValidationErrors } from './shared/utils.js';
import { cleanUpReqFiles } from '../../helpers/express-utils.js';
export const resumableInitValidator = [
    body('filename')
        .exists(),
    header('x-upload-content-length')
        .isNumeric()
        .exists()
        .withMessage('Should specify the file length'),
    header('x-upload-content-type')
        .isString()
        .exists()
        .withMessage('Should specify the file mimetype'),
    (req, res, next) => {
        logger.debug('Checking resumableInitValidator parameters and headers', {
            parameters: req.body,
            headers: req.headers
        });
        if (areValidationErrors(req, res, { omitLog: true }))
            return cleanUpReqFiles(req);
        res.locals.uploadVideoFileResumableMetadata = {
            mimetype: req.headers['x-upload-content-type'],
            size: +req.headers['x-upload-content-length'],
            originalname: req.body.filename
        };
        return next();
    }
];
//# sourceMappingURL=resumable-upload.js.map