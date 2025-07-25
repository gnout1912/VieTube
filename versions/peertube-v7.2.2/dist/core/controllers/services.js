import express from 'express';
import cors from 'cors';
import { escapeHTML, forceNumber } from '@peertube/peertube-core-utils';
import { EMBED_SIZE, PREVIEWS_SIZE, THUMBNAILS_SIZE, WEBSERVER } from '../initializers/constants.js';
import { apiRateLimiter, asyncMiddleware, oembedValidator } from '../middlewares/index.js';
import { accountHandleGetValidatorFactory } from '../middlewares/validators/index.js';
const servicesRouter = express.Router();
servicesRouter.use('/oembed', cors(), apiRateLimiter, asyncMiddleware(oembedValidator), generateOEmbed);
servicesRouter.use('/redirect/accounts/:handle', apiRateLimiter, asyncMiddleware(accountHandleGetValidatorFactory({ checkIsLocal: false, checkManage: false })), redirectToAccountUrl);
export { servicesRouter };
function generateOEmbed(req, res) {
    if (res.locals.videoAll)
        return generateVideoOEmbed(req, res);
    return generatePlaylistOEmbed(req, res);
}
function generatePlaylistOEmbed(req, res) {
    const playlist = res.locals.videoPlaylistSummary;
    const json = buildOEmbed({
        channel: playlist.VideoChannel,
        title: playlist.name,
        embedPath: playlist.getEmbedStaticPath() + buildPlayerURLQuery(req.query.url),
        previewPath: playlist.getThumbnailStaticPath(),
        previewSize: THUMBNAILS_SIZE,
        req
    });
    return res.json(json);
}
function generateVideoOEmbed(req, res) {
    const video = res.locals.videoAll;
    const json = buildOEmbed({
        channel: video.VideoChannel,
        title: video.name,
        embedPath: video.getEmbedStaticPath() + buildPlayerURLQuery(req.query.url),
        previewPath: video.getPreviewStaticPath(),
        previewSize: PREVIEWS_SIZE,
        req
    });
    return res.json(json);
}
function buildPlayerURLQuery(inputQueryUrl) {
    const allowedParameters = new Set([
        'start',
        'stop',
        'loop',
        'autoplay',
        'muted',
        'controls',
        'controlBar',
        'title',
        'api',
        'warningTitle',
        'peertubeLink',
        'p2p',
        'subtitle',
        'bigPlayBackgroundColor',
        'mode',
        'foregroundColor',
        'playbackRate',
        'api',
        'waitPasswordFromEmbedAPI',
        'playlistPosition'
    ]);
    const params = new URLSearchParams();
    new URL(inputQueryUrl).searchParams.forEach((v, k) => {
        if (allowedParameters.has(k)) {
            params.append(k, v);
        }
    });
    const stringQuery = params.toString();
    if (!stringQuery)
        return '';
    return '?' + stringQuery;
}
function buildOEmbed(options) {
    const { req, previewSize, previewPath, title, channel, embedPath } = options;
    const webserverUrl = WEBSERVER.URL;
    const maxHeight = forceNumber(req.query.maxheight);
    const maxWidth = forceNumber(req.query.maxwidth);
    const embedUrl = webserverUrl + embedPath;
    const embedTitle = escapeHTML(title);
    let thumbnailUrl = previewPath
        ? webserverUrl + previewPath
        : undefined;
    let embedWidth = EMBED_SIZE.width;
    if (maxWidth < embedWidth)
        embedWidth = maxWidth;
    let embedHeight = EMBED_SIZE.height;
    if (maxHeight < embedHeight)
        embedHeight = maxHeight;
    if ((maxHeight !== undefined && maxHeight < previewSize.height) ||
        (maxWidth !== undefined && maxWidth < previewSize.width)) {
        thumbnailUrl = undefined;
    }
    const html = `<iframe width="${embedWidth}" height="${embedHeight}" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" ` +
        `title="${embedTitle}" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
    const json = {
        type: 'video',
        version: '1.0',
        html,
        width: embedWidth,
        height: embedHeight,
        title,
        author_name: channel.name,
        author_url: channel.Actor.url,
        provider_name: 'PeerTube',
        provider_url: webserverUrl
    };
    if (thumbnailUrl !== undefined) {
        json.thumbnail_url = thumbnailUrl;
        json.thumbnail_width = previewSize.width;
        json.thumbnail_height = previewSize.height;
    }
    return json;
}
function redirectToAccountUrl(req, res, next) {
    return res.redirect(res.locals.account.Actor.url);
}
//# sourceMappingURL=services.js.map