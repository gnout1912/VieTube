import { isUserAdminFlagsValid, isUserDisplayNameValid, isUserRoleValid, isUserUsernameValid, isUserVideoQuotaDailyValid, isUserVideoQuotaValid } from '../../helpers/custom-validators/users.js';
import { logger } from '../../helpers/logger.js';
import { generateRandomString } from '../../helpers/utils.js';
import { PLUGIN_EXTERNAL_AUTH_TOKEN_LIFETIME } from '../../initializers/constants.js';
import { PluginManager } from '../plugins/plugin-manager.js';
import { OAuthTokenModel } from '../../models/oauth/oauth-token.js';
import { UserAdminFlag, UserRole } from '@peertube/peertube-models';
const authBypassTokens = new Map();
async function onExternalUserAuthenticated(options) {
    const { npmName, authName, authResult } = options;
    if (!authResult.req || !authResult.res) {
        logger.error('Cannot authenticate external user for auth %s of plugin %s: no req or res are provided.', authName, npmName);
        return;
    }
    const { res } = authResult;
    if (!isAuthResultValid(npmName, authName, authResult)) {
        res.redirect('/login?externalAuthError=true');
        return;
    }
    logger.info('Generating auth bypass token for %s in auth %s of plugin %s.', authResult.username, authName, npmName);
    const bypassToken = await generateRandomString(32);
    const expires = new Date();
    expires.setTime(expires.getTime() + PLUGIN_EXTERNAL_AUTH_TOKEN_LIFETIME);
    const user = buildUserResult(authResult);
    authBypassTokens.set(bypassToken, {
        expires,
        user,
        npmName,
        authName,
        userUpdater: authResult.userUpdater
    });
    const now = new Date();
    for (const [key, value] of authBypassTokens) {
        if (value.expires.getTime() < now.getTime()) {
            authBypassTokens.delete(key);
        }
    }
    res.redirect(`/login?externalAuthToken=${bypassToken}&username=${user.username}`);
}
async function getAuthNameFromRefreshGrant(refreshToken) {
    if (!refreshToken)
        return undefined;
    const tokenModel = await OAuthTokenModel.loadByRefreshToken(refreshToken);
    return tokenModel === null || tokenModel === void 0 ? void 0 : tokenModel.authName;
}
async function getBypassFromPasswordGrant(username, password) {
    const plugins = PluginManager.Instance.getIdAndPassAuths();
    const pluginAuths = [];
    for (const plugin of plugins) {
        const auths = plugin.idAndPassAuths;
        for (const auth of auths) {
            pluginAuths.push({
                npmName: plugin.npmName,
                registerAuthOptions: auth
            });
        }
    }
    pluginAuths.sort((a, b) => {
        const aWeight = a.registerAuthOptions.getWeight();
        const bWeight = b.registerAuthOptions.getWeight();
        if (aWeight === bWeight)
            return 0;
        if (aWeight < bWeight)
            return 1;
        return -1;
    });
    const loginOptions = {
        id: username,
        password
    };
    for (const pluginAuth of pluginAuths) {
        const authOptions = pluginAuth.registerAuthOptions;
        const authName = authOptions.authName;
        const npmName = pluginAuth.npmName;
        logger.debug('Using auth method %s of plugin %s to login %s with weight %d.', authName, npmName, loginOptions.id, authOptions.getWeight());
        try {
            const loginResult = await authOptions.login(loginOptions);
            if (!loginResult)
                continue;
            if (!isAuthResultValid(pluginAuth.npmName, authOptions.authName, loginResult))
                continue;
            logger.info('Login success with auth method %s of plugin %s for %s.', authName, npmName, loginOptions.id);
            return {
                bypass: true,
                pluginName: pluginAuth.npmName,
                authName: authOptions.authName,
                user: buildUserResult(loginResult),
                userUpdater: loginResult.userUpdater
            };
        }
        catch (err) {
            logger.error('Error in auth method %s of plugin %s', authOptions.authName, pluginAuth.npmName, { err });
        }
    }
    return undefined;
}
function getBypassFromExternalAuth(username, externalAuthToken) {
    const obj = authBypassTokens.get(externalAuthToken);
    if (!obj)
        throw new Error('Cannot authenticate user with unknown bypass token');
    const { expires, user, authName, npmName } = obj;
    const now = new Date();
    if (now.getTime() > expires.getTime()) {
        throw new Error('Cannot authenticate user with an expired external auth token');
    }
    if (user.username !== username) {
        throw new Error(`Cannot authenticate user ${user.username} with invalid username ${username}`);
    }
    logger.info('Auth success with external auth method %s of plugin %s for %s.', authName, npmName, user.email);
    return {
        bypass: true,
        pluginName: npmName,
        authName,
        userUpdater: obj.userUpdater,
        user
    };
}
function isAuthResultValid(npmName, authName, result) {
    const returnError = (field) => {
        logger.error('Auth method %s of plugin %s did not provide a valid %s.', authName, npmName, field, { [field]: result[field] });
        return false;
    };
    if (!isUserUsernameValid(result.username))
        return returnError('username');
    if (!result.email)
        return returnError('email');
    if (result.role && !isUserRoleValid(result.role))
        return returnError('role');
    if (result.displayName && !isUserDisplayNameValid(result.displayName))
        return returnError('displayName');
    if (result.adminFlags && !isUserAdminFlagsValid(result.adminFlags))
        return returnError('adminFlags');
    if (result.videoQuota && !isUserVideoQuotaValid(result.videoQuota + ''))
        return returnError('videoQuota');
    if (result.videoQuotaDaily && !isUserVideoQuotaDailyValid(result.videoQuotaDaily + ''))
        return returnError('videoQuotaDaily');
    if (result.userUpdater && typeof result.userUpdater !== 'function') {
        logger.error('Auth method %s of plugin %s did not provide a valid user updater function.', authName, npmName);
        return false;
    }
    return true;
}
function buildUserResult(pluginResult) {
    var _a, _b;
    return {
        username: pluginResult.username,
        email: pluginResult.email,
        role: (_a = pluginResult.role) !== null && _a !== void 0 ? _a : UserRole.USER,
        displayName: pluginResult.displayName || pluginResult.username,
        adminFlags: (_b = pluginResult.adminFlags) !== null && _b !== void 0 ? _b : UserAdminFlag.NONE,
        videoQuota: pluginResult.videoQuota,
        videoQuotaDaily: pluginResult.videoQuotaDaily
    };
}
export { onExternalUserAuthenticated, getBypassFromExternalAuth, getAuthNameFromRefreshGrant, getBypassFromPasswordGrant };
//# sourceMappingURL=external-auth.js.map