import { CONFIG } from '../../../initializers/config.js';
import validator from 'validator';
import { CONSTRAINTS_FIELDS } from '../../../initializers/constants.js';
import { exists } from '../misc.js';
export function isUrlValid(url) {
    const isURLOptions = {
        require_host: true,
        require_tld: true,
        require_protocol: true,
        require_valid_protocol: true,
        protocols: ['http', 'https']
    };
    if (CONFIG.WEBSERVER.HOSTNAME === 'localhost' || CONFIG.WEBSERVER.HOSTNAME === '127.0.0.1') {
        isURLOptions.require_tld = false;
    }
    return exists(url) && validator.default.isURL('' + url, isURLOptions);
}
export function isActivityPubUrlValid(url) {
    return isUrlValid(url) && validator.default.isLength('' + url, CONSTRAINTS_FIELDS.ACTORS.URL);
}
export function isBaseActivityValid(activity, type) {
    return activity.type === type &&
        isActivityPubUrlValid(activity.id) &&
        isObjectValid(activity.actor) &&
        isUrlCollectionValid(activity.to) &&
        isUrlCollectionValid(activity.cc);
}
export function isUrlCollectionValid(collection) {
    return collection === undefined ||
        (typeof collection === 'string' && isActivityPubUrlValid(collection)) ||
        (Array.isArray(collection) && collection.every(t => isActivityPubUrlValid(t)));
}
export function isObjectValid(object) {
    return exists(object) &&
        (isActivityPubUrlValid(object) || isActivityPubUrlValid(object.id));
}
export function isActivityPubHTMLUrlValid(url) {
    return url &&
        url.type === 'Link' &&
        url.mediaType === 'text/html' &&
        isActivityPubUrlValid(url.href);
}
export function setValidAttributedTo(obj) {
    if (Array.isArray(obj.attributedTo) === false) {
        obj.attributedTo = [];
        return true;
    }
    obj.attributedTo = obj.attributedTo.filter(a => {
        return isActivityPubUrlValid(a) ||
            ((a.type === 'Group' || a.type === 'Person') && isActivityPubUrlValid(a.id));
    });
    return true;
}
export function isActivityPubVideoDurationValid(value) {
    return exists(value) &&
        typeof value === 'string' &&
        value.startsWith('PT') &&
        value.endsWith('S');
}
//# sourceMappingURL=misc.js.map