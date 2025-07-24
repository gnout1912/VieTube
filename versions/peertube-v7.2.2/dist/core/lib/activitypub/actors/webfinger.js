import WebFinger from 'webfinger.js';
import { isProdInstance } from '@peertube/peertube-node-utils';
import { isActivityPubUrlValid } from '../../../helpers/custom-validators/activitypub/misc.js';
import { REQUEST_TIMEOUTS, WEBSERVER } from '../../../initializers/constants.js';
import { ActorModel } from '../../../models/actor/actor.js';
const webfinger = new WebFinger({
    webfist_fallback: false,
    tls_only: isProdInstance(),
    uri_fallback: false,
    request_timeout: REQUEST_TIMEOUTS.DEFAULT
});
async function loadActorUrlOrGetFromWebfinger(uriArg) {
    const uri = uriArg.startsWith('@') ? uriArg.slice(1) : uriArg;
    const [name, host] = uri.split('@');
    let actor;
    if (!host || host === WEBSERVER.HOST) {
        actor = await ActorModel.loadLocalByName(name);
    }
    else {
        actor = await ActorModel.loadByNameAndHost(name, host);
    }
    if (actor)
        return actor.url;
    return getUrlFromWebfinger(uri);
}
async function getUrlFromWebfinger(uri) {
    const webfingerData = await webfingerLookup(uri);
    return getLinkOrThrow(webfingerData);
}
export { getUrlFromWebfinger, loadActorUrlOrGetFromWebfinger };
function getLinkOrThrow(webfingerData) {
    if (Array.isArray(webfingerData.links) === false)
        throw new Error('WebFinger links is not an array.');
    const selfLink = webfingerData.links.find(l => l.rel === 'self');
    if (selfLink === undefined || isActivityPubUrlValid(selfLink.href) === false) {
        throw new Error('Cannot find self link or href is not a valid URL.');
    }
    return selfLink.href;
}
function webfingerLookup(handle) {
    return new Promise((res, rej) => {
        webfinger.lookup(handle, (err, p) => {
            if (err)
                return rej(err);
            return res(p.object);
        });
    });
}
//# sourceMappingURL=webfinger.js.map