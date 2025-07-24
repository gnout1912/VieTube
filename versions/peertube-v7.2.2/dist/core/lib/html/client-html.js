import { HttpStatusCode } from '@peertube/peertube-models';
import { logger } from '../../helpers/logger.js';
import { ACCEPT_HEADERS } from '../../initializers/constants.js';
import { VideoHtml } from './shared/video-html.js';
import { PlaylistHtml } from './shared/playlist-html.js';
import { ActorHtml } from './shared/actor-html.js';
import { PageHtml } from './shared/page-html.js';
class ClientHtml {
    static invalidateCache() {
        PageHtml.invalidateCache();
    }
    static getDefaultHTMLPage(req, res, paramLang) {
        return PageHtml.getDefaultHTML(req, res, paramLang);
    }
    static getWatchHTMLPage(videoId, req, res) {
        return VideoHtml.getWatchVideoHTML(videoId, req, res);
    }
    static getVideoEmbedHTML(videoId) {
        return VideoHtml.getEmbedVideoHTML(videoId);
    }
    static getWatchPlaylistHTMLPage(videoPlaylistId, req, res) {
        return PlaylistHtml.getWatchPlaylistHTML(videoPlaylistId, req, res);
    }
    static getVideoPlaylistEmbedHTML(playlistId) {
        return PlaylistHtml.getEmbedPlaylistHTML(playlistId);
    }
    static getAccountHTMLPage(handle, req, res) {
        return ActorHtml.getAccountHTMLPage(handle, req, res);
    }
    static getVideoChannelHTMLPage(handle, req, res) {
        return ActorHtml.getVideoChannelHTMLPage(handle, req, res);
    }
    static getActorHTMLPage(handle, req, res) {
        return ActorHtml.getActorHTMLPage(handle, req, res);
    }
}
function sendHTML(html, res, localizedHTML = false) {
    res.set('Content-Type', 'text/html; charset=UTF-8');
    res.set('Cache-Control', 'max-age=0, no-cache, must-revalidate');
    if (localizedHTML) {
        res.set('Vary', 'Accept-Language');
    }
    return res.send(html);
}
async function serveIndexHTML(req, res) {
    if (req.accepts(ACCEPT_HEADERS) === 'html' || !req.headers.accept) {
        try {
            await generateHTMLPage(req, res, req.params.language);
            return;
        }
        catch (err) {
            logger.error('Cannot generate HTML page.', { err });
            return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR_500).end();
        }
    }
    return res.status(HttpStatusCode.NOT_ACCEPTABLE_406).end();
}
export { ClientHtml, sendHTML, serveIndexHTML };
async function generateHTMLPage(req, res, paramLang) {
    const html = await ClientHtml.getDefaultHTMLPage(req, res, paramLang);
    return sendHTML(html, res, true);
}
//# sourceMappingURL=client-html.js.map