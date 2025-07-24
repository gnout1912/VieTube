import { doJSONRequest } from '../../helpers/requests.js';
import { CONFIG } from '../../initializers/config.js';
import { buildSignedRequestOptions } from './send/index.js';
export function getAPId(object) {
    if (typeof object === 'string')
        return object;
    return object.id;
}
export function getActivityStreamDuration(duration) {
    return 'PT' + duration + 'S';
}
export function getDurationFromActivityStream(duration) {
    return parseInt(duration.replace(/[^\d]+/, ''));
}
export function buildAvailableActivities() {
    return [
        'Create',
        'Update',
        'Delete',
        'Follow',
        'Accept',
        'Announce',
        'Undo',
        'Like',
        'Reject',
        'View',
        'Dislike',
        'Flag'
    ];
}
export async function fetchAP(url, moreOptions = {}) {
    const options = Object.assign({ activityPub: true, httpSignature: CONFIG.FEDERATION.SIGN_FEDERATED_FETCHES
            ? await buildSignedRequestOptions({ hasPayload: false })
            : undefined }, moreOptions);
    return doJSONRequest(url, options);
}
export async function fetchAPObjectIfNeeded(object) {
    if (typeof object === 'string') {
        const { body } = await fetchAP(object);
        return body;
    }
    return object;
}
export async function findLatestAPRedirection(url, iteration = 1) {
    if (iteration > 10)
        throw new Error('Too much iterations to find final URL ' + url);
    const { headers } = await fetchAP(url, { followRedirect: false });
    if (headers.location)
        return findLatestAPRedirection(headers.location, iteration + 1);
    return url;
}
//# sourceMappingURL=activity.js.map