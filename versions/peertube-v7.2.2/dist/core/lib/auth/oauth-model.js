import { AccessDeniedError } from '@node-oauth/oauth2-server';
import { PluginManager } from '../plugins/plugin-manager.js';
import { pick } from '@peertube/peertube-core-utils';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { OAuthClientModel } from '../../models/oauth/oauth-client.js';
import { OAuthTokenModel } from '../../models/oauth/oauth-token.js';
import { UserModel } from '../../models/user/user.js';
import { findAvailableLocalActorName } from '../local-actor.js';
import { buildUser, createUserAccountAndChannelAndPlaylist, getByEmailPermissive } from '../user.js';
import { TokensCache } from './tokens-cache.js';
async function getAccessToken(bearerToken) {
    logger.debug('Getting access token.');
    if (!bearerToken)
        return undefined;
    let tokenModel;
    if (TokensCache.Instance.hasToken(bearerToken)) {
        tokenModel = TokensCache.Instance.getByToken(bearerToken);
    }
    else {
        tokenModel = await OAuthTokenModel.getByTokenAndPopulateUser(bearerToken);
        if (tokenModel)
            TokensCache.Instance.setToken(tokenModel);
    }
    if (!tokenModel)
        return undefined;
    if (tokenModel.User.pluginAuth) {
        const valid = await PluginManager.Instance.isTokenValid(tokenModel, 'access');
        if (valid !== true)
            return undefined;
    }
    return tokenModel;
}
function getClient(clientId, clientSecret) {
    logger.debug('Getting Client (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ').');
    return OAuthClientModel.getByIdAndSecret(clientId, clientSecret);
}
async function getRefreshToken(refreshToken) {
    logger.debug('Getting RefreshToken (refreshToken: ' + refreshToken + ').');
    const tokenInfo = await OAuthTokenModel.getByRefreshTokenAndPopulateClient(refreshToken);
    if (!tokenInfo)
        return undefined;
    const tokenModel = tokenInfo.token;
    if (tokenModel.User.pluginAuth) {
        const valid = await PluginManager.Instance.isTokenValid(tokenModel, 'refresh');
        if (valid !== true)
            return undefined;
    }
    return tokenInfo;
}
async function getUser(usernameOrEmail, password, bypassLogin) {
    if (bypassLogin && bypassLogin.bypass === true) {
        logger.info('Bypassing oauth login by plugin %s.', bypassLogin.pluginName);
        let user = getByEmailPermissive(await UserModel.loadByEmailCaseInsensitive(bypassLogin.user.email), bypassLogin.user.email);
        if (!user) {
            user = await createUserFromExternal(bypassLogin.pluginName, bypassLogin.user);
        }
        else if (user.pluginAuth === bypassLogin.pluginName) {
            user = await updateUserFromExternal(user, bypassLogin.user, bypassLogin.userUpdater);
        }
        if (!user)
            throw new AccessDeniedError('Cannot create such user: an actor with that name already exists.');
        if (user.pluginAuth !== null) {
            if (user.pluginAuth !== bypassLogin.pluginName) {
                logger.info('Cannot bypass oauth login by plugin %s because %s has another plugin auth method (%s).', bypassLogin.pluginName, bypassLogin.user.email, user.pluginAuth);
                return null;
            }
            checkUserValidityOrThrow(user);
            return user;
        }
    }
    logger.debug('Getting User (username/email: ' + usernameOrEmail + ', password: ******).');
    const users = await UserModel.loadByUsernameOrEmailCaseInsensitive(usernameOrEmail);
    let user;
    if (usernameOrEmail.includes('@')) {
        user = getByEmailPermissive(users, usernameOrEmail);
    }
    else if (users.length === 1) {
        user = users[0];
    }
    if (!user || user.pluginAuth !== null || !password)
        return null;
    const passwordMatch = await user.isPasswordMatch(password);
    if (passwordMatch !== true)
        return null;
    checkUserValidityOrThrow(user);
    if (CONFIG.SIGNUP.REQUIRES_EMAIL_VERIFICATION && user.emailVerified === false) {
        throw new AccessDeniedError('User email is not verified.');
    }
    return user;
}
async function revokeToken(tokenInfo, options = {}) {
    const { req, explicitLogout } = options;
    const token = await OAuthTokenModel.getByRefreshTokenAndPopulateUser(tokenInfo.refreshToken);
    if (token) {
        let redirectUrl;
        if (explicitLogout === true && token.User.pluginAuth && token.authName) {
            redirectUrl = await PluginManager.Instance.onLogout(token.User.pluginAuth, token.authName, token.User, req);
        }
        TokensCache.Instance.clearCacheByToken(token.accessToken);
        token.destroy()
            .catch(err => logger.error('Cannot destroy token when revoking token.', { err }));
        return { success: true, redirectUrl };
    }
    return { success: false };
}
async function saveToken(token, client, user, options = {}) {
    const { refreshTokenAuthName, bypassLogin } = options;
    let authName = null;
    if ((bypassLogin === null || bypassLogin === void 0 ? void 0 : bypassLogin.bypass) === true) {
        authName = bypassLogin.authName;
    }
    else if (refreshTokenAuthName) {
        authName = refreshTokenAuthName;
    }
    logger.debug('Saving token ' + token.accessToken + ' for client ' + client.id + ' and user ' + user.id + '.');
    const tokenToCreate = {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        authName,
        oAuthClientId: client.id,
        userId: user.id
    };
    const tokenCreated = await OAuthTokenModel.create(tokenToCreate);
    user.lastLoginDate = new Date();
    await user.save();
    return {
        accessToken: tokenCreated.accessToken,
        accessTokenExpiresAt: tokenCreated.accessTokenExpiresAt,
        refreshToken: tokenCreated.refreshToken,
        refreshTokenExpiresAt: tokenCreated.refreshTokenExpiresAt,
        client,
        user,
        accessTokenExpiresIn: buildExpiresIn(tokenCreated.accessTokenExpiresAt),
        refreshTokenExpiresIn: buildExpiresIn(tokenCreated.refreshTokenExpiresAt)
    };
}
export { getAccessToken, getClient, getRefreshToken, getUser, revokeToken, saveToken };
async function createUserFromExternal(pluginAuth, userOptions) {
    const username = await findAvailableLocalActorName(userOptions.username);
    const userToCreate = buildUser(Object.assign(Object.assign({}, pick(userOptions, ['email', 'role', 'adminFlags', 'videoQuota', 'videoQuotaDaily'])), { username, emailVerified: null, password: null, pluginAuth }));
    const { user } = await createUserAccountAndChannelAndPlaylist({
        userToCreate,
        userDisplayName: userOptions.displayName
    });
    return user;
}
async function updateUserFromExternal(user, userOptions, userUpdater) {
    if (!userUpdater)
        return user;
    {
        const mappingKeys = {
            role: 'role',
            adminFlags: 'adminFlags',
            videoQuota: 'videoQuota',
            videoQuotaDaily: 'videoQuotaDaily'
        };
        for (const modelKey of Object.keys(mappingKeys)) {
            const pluginOptionKey = mappingKeys[modelKey];
            const newValue = userUpdater({ fieldName: pluginOptionKey, currentValue: user[modelKey], newValue: userOptions[pluginOptionKey] });
            user.set(modelKey, newValue);
        }
    }
    {
        const mappingKeys = {
            name: 'displayName'
        };
        for (const modelKey of Object.keys(mappingKeys)) {
            const optionKey = mappingKeys[modelKey];
            const newValue = userUpdater({ fieldName: optionKey, currentValue: user.Account[modelKey], newValue: userOptions[optionKey] });
            user.Account.set(modelKey, newValue);
        }
    }
    logger.debug('Updated user %s with plugin userUpdated function.', user.email, { user, userOptions });
    user.Account = await user.Account.save();
    return user.save();
}
function checkUserValidityOrThrow(user) {
    if (user.blocked)
        throw new AccessDeniedError('User is blocked.');
}
function buildExpiresIn(expiresAt) {
    return Math.floor((expiresAt.getTime() - new Date().getTime()) / 1000);
}
//# sourceMappingURL=oauth-model.js.map