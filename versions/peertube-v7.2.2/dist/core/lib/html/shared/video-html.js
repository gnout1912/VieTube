import { __decorate, __metadata } from "tslib";
import { addQueryParams, escapeHTML, getVideoWatchRSSFeeds } from '@peertube/peertube-core-utils';
import { HttpStatusCode, VideoPrivacy } from '@peertube/peertube-models';
import { Memoize } from '../../../helpers/memoize.js';
import validator from 'validator';
import { CONFIG } from '../../../initializers/config.js';
import { MEMOIZE_TTL, WEBSERVER } from '../../../initializers/constants.js';
import { VideoModel } from '../../../models/video/video.js';
import { getActivityStreamDuration } from '../../activitypub/activity.js';
import { isVideoInPrivateDirectory } from '../../video-privacy.js';
import { buildEmptyEmbedHTML } from './common.js';
import { PageHtml } from './page-html.js';
import { TagsHtml } from './tags-html.js';
export class VideoHtml {
    static async getWatchVideoHTML(videoId, req, res) {
        if (!validator.default.isInt(videoId) && !validator.default.isUUID(videoId, 4)) {
            res.status(HttpStatusCode.NOT_FOUND_404);
            return PageHtml.getIndexHTML(req, res);
        }
        const [html, video] = await Promise.all([
            PageHtml.getIndexHTML(req, res),
            VideoModel.loadWithBlacklist(videoId)
        ]);
        if (!video || isVideoInPrivateDirectory(video.privacy) || video.VideoBlacklist) {
            res.status(HttpStatusCode.NOT_FOUND_404);
            return html;
        }
        return this.buildVideoHTML({
            html,
            video,
            currentQuery: req.query,
            addEmbedInfo: true,
            addOG: true,
            addTwitterCard: true,
            isEmbed: false
        });
    }
    static async getEmbedVideoHTML(videoId) {
        const videoPromise = validator.default.isInt(videoId) || validator.default.isUUID(videoId, 4)
            ? VideoModel.loadWithBlacklist(videoId)
            : Promise.resolve(undefined);
        const [html, video] = await Promise.all([PageHtml.getEmbedHTML(), videoPromise]);
        if (!video || isVideoInPrivateDirectory(video.privacy) || video.VideoBlacklist) {
            return buildEmptyEmbedHTML({ html, video });
        }
        return this.buildVideoHTML({
            html,
            video,
            addEmbedInfo: true,
            addOG: false,
            addTwitterCard: false,
            isEmbed: true,
            currentQuery: {}
        });
    }
    static buildVideoHTML(options) {
        const { html, video, addEmbedInfo, addOG, addTwitterCard, isEmbed, currentQuery = {} } = options;
        const escapedTruncatedDescription = TagsHtml.buildEscapedTruncatedDescription(video.description);
        let customHTML = TagsHtml.addTitleTag(html, video.name);
        customHTML = TagsHtml.addDescriptionTag(customHTML, escapedTruncatedDescription);
        const embed = addEmbedInfo
            ? {
                url: WEBSERVER.URL + video.getEmbedStaticPath(),
                createdAt: video.createdAt.toISOString(),
                duration: video.duration ? getActivityStreamDuration(video.duration) : undefined,
                views: video.views
            }
            : undefined;
        const ogType = addOG
            ? 'video'
            : undefined;
        const twitterCard = addTwitterCard
            ? 'player'
            : undefined;
        const schemaType = 'VideoObject';
        const preview = video.getPreview();
        return TagsHtml.addTags(customHTML, {
            url: WEBSERVER.URL + video.getWatchStaticPath(),
            escapedSiteName: escapeHTML(CONFIG.INSTANCE.NAME),
            escapedTitle: escapeHTML(video.name),
            escapedTruncatedDescription,
            forbidIndexation: isEmbed
                ? video.privacy !== VideoPrivacy.PUBLIC && video.privacy !== VideoPrivacy.UNLISTED
                : video.remote || video.privacy !== VideoPrivacy.PUBLIC,
            embedIndexation: isEmbed,
            image: preview
                ? { url: WEBSERVER.URL + video.getPreviewStaticPath(), width: preview.width, height: preview.height }
                : undefined,
            embed,
            oembedUrl: this.getOEmbedUrl(video, currentQuery),
            ogType,
            twitterCard,
            schemaType,
            rssFeeds: getVideoWatchRSSFeeds(WEBSERVER.URL, CONFIG.INSTANCE.NAME, video)
        }, { video });
    }
    static getOEmbedUrl(video, currentQuery) {
        const base = WEBSERVER.URL + video.getWatchStaticPath();
        const additionalQuery = {};
        const allowedParams = new Set(['start']);
        for (const [key, value] of Object.entries(currentQuery)) {
            if (allowedParams.has(key))
                additionalQuery[key] = value;
        }
        return addQueryParams(base, additionalQuery);
    }
}
__decorate([
    Memoize({ maxAge: MEMOIZE_TTL.EMBED_HTML }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideoHtml, "getEmbedVideoHTML", null);
//# sourceMappingURL=video-html.js.map