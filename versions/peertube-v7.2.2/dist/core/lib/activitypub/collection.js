import validator from 'validator';
import { pageToStartAndCount } from '../../helpers/core-utils.js';
import { ACTIVITY_PUB } from '../../initializers/constants.js';
import { forceNumber } from '@peertube/peertube-core-utils';
export async function activityPubCollectionPagination(baseUrl, handler, page, size = ACTIVITY_PUB.COLLECTION_ITEMS_PER_PAGE) {
    if (!page || !validator.default.isInt(page)) {
        const result = await handler(0, 1);
        return {
            id: baseUrl,
            type: 'OrderedCollection',
            totalItems: result.total,
            first: result.data.length === 0
                ? undefined
                : baseUrl + '?page=1'
        };
    }
    const { start, count } = pageToStartAndCount(page, size);
    const result = await handler(start, count);
    let next;
    let prev;
    page = forceNumber(page);
    if (result.total > page * size) {
        next = baseUrl + '?page=' + (page + 1);
    }
    if (page > 1) {
        prev = baseUrl + '?page=' + (page - 1);
    }
    return {
        id: baseUrl + '?page=' + page,
        type: 'OrderedCollectionPage',
        prev,
        next,
        partOf: baseUrl,
        orderedItems: result.data,
        totalItems: result.total
    };
}
export function activityPubCollection(baseUrl, items) {
    return {
        id: baseUrl,
        type: 'OrderedCollection',
        totalItems: items.length,
        orderedItems: items
    };
}
//# sourceMappingURL=collection.js.map