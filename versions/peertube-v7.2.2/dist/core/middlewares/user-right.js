import { HttpStatusCode } from '@peertube/peertube-models';
import { logger } from '../helpers/logger.js';
function ensureUserHasRight(userRight) {
    return function (req, res, next) {
        const user = res.locals.oauth.token.user;
        if (user.hasRight(userRight) === false) {
            const message = `User ${user.username} does not have right ${userRight} to access to ${req.path}.`;
            logger.info(message);
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message
            });
        }
        return next();
    };
}
export { ensureUserHasRight };
//# sourceMappingURL=user-right.js.map