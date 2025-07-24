import { buildFileLocale, getCompleteLocale, is18nLocale, LOCALE_FILES } from '@peertube/peertube-core-utils';
import { HttpStatusCode } from '@peertube/peertube-models';
import { currentDir, root } from '@peertube/peertube-node-utils';
import { toCompleteUUID } from '../helpers/custom-validators/misc.js';
import { logger } from '../helpers/logger.js';
import { CONFIG } from '../initializers/config.js';
import { Hooks } from '../lib/plugins/hooks.js';
import express from 'express';
import { constants, promises as fs } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { STATIC_MAX_AGE } from '../initializers/constants.js';
import { ClientHtml, sendHTML, serveIndexHTML } from '../lib/html/client-html.js';
import { asyncMiddleware, buildRateLimiter, embedCSP } from '../middlewares/index.js';
const clientsRouter = express.Router();
const clientsRateLimiter = buildRateLimiter({
    windowMs: CONFIG.RATES_LIMIT.CLIENT.WINDOW_MS,
    max: CONFIG.RATES_LIMIT.CLIENT.MAX
});
const distPath = join(root(), 'client', 'dist');
const testEmbedPath = join(distPath, 'standalone', 'videos', 'test-embed.html');
clientsRouter.use(['/w/p/:id', '/videos/watch/playlist/:id'], clientsRateLimiter, asyncMiddleware(generateWatchPlaylistHtmlPage));
clientsRouter.use(['/w/:id', '/videos/watch/:id'], clientsRateLimiter, asyncMiddleware(generateWatchHtmlPage));
clientsRouter.use(['/accounts/:handle', '/a/:handle'], clientsRateLimiter, asyncMiddleware(generateAccountHtmlPage));
clientsRouter.use(['/video-channels/:handle', '/c/:handle'], clientsRateLimiter, asyncMiddleware(generateVideoChannelHtmlPage));
clientsRouter.use('/@:handle', clientsRateLimiter, asyncMiddleware(generateActorHtmlPage));
const embedMiddlewares = [
    clientsRateLimiter,
    CONFIG.CSP.ENABLED
        ? embedCSP
        : (req, res, next) => next(),
    (req, res, next) => {
        res.removeHeader('X-Frame-Options');
        res.setHeader('Cache-Control', 'public, max-age=0');
        next();
    }
];
clientsRouter.use('/videos/embed/:id', ...embedMiddlewares, asyncMiddleware(generateVideoEmbedHtmlPage));
clientsRouter.use('/video-playlists/embed/:id', ...embedMiddlewares, asyncMiddleware(generateVideoPlaylistEmbedHtmlPage));
const testEmbedController = (req, res) => res.sendFile(testEmbedPath);
clientsRouter.use('/videos/test-embed', clientsRateLimiter, testEmbedController);
clientsRouter.use('/video-playlists/test-embed', clientsRateLimiter, testEmbedController);
clientsRouter.get('/manifest.webmanifest', clientsRateLimiter, asyncMiddleware(generateManifest));
const staticClientOverrides = [
    'assets/images/logo.svg',
    'assets/images/favicon.png',
    'assets/images/icons/icon-36x36.png',
    'assets/images/icons/icon-48x48.png',
    'assets/images/icons/icon-72x72.png',
    'assets/images/icons/icon-96x96.png',
    'assets/images/icons/icon-144x144.png',
    'assets/images/icons/icon-192x192.png',
    'assets/images/icons/icon-512x512.png',
    'assets/images/default-playlist.jpg',
    'assets/images/default-avatar-account.png',
    'assets/images/default-avatar-account-48x48.png',
    'assets/images/default-avatar-video-channel.png',
    'assets/images/default-avatar-video-channel-48x48.png'
];
for (const staticClientOverride of staticClientOverrides) {
    const overridePhysicalPath = join(CONFIG.STORAGE.CLIENT_OVERRIDES_DIR, staticClientOverride);
    clientsRouter.use(`/client/${staticClientOverride}`, asyncMiddleware(serveClientOverride(overridePhysicalPath)));
}
clientsRouter.use('/client/locales/:locale/:file.json', serveServerTranslations);
clientsRouter.use('/client', express.static(distPath, { maxAge: STATIC_MAX_AGE.CLIENT }));
clientsRouter.use('/client/*', (req, res) => {
    res.status(HttpStatusCode.NOT_FOUND_404).end();
});
clientsRouter.use('/(:language)?', clientsRateLimiter, asyncMiddleware(serveIndexHTML));
export { clientsRouter };
function serveServerTranslations(req, res) {
    const locale = req.params.locale;
    const file = req.params.file;
    if (is18nLocale(locale) && LOCALE_FILES.includes(file)) {
        const completeLocale = getCompleteLocale(locale);
        const completeFileLocale = buildFileLocale(completeLocale);
        const path = join(currentDir(import.meta.url), `../../../client/dist/locale/${file}.${completeFileLocale}.json`);
        return res.sendFile(path, { maxAge: STATIC_MAX_AGE.SERVER });
    }
    return res.status(HttpStatusCode.NOT_FOUND_404).end();
}
async function generateVideoEmbedHtmlPage(req, res) {
    req.params.id = toCompleteUUID(req.params.id);
    const allowParameters = { req };
    const allowedResult = await Hooks.wrapFun(isEmbedAllowed, allowParameters, 'filter:html.embed.video.allowed.result');
    if (!allowedResult || allowedResult.allowed !== true) {
        logger.info('Embed is not allowed.', { allowedResult });
        return sendHTML((allowedResult === null || allowedResult === void 0 ? void 0 : allowedResult.html) || '', res);
    }
    const html = await ClientHtml.getVideoEmbedHTML(req.params.id);
    return sendHTML(html, res);
}
async function generateVideoPlaylistEmbedHtmlPage(req, res) {
    req.params.id = toCompleteUUID(req.params.id);
    const allowParameters = { req };
    const allowedResult = await Hooks.wrapFun(isEmbedAllowed, allowParameters, 'filter:html.embed.video-playlist.allowed.result');
    if (!allowedResult || allowedResult.allowed !== true) {
        logger.info('Embed is not allowed.', { allowedResult });
        return sendHTML((allowedResult === null || allowedResult === void 0 ? void 0 : allowedResult.html) || '', res);
    }
    const html = await ClientHtml.getVideoPlaylistEmbedHTML(req.params.id);
    return sendHTML(html, res);
}
async function generateWatchHtmlPage(req, res) {
    let videoId = req.params.id + '';
    const threadIdIndex = videoId.indexOf(';threadId');
    if (threadIdIndex !== -1)
        videoId = videoId.substring(0, threadIdIndex);
    videoId = toCompleteUUID(videoId);
    const html = await ClientHtml.getWatchHTMLPage(videoId, req, res);
    return sendHTML(html, res, true);
}
async function generateWatchPlaylistHtmlPage(req, res) {
    req.params.id = toCompleteUUID(req.params.id);
    const html = await ClientHtml.getWatchPlaylistHTMLPage(req.params.id + '', req, res);
    return sendHTML(html, res, true);
}
async function generateAccountHtmlPage(req, res) {
    const html = await ClientHtml.getAccountHTMLPage(req.params.handle, req, res);
    return sendHTML(html, res, true);
}
async function generateVideoChannelHtmlPage(req, res) {
    const html = await ClientHtml.getVideoChannelHTMLPage(req.params.handle, req, res);
    return sendHTML(html, res, true);
}
async function generateActorHtmlPage(req, res) {
    const html = await ClientHtml.getActorHTMLPage(req.params.handle, req, res);
    return sendHTML(html, res, true);
}
async function generateManifest(req, res) {
    const manifestPhysicalPath = join(root(), 'client', 'dist', 'manifest.webmanifest');
    const manifestJson = await readFile(manifestPhysicalPath, 'utf8');
    const manifest = JSON.parse(manifestJson);
    manifest.name = CONFIG.INSTANCE.NAME;
    manifest.short_name = CONFIG.INSTANCE.NAME;
    manifest.description = CONFIG.INSTANCE.SHORT_DESCRIPTION;
    res.json(manifest);
}
function serveClientOverride(path) {
    return async (req, res, next) => {
        try {
            await fs.access(path, constants.F_OK);
            res.sendFile(path, { maxAge: STATIC_MAX_AGE.SERVER });
        }
        catch (_a) {
            next();
        }
    };
}
function isEmbedAllowed(_object) {
    return { allowed: true };
}
//# sourceMappingURL=client.js.map