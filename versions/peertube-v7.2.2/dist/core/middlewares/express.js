import { HttpStatusCode } from '@peertube/peertube-models';
import { logger } from '../helpers/logger.js';
export function setReqTimeout(timeoutMs) {
    return (req, res, next) => {
        req.setTimeout(timeoutMs, () => {
            logger.error('Express request timeout in ' + req.originalUrl);
            return res.fail({
                status: HttpStatusCode.REQUEST_TIMEOUT_408,
                message: 'Request has timed out.'
            });
        });
        next();
    };
}
//# sourceMappingURL=express.js.map