import { retryTransactionWrapper } from '../helpers/database-utils.js';
function asyncMiddleware(fun) {
    return async (req, res, next) => {
        if (Array.isArray(fun) !== true) {
            return Promise.resolve(fun(req, res, next))
                .catch(err => next(err));
        }
        try {
            for (const f of fun) {
                await new Promise((resolve, reject) => {
                    return asyncMiddleware(f)(req, res, err => {
                        if (err)
                            return reject(err);
                        return resolve();
                    });
                });
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
function asyncRetryTransactionMiddleware(fun) {
    return (req, res, next) => {
        return Promise.resolve(retryTransactionWrapper(fun, req, res, next)).catch(err => next(err));
    };
}
export { asyncMiddleware, asyncRetryTransactionMiddleware };
//# sourceMappingURL=async.js.map