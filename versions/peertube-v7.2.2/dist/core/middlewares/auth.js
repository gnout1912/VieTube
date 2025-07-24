import { HttpStatusCode } from '@peertube/peertube-models';
import { getAccessToken } from '../lib/auth/oauth-model.js';
import { RunnerModel } from '../models/runner/runner.js';
import { logger } from '../helpers/logger.js';
import { handleOAuthAuthenticate } from '../lib/auth/oauth.js';
function authenticate(req, res, next) {
    handleOAuthAuthenticate(req, res)
        .then((token) => {
        res.locals.oauth = { token };
        res.locals.authenticated = true;
        return next();
    })
        .catch(err => {
        logger.info('Cannot authenticate.', { err });
        return res.fail({
            status: err.status,
            message: 'Token is invalid',
            type: err.name
        });
    });
}
function authenticateSocket(socket, next) {
    const accessToken = socket.handshake.query['accessToken'];
    logger.debug('Checking access token in runner.');
    if (!accessToken)
        return next(new Error('No access token provided'));
    if (typeof accessToken !== 'string')
        return next(new Error('Access token is invalid'));
    getAccessToken(accessToken)
        .then(tokenDB => {
        const now = new Date();
        if (!tokenDB || tokenDB.accessTokenExpiresAt < now || tokenDB.refreshTokenExpiresAt < now) {
            return next(new Error('Invalid access token.'));
        }
        socket.handshake.auth.user = tokenDB.User;
        return next();
    })
        .catch(err => logger.error('Cannot get access token.', { err }));
}
function authenticatePromise(options) {
    const { req, res, errorMessage = 'Not authenticated', errorStatus = HttpStatusCode.UNAUTHORIZED_401, errorType } = options;
    return new Promise(resolve => {
        var _a;
        if ((_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.User)
            return resolve();
        if (res.locals.authenticated === false) {
            return res.fail({
                status: errorStatus,
                type: errorType,
                message: errorMessage
            });
        }
        authenticate(req, res, () => resolve());
    });
}
function optionalAuthenticate(req, res, next) {
    if (req.header('authorization'))
        return authenticate(req, res, next);
    res.locals.authenticated = false;
    return next();
}
function authenticateRunnerSocket(socket, next) {
    const runnerToken = socket.handshake.auth['runnerToken'];
    logger.debug('Checking runner token in socket.');
    if (!runnerToken)
        return next(new Error('No runner token provided'));
    if (typeof runnerToken !== 'string')
        return next(new Error('Runner token is invalid'));
    RunnerModel.loadByToken(runnerToken)
        .then(runner => {
        if (!runner)
            return next(new Error('Invalid runner token.'));
        socket.handshake.auth.runner = runner;
        return next();
    })
        .catch(err => logger.error('Cannot get runner token.', { err }));
}
export { authenticate, authenticateSocket, authenticatePromise, optionalAuthenticate, authenticateRunnerSocket };
//# sourceMappingURL=auth.js.map