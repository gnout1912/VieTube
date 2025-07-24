import { URL } from 'url';
import { retryTransactionWrapper } from '../../helpers/database-utils.js';
import { logger } from '../../helpers/logger.js';
import { ACTIVITY_PUB, WEBSERVER } from '../../initializers/constants.js';
import { fetchAP } from './activity.js';
export async function crawlCollectionPage(argUrl, handler, cleaner) {
    let url = argUrl;
    logger.info('Crawling ActivityPub data on %s.', url);
    const startDate = new Date();
    const response = await fetchAP(url);
    const firstBody = response.body;
    const limit = ACTIVITY_PUB.FETCH_PAGE_LIMIT;
    let i = 0;
    let nextLink = firstBody.first;
    while (nextLink && i < limit) {
        i++;
        let body;
        if (typeof nextLink === 'string') {
            const remoteHost = new URL(nextLink).host;
            if (remoteHost === WEBSERVER.HOST)
                continue;
            url = nextLink;
            const res = await fetchAP(url);
            body = res.body;
        }
        else {
            body = nextLink;
        }
        nextLink = body.next;
        if (Array.isArray(body.orderedItems)) {
            const items = body.orderedItems;
            logger.info('Processing %i ActivityPub items for %s.', items.length, url);
            await handler(items);
        }
    }
    if (cleaner)
        await retryTransactionWrapper(cleaner, startDate);
}
//# sourceMappingURL=crawl.js.map