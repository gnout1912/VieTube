import { pick } from '@peertube/peertube-core-utils';
function pickCommonVideoQuery(query) {
    return pick(query, [
        'start',
        'count',
        'sort',
        'nsfw',
        'nsfwFlagsIncluded',
        'nsfwFlagsExcluded',
        'isLive',
        'categoryOneOf',
        'licenceOneOf',
        'languageOneOf',
        'host',
        'privacyOneOf',
        'tagsOneOf',
        'tagsAllOf',
        'isLocal',
        'include',
        'skipCount',
        'hasHLSFiles',
        'hasWebVideoFiles',
        'search',
        'excludeAlreadyWatched',
        'autoTagOneOf'
    ]);
}
function pickSearchVideoQuery(query) {
    return Object.assign(Object.assign({}, pickCommonVideoQuery(query)), pick(query, [
        'searchTarget',
        'host',
        'startDate',
        'endDate',
        'originallyPublishedStartDate',
        'originallyPublishedEndDate',
        'durationMin',
        'durationMax',
        'uuids'
    ]));
}
function pickSearchChannelQuery(query) {
    return pick(query, [
        'searchTarget',
        'search',
        'start',
        'count',
        'sort',
        'host',
        'handles'
    ]);
}
function pickSearchPlaylistQuery(query) {
    return pick(query, [
        'searchTarget',
        'search',
        'start',
        'count',
        'sort',
        'host',
        'uuids'
    ]);
}
export { pickCommonVideoQuery, pickSearchVideoQuery, pickSearchPlaylistQuery, pickSearchChannelQuery };
//# sourceMappingURL=query.js.map