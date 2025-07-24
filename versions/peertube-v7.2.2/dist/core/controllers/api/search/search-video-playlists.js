import express from 'express';
import { sanitizeUrl } from '../../../helpers/core-utils.js';
import { isUserAbleToSearchRemoteURI } from '../../../helpers/express-utils.js';
import { logger } from '../../../helpers/logger.js';
import { pickSearchPlaylistQuery } from '../../../helpers/query.js';
import { doJSONRequest } from '../../../helpers/requests.js';
import { getFormattedObjects } from '../../../helpers/utils.js';
import { CONFIG } from '../../../initializers/config.js';
import { WEBSERVER } from '../../../initializers/constants.js';
import { findLatestAPRedirection } from '../../../lib/activitypub/activity.js';
import { getOrCreateAPVideoPlaylist } from '../../../lib/activitypub/playlists/get.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { buildMutedForSearchIndex, isSearchIndexSearch, isURISearch } from '../../../lib/search.js';
import { getServerActor } from '../../../models/application/application.js';
import { VideoPlaylistModel } from '../../../models/video/video-playlist.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { asyncMiddleware, openapiOperationDoc, optionalAuthenticate, paginationValidator, setDefaultPagination, setDefaultSearchSort, videoPlaylistsListSearchValidator, videoPlaylistsSearchSortValidator } from '../../../middlewares/index.js';
import { searchLocalUrl } from './shared/index.js';
const searchPlaylistsRouter = express.Router();
searchPlaylistsRouter.get('/video-playlists', openapiOperationDoc({ operationId: 'searchPlaylists' }), paginationValidator, setDefaultPagination, videoPlaylistsSearchSortValidator, setDefaultSearchSort, optionalAuthenticate, videoPlaylistsListSearchValidator, asyncMiddleware(searchVideoPlaylists));
export { searchPlaylistsRouter };
function searchVideoPlaylists(req, res) {
    const query = pickSearchPlaylistQuery(req.query);
    const search = query.search;
    if (isURISearch(search))
        return searchVideoPlaylistsURI(search, res);
    if (isSearchIndexSearch(query)) {
        return searchVideoPlaylistsIndex(query, res);
    }
    return searchVideoPlaylistsDB(query, res);
}
async function searchVideoPlaylistsIndex(query, res) {
    const result = await buildMutedForSearchIndex(res);
    const body = await Hooks.wrapObject(Object.assign(query, result), 'filter:api.search.video-playlists.index.list.params');
    const url = sanitizeUrl(CONFIG.SEARCH.SEARCH_INDEX.URL) + '/api/v1/search/video-playlists';
    try {
        logger.debug('Doing video playlists search index request on %s.', url, { body });
        const searchIndexResult = await doJSONRequest(url, { method: 'POST', json: body, preventSSRF: false });
        const jsonResult = await Hooks.wrapObject(searchIndexResult.body, 'filter:api.search.video-playlists.index.list.result');
        return res.json(jsonResult);
    }
    catch (err) {
        logger.warn('Cannot use search index to make video playlists search.', { err });
        return res.fail({
            status: HttpStatusCode.INTERNAL_SERVER_ERROR_500,
            message: 'Cannot use search index to make video playlists search'
        });
    }
}
async function searchVideoPlaylistsDB(query, res) {
    const serverActor = await getServerActor();
    const apiOptions = await Hooks.wrapObject(Object.assign(Object.assign({}, query), { followerActorId: serverActor.id }), 'filter:api.search.video-playlists.local.list.params');
    const resultList = await Hooks.wrapPromiseFun(VideoPlaylistModel.searchForApi.bind(VideoPlaylistModel), apiOptions, 'filter:api.search.video-playlists.local.list.result');
    return res.json(getFormattedObjects(resultList.data, resultList.total));
}
async function searchVideoPlaylistsURI(search, res) {
    let videoPlaylist;
    if (isUserAbleToSearchRemoteURI(res)) {
        try {
            const url = await findLatestAPRedirection(search);
            videoPlaylist = await getOrCreateAPVideoPlaylist(url);
        }
        catch (err) {
            logger.info('Cannot search remote video playlist %s.', search, { err });
        }
    }
    else {
        videoPlaylist = await searchLocalUrl(sanitizeLocalUrl(search), url => VideoPlaylistModel.loadByUrlWithAccountAndChannelSummary(url));
    }
    return res.json({
        total: videoPlaylist ? 1 : 0,
        data: videoPlaylist ? [videoPlaylist.toFormattedJSON()] : []
    });
}
function sanitizeLocalUrl(url) {
    if (!url)
        return '';
    return url.replace(new RegExp('^' + WEBSERVER.URL + '/videos/watch/playlist/'), WEBSERVER.URL + '/video-playlists/')
        .replace(new RegExp('^' + WEBSERVER.URL + '/w/p/'), WEBSERVER.URL + '/video-playlists/');
}
//# sourceMappingURL=search-video-playlists.js.map