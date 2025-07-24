import validator from 'validator';
import { CONFIG } from '../../initializers/config.js';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { exists, isArray } from './misc.js';
function isHostValid(host) {
    const isURLOptions = {
        require_host: true,
        require_tld: true
    };
    if (CONFIG.WEBSERVER.HOSTNAME === 'localhost' || CONFIG.WEBSERVER.HOSTNAME === '127.0.0.1') {
        isURLOptions.require_tld = false;
    }
    return exists(host) && validator.default.isURL(host, isURLOptions) && host.split('://').length === 1;
}
function isEachUniqueHostValid(hosts) {
    return isArray(hosts) &&
        hosts.every(host => {
            return isHostValid(host) && hosts.indexOf(host) === hosts.lastIndexOf(host);
        });
}
function isValidContactBody(value) {
    return exists(value) && validator.default.isLength(value, CONSTRAINTS_FIELDS.CONTACT_FORM.BODY);
}
function isValidContactFromName(value) {
    return exists(value) && validator.default.isLength(value, CONSTRAINTS_FIELDS.CONTACT_FORM.FROM_NAME);
}
export { isValidContactBody, isValidContactFromName, isEachUniqueHostValid, isHostValid };
//# sourceMappingURL=servers.js.map