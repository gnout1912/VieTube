import { buildFileLocale, escapeHTML, getDefaultLocale, getDefaultRSSFeeds, is18nLocale, POSSIBLE_LOCALES } from '@peertube/peertube-core-utils';
import { ActorImageType } from '@peertube/peertube-models';
import { isTestOrDevInstance, root, sha256 } from '@peertube/peertube-node-utils';
import { CONFIG } from '../../../initializers/config.js';
import { ActorImageModel } from '../../../models/actor/actor-image.js';
import { getServerActor } from '../../../models/application/application.js';
import { pathExists } from 'fs-extra/esm';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../../../helpers/logger.js';
import { CUSTOM_HTML_TAG_COMMENTS, FILES_CONTENT_HASH, PLUGIN_GLOBAL_CSS_PATH, WEBSERVER } from '../../../initializers/constants.js';
import { ServerConfigManager } from '../../server-config-manager.js';
import { TagsHtml } from './tags-html.js';
export class PageHtml {
    static invalidateCache() {
        logger.info('Cleaning HTML cache.');
        this.htmlCache = {};
    }
    static async getDefaultHTML(req, res, paramLang) {
        const html = await this.getIndexHTML(req, res, paramLang);
        const serverActor = await getServerActor();
        const avatar = serverActor.getMaxQualityImage(ActorImageType.AVATAR);
        let customHTML = TagsHtml.addTitleTag(html);
        customHTML = TagsHtml.addDescriptionTag(customHTML);
        const url = req.originalUrl === '/'
            ? WEBSERVER.URL
            : WEBSERVER.URL + req.originalUrl;
        customHTML = await TagsHtml.addTags(customHTML, {
            url,
            escapedSiteName: escapeHTML(CONFIG.INSTANCE.NAME),
            escapedTitle: escapeHTML(CONFIG.INSTANCE.NAME),
            escapedTruncatedDescription: escapeHTML(CONFIG.INSTANCE.SHORT_DESCRIPTION),
            relMe: url === WEBSERVER.URL
                ? TagsHtml.findRelMe(CONFIG.INSTANCE.DESCRIPTION)
                : undefined,
            image: avatar
                ? { url: ActorImageModel.getImageUrl(avatar), width: avatar.width, height: avatar.height }
                : undefined,
            ogType: 'website',
            twitterCard: 'summary_large_image',
            forbidIndexation: false,
            embedIndexation: false,
            rssFeeds: getDefaultRSSFeeds(WEBSERVER.URL, CONFIG.INSTANCE.NAME)
        }, {});
        return customHTML;
    }
    static async getEmbedHTML() {
        const path = this.getEmbedHTMLPath();
        if (!isTestOrDevInstance() && this.htmlCache[path]) {
            return this.htmlCache[path];
        }
        const buffer = await readFile(path);
        const serverConfig = await ServerConfigManager.Instance.getHTMLServerConfig();
        let html = buffer.toString();
        html = await this.addAsyncPluginCSS(html);
        html = this.addCustomCSS(html);
        html = this.addServerConfig(html, serverConfig);
        this.htmlCache[path] = html;
        return html;
    }
    static async getIndexHTML(req, res, paramLang) {
        const path = this.getIndexHTMLPath(req, res, paramLang);
        if (this.htmlCache[path])
            return this.htmlCache[path];
        const buffer = await readFile(path);
        const serverConfig = await ServerConfigManager.Instance.getHTMLServerConfig();
        let html = buffer.toString();
        html = this.addManifestContentHash(html);
        html = this.addFaviconContentHash(html);
        html = this.addLogoContentHash(html);
        html = this.addCustomCSS(html);
        html = this.addServerConfig(html, serverConfig);
        html = await this.addAsyncPluginCSS(html);
        this.htmlCache[path] = html;
        return html;
    }
    static getEmbedHTMLPath() {
        return join(root(), 'client', 'dist', 'standalone', 'videos', 'embed.html');
    }
    static getIndexHTMLPath(req, res, paramLang) {
        var _a;
        let lang;
        if (paramLang && is18nLocale(paramLang)) {
            lang = paramLang;
            res.cookie('clientLanguage', lang, {
                secure: true,
                sameSite: 'none',
                maxAge: 1000 * 3600 * 24 * 90
            });
        }
        else if (req.cookies.clientLanguage && is18nLocale(req.cookies.clientLanguage)) {
            lang = req.cookies.clientLanguage;
        }
        else {
            lang = req.acceptsLanguages(POSSIBLE_LOCALES) || getDefaultLocale();
        }
        logger.debug('Serving %s HTML language', buildFileLocale(lang), { cookie: (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.clientLanguage, paramLang, acceptLanguage: req.headers['accept-language'] });
        return join(root(), 'client', 'dist', buildFileLocale(lang), 'index.html');
    }
    static addCustomCSS(htmlStringPage) {
        const styleTag = `<style class="custom-css-style">${CONFIG.INSTANCE.CUSTOMIZATIONS.CSS}</style>`;
        return htmlStringPage.replace(CUSTOM_HTML_TAG_COMMENTS.CUSTOM_CSS, styleTag);
    }
    static addServerConfig(htmlStringPage, serverConfig) {
        const serverConfigString = JSON.stringify(JSON.stringify(serverConfig));
        const configScriptTag = `<script type="application/javascript">window.PeerTubeServerConfig = ${serverConfigString}</script>`;
        return htmlStringPage.replace(CUSTOM_HTML_TAG_COMMENTS.SERVER_CONFIG, configScriptTag);
    }
    static async addAsyncPluginCSS(htmlStringPage) {
        if (!await pathExists(PLUGIN_GLOBAL_CSS_PATH)) {
            logger.info('Plugin Global CSS file is not available (generation may still be in progress), ignoring it.');
            return htmlStringPage;
        }
        let globalCSSContent;
        try {
            globalCSSContent = await readFile(PLUGIN_GLOBAL_CSS_PATH);
        }
        catch (err) {
            logger.error('Error retrieving the Plugin Global CSS file, ignoring it.', { err });
            return htmlStringPage;
        }
        if (globalCSSContent.byteLength === 0)
            return htmlStringPage;
        const fileHash = sha256(globalCSSContent);
        const linkTag = `<link rel="stylesheet" href="/plugins/global.css?hash=${fileHash}" />`;
        return htmlStringPage.replace('</head>', linkTag + '</head>');
    }
    static addManifestContentHash(htmlStringPage) {
        return htmlStringPage.replace('[manifestContentHash]', FILES_CONTENT_HASH.MANIFEST);
    }
    static addFaviconContentHash(htmlStringPage) {
        return htmlStringPage.replace('[faviconContentHash]', FILES_CONTENT_HASH.FAVICON);
    }
    static addLogoContentHash(htmlStringPage) {
        return htmlStringPage.replace('[logoContentHash]', FILES_CONTENT_HASH.LOGO);
    }
}
PageHtml.htmlCache = {};
//# sourceMappingURL=page-html.js.map