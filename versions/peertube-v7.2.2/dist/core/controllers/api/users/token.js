import express from 'express';
import { logger } from '../../../helpers/logger.js';
import { CONFIG } from '../../../initializers/config.js';
import { OTP } from '../../../initializers/constants.js';
import { getAuthNameFromRefreshGrant, getBypassFromExternalAuth, getBypassFromPasswordGrant } from '../../../lib/auth/external-auth.js';
import { revokeToken } from '../../../lib/auth/oauth-model.js';
import { handleOAuthToken, MissingTwoFactorError } from '../../../lib/auth/oauth.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { asyncMiddleware, authenticate, buildRateLimiter, openapiOperationDoc } from '../../../middlewares/index.js';
import { buildUUID } from '@peertube/peertube-node-utils';
const tokensRouter = express.Router();
const loginRateLimiter = buildRateLimiter({
    windowMs: CONFIG.RATES_LIMIT.LOGIN.WINDOW_MS,
    max: CONFIG.RATES_LIMIT.LOGIN.MAX
});
tokensRouter.post('/token', loginRateLimiter, openapiOperationDoc({ operationId: 'getOAuthToken' }), asyncMiddleware(handleToken));
tokensRouter.post('/revoke-token', openapiOperationDoc({ operationId: 'revokeOAuthToken' }), authenticate, asyncMiddleware(handleTokenRevocation));
tokensRouter.get('/scoped-tokens', authenticate, getScopedTokens);
tokensRouter.post('/scoped-tokens', authenticate, asyncMiddleware(renewScopedTokens));
export { tokensRouter };
async function handleToken(req, res, next) {
    const grantType = req.body.grant_type;
    try {
        const bypassLogin = await buildByPassLogin(req, grantType);
        const refreshTokenAuthName = grantType === 'refresh_token'
            ? await getAuthNameFromRefreshGrant(req.body.refresh_token)
            : undefined;
        const options = {
            refreshTokenAuthName,
            bypassLogin
        };
        const token = await handleOAuthToken(req, options);
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');
        Hooks.runAction('action:api.user.oauth2-got-token', { username: token.user.username, ip: req.ip, req, res });
        return res.json({
            token_type: 'Bearer',
            access_token: token.accessToken,
            refresh_token: token.refreshToken,
            expires_in: token.accessTokenExpiresIn,
            refresh_token_expires_in: token.refreshTokenExpiresIn
        });
    }
    catch (err) {
        if (err instanceof MissingTwoFactorError) {
            res.set(OTP.HEADER_NAME, OTP.HEADER_REQUIRED_VALUE);
            logger.debug('Missing two factor error', { err });
        }
        else {
            logger.warn('Login error', { err });
        }
        return res.fail({
            status: err.code,
            message: err.message,
            type: err.name
        });
    }
}
async function handleTokenRevocation(req, res) {
    const token = res.locals.oauth.token;
    const result = await revokeToken(token, { req, explicitLogout: true });
    return res.json(result);
}
function getScopedTokens(req, res) {
    const user = res.locals.oauth.token.user;
    return res.json({
        feedToken: user.feedToken
    });
}
async function renewScopedTokens(req, res) {
    const user = res.locals.oauth.token.user;
    user.feedToken = buildUUID();
    await user.save();
    return res.json({
        feedToken: user.feedToken
    });
}
async function buildByPassLogin(req, grantType) {
    if (grantType !== 'password')
        return undefined;
    if (req.body.externalAuthToken) {
        return getBypassFromExternalAuth(req.body.username, req.body.externalAuthToken);
    }
    return getBypassFromPasswordGrant(req.body.username, req.body.password);
}
//# sourceMappingURL=token.js.map