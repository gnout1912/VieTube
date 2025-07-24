import Bluebird from 'bluebird';
import { logger } from '../../../helpers/logger.js';
import { doRequest } from '../../../helpers/requests.js';
import { BROADCAST_CONCURRENCY } from '../../../initializers/constants.js';
async function httpBroadcast(payload) {
    const { uris, requestOptions } = payload;
    const badUrls = [];
    const goodUrls = [];
    await Bluebird.map(uris, async (uri) => {
        try {
            await doRequest(uri, requestOptions);
            goodUrls.push(uri);
        }
        catch (err) {
            logger.debug('HTTP broadcast to %s failed.', uri, { err });
            badUrls.push(uri);
        }
    }, { concurrency: BROADCAST_CONCURRENCY });
    return { goodUrls, badUrls };
}
export default httpBroadcast;
//# sourceMappingURL=http-broadcast.js.map