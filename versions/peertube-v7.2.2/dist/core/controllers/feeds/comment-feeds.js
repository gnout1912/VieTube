import { toSafeHtml } from '../../helpers/markdown.js';
import { cacheRouteFactory } from '../../middlewares/index.js';
import express from 'express';
import { CONFIG } from '../../initializers/config.js';
import { ROUTE_CACHE_LIFETIME, WEBSERVER } from '../../initializers/constants.js';
import { asyncMiddleware, feedsAccountOrChannelFiltersValidator, feedsFormatValidator, setFeedFormatContentType, videoCommentsFeedsValidator } from '../../middlewares/index.js';
import { VideoCommentModel } from '../../models/video/video-comment.js';
import { buildFeedMetadata, initFeed, sendFeed } from './shared/index.js';
const commentFeedsRouter = express.Router();
const { middleware: cacheRouteMiddleware } = cacheRouteFactory({
    headerBlacklist: ['Content-Type']
});
commentFeedsRouter.get('/video-comments.:format', feedsFormatValidator, setFeedFormatContentType, cacheRouteMiddleware(ROUTE_CACHE_LIFETIME.FEEDS), asyncMiddleware(feedsAccountOrChannelFiltersValidator), asyncMiddleware(videoCommentsFeedsValidator), asyncMiddleware(generateVideoCommentsFeed));
export { commentFeedsRouter };
async function generateVideoCommentsFeed(req, res) {
    const start = 0;
    const video = res.locals.videoAll;
    const account = res.locals.account;
    const videoChannel = res.locals.videoChannel;
    const comments = await VideoCommentModel.listForFeed({
        start,
        count: CONFIG.FEEDS.COMMENTS.COUNT,
        videoId: video === null || video === void 0 ? void 0 : video.id,
        videoAccountOwnerId: account === null || account === void 0 ? void 0 : account.id,
        videoChannelOwnerId: videoChannel === null || videoChannel === void 0 ? void 0 : videoChannel.id
    });
    const { name, description, imageUrl, link } = await buildFeedMetadata({ video, account, videoChannel });
    const feed = initFeed({
        name,
        description,
        imageUrl,
        isPodcast: false,
        link,
        resourceType: 'video-comments',
        queryString: new URL(WEBSERVER.URL + req.originalUrl).search
    });
    for (const comment of comments) {
        const localLink = WEBSERVER.URL + comment.getCommentStaticPath();
        let title = comment.Video.name;
        const author = [];
        if (comment.Account) {
            title += ` - ${comment.Account.getDisplayName()}`;
            author.push({
                name: comment.Account.getDisplayName(),
                link: comment.Account.Actor.url
            });
        }
        feed.addItem({
            title,
            id: localLink,
            link: localLink,
            content: toSafeHtml(comment.text),
            author,
            date: comment.createdAt
        });
    }
    return sendFeed(feed, req, res);
}
//# sourceMappingURL=comment-feeds.js.map