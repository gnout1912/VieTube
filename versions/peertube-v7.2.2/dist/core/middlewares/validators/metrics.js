import { body } from 'express-validator';
import { isValidPlayerMode } from '../../helpers/custom-validators/metrics.js';
import { isIdOrUUIDValid, toCompleteUUID } from '../../helpers/custom-validators/misc.js';
import { CONFIG } from '../../initializers/config.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { areValidationErrors, doesVideoExist } from './shared/index.js';
const addPlaybackMetricValidator = [
    body('resolution')
        .isInt({ min: 0 }),
    body('fps')
        .optional()
        .isInt({ min: 0 }),
    body('p2pPeers')
        .optional()
        .isInt({ min: 0 }),
    body('p2pEnabled')
        .isBoolean(),
    body('playerMode')
        .custom(isValidPlayerMode),
    body('resolutionChanges')
        .isInt({ min: 0 }),
    body('bufferStalled')
        .optional()
        .isInt({ min: 0 }),
    body('errors')
        .isInt({ min: 0 }),
    body('downloadedBytesP2P')
        .isInt({ min: 0 }),
    body('downloadedBytesHTTP')
        .isInt({ min: 0 }),
    body('uploadedBytesP2P')
        .isInt({ min: 0 }),
    body('videoId')
        .customSanitizer(toCompleteUUID)
        .custom(isIdOrUUIDValid),
    async (req, res, next) => {
        if (!CONFIG.OPEN_TELEMETRY.METRICS.ENABLED)
            return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
        const body = req.body;
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(body.videoId, res, 'unsafe-only-immutable-attributes'))
            return;
        return next();
    }
];
export { addPlaybackMetricValidator };
//# sourceMappingURL=metrics.js.map