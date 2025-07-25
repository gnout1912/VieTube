import { REMOTE_SCHEME, WEBSERVER } from '../../initializers/constants.js';
import { sanitizeHost } from '../core-utils.js';
import { exists } from './misc.js';
function isWebfingerLocalResourceValid(value) {
    if (!exists(value))
        return false;
    if (value.startsWith('acct:') === false)
        return false;
    const actorWithHost = value.substring(5);
    const actorParts = actorWithHost.split('@');
    if (actorParts.length !== 2)
        return false;
    const host = actorParts[1];
    return sanitizeHost(host, REMOTE_SCHEME.HTTP) === WEBSERVER.HOST;
}
export { isWebfingerLocalResourceValid };
//# sourceMappingURL=webfinger.js.map