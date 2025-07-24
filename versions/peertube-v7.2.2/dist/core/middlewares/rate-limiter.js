import RateLimit from 'express-rate-limit';
import { UserRole } from '@peertube/peertube-models';
import { CONFIG } from '../initializers/config.js';
import { RunnerModel } from '../models/runner/runner.js';
import { optionalAuthenticate } from './auth.js';
import { logger } from '../helpers/logger.js';
const whitelistRoles = new Set([UserRole.ADMINISTRATOR, UserRole.MODERATOR]);
export function buildRateLimiter(options) {
    return RateLimit({
        windowMs: options.windowMs,
        max: options.max,
        skipFailedRequests: options.skipFailedRequests,
        handler: (req, res, next, options) => {
            var _a;
            if ((_a = req.body) === null || _a === void 0 ? void 0 : _a.runnerToken) {
                return RunnerModel.loadByToken(req.body.runnerToken)
                    .then(runner => {
                    if (runner)
                        return next();
                    return sendRateLimited(req, res, options);
                });
            }
            return optionalAuthenticate(req, res, () => {
                if (res.locals.authenticated === true && whitelistRoles.has(res.locals.oauth.token.User.role)) {
                    return next();
                }
                return sendRateLimited(req, res, options);
            });
        }
    });
}
export const apiRateLimiter = buildRateLimiter({
    windowMs: CONFIG.RATES_LIMIT.API.WINDOW_MS,
    max: CONFIG.RATES_LIMIT.API.MAX
});
export const activityPubRateLimiter = buildRateLimiter({
    windowMs: CONFIG.RATES_LIMIT.ACTIVITY_PUB.WINDOW_MS,
    max: CONFIG.RATES_LIMIT.ACTIVITY_PUB.MAX
});
function sendRateLimited(req, res, options) {
    logger.debug('Rate limit exceeded for route ' + req.originalUrl);
    return res.status(options.statusCode).send(options.message);
}
//# sourceMappingURL=rate-limiter.js.map