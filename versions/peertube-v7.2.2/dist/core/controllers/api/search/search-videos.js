import { HttpStatusCode } from '@peertube/peertube-models';
import { sanitizeUrl } from '../../../helpers/core-utils.js';
import { pickSearchVideoQuery } from '../../../helpers/query.js';
import { doJSONRequest } from '../../../helpers/requests.js';
import { CONFIG } from '../../../initializers/config.js';
import { WEBSERVER } from '../../../initializers/constants.js';
import { findLatestAPRedirection } from '../../../lib/activitypub/activity.js';
import { getOrCreateAPVideo } from '../../../lib/activitypub/videos/index.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { buildMutedForSearchIndex, isSearchIndexSearch, isURISearch } from '../../../lib/search.js';
import { getServerActor } from '../../../models/application/application.js';
import express from 'express';
import { buildNSFWFilters, getCountVideos, isUserAbleToSearchRemoteURI } from '../../../helpers/express-utils.js';
import { logger } from '../../../helpers/logger.js';
import { getFormattedObjects } from '../../../helpers/utils.js';
import { asyncMiddleware, commonVideosFiltersValidator, openapiOperationDoc, optionalAuthenticate, paginationValidator, setDefaultPagination, setDefaultSearchSort, videosSearchSortValidator, videosSearchValidator } from '../../../middlewares/index.js';
import { guessAdditionalAttributesFromQuery } from '../../../models/video/formatter/index.js';
import { VideoModel } from '../../../models/video/video.js';
import { searchLocalUrl } from './shared/index.js';
const searchVideosRouter = express.Router();
searchVideosRouter.get('/videos', openapiOperationDoc({ operationId: 'searchVideos' }), paginationValidator, setDefaultPagination, videosSearchSortValidator, setDefaultSearchSort, optionalAuthenticate, commonVideosFiltersValidator, videosSearchValidator, asyncMiddleware(searchVideos));
export { searchVideosRouter };
function searchVideos(req, res) {
    const query = pickSearchVideoQuery(req.query);
    const search = query.search;
    if (isURISearch(search)) {
        return searchVideoURI(search, res);
    }
    if (isSearchIndexSearch(query)) {
        return searchVideosIndex(query, res);
    }
    return searchVideosDB(query, req, res);
}
async function searchVideosIndex(query, res) {
    const result = await buildMutedForSearchIndex(res);
    let body = Object.assign(Object.assign({}, query), result);
    if (!body.nsfw) {
        const nsfwPolicy = res.locals.oauth
            ? res.locals.oauth.token.User.nsfwPolicy
            : CONFIG.INSTANCE.DEFAULT_NSFW_POLICY;
        body.nsfw = nsfwPolicy === 'do_not_list'
            ? 'false'
            : 'both';
    }
    body = await Hooks.wrapObject(body, 'filter:api.search.videos.index.list.params');
    const url = sanitizeUrl(CONFIG.SEARCH.SEARCH_INDEX.URL) + '/api/v1/search/videos';
    try {
        logger.debug('Doing videos search index request on %s.', url, { body });
        const searchIndexResult = await doJSONRequest(url, { method: 'POST', json: body, preventSSRF: false });
        const jsonResult = await Hooks.wrapObject(searchIndexResult.body, 'filter:api.search.videos.index.list.result');
        return res.json(jsonResult);
    }
    catch (err) {
        logger.warn('Cannot use search index to make video search.', { err });
        return res.fail({
            status: HttpStatusCode.INTERNAL_SERVER_ERROR_500,
            message: 'Cannot use search index to make video search'
        });
    }
}
async function searchVideosDB(query, req, res) {
    const serverActor = await getServerActor();
    const apiOptions = await Hooks.wrapObject(Object.assign(Object.assign(Object.assign({}, query), buildNSFWFilters({ req, res })), { displayOnlyForFollower: {
            actorId: serverActor.id,
            orLocalVideos: true
        }, countVideos: getCountVideos(req), user: res.locals.oauth
            ? res.locals.oauth.token.User
            : undefined }), 'filter:api.search.videos.local.list.params', { req, res });
    const resultList = await Hooks.wrapPromiseFun(VideoModel.searchAndPopulateAccountAndServer.bind(VideoModel), apiOptions, 'filter:api.search.videos.local.list.result');
    return res.json(getFormattedObjects(resultList.data, resultList.total, guessAdditionalAttributesFromQuery(query)));
}
async function searchVideoURI(url, res) {
    let video;
    if (isUserAbleToSearchRemoteURI(res)) {
        try {
            const syncParam = {
                rates: false,
                shares: false,
                comments: false,
                refreshVideo: false
            };
            const result = await getOrCreateAPVideo({
                videoObject: await findLatestAPRedirection(url),
                syncParam
            });
            video = result ? result.video : undefined;
        }
        catch (err) {
            logger.info('Cannot search remote video %s.', url, { err });
        }
    }
    else {
        video = await searchLocalUrl(sanitizeLocalUrl(url), url => VideoModel.loadByUrlAndPopulateAccountAndFiles(url));
    }
    return res.json({
        total: video ? 1 : 0,
        data: video ? [video.toFormattedJSON()] : []
    });
}
function sanitizeLocalUrl(url) {
    if (!url)
        return '';
    return url.replace(new RegExp('^' + WEBSERVER.URL + '/w/'), WEBSERVER.URL + '/videos/watch/');
}
//# sourceMappingURL=search-videos.js.map