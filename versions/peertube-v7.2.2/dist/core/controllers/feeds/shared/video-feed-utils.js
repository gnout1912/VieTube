import { getChannelPodcastFeed } from '@peertube/peertube-core-utils';
import { mdToPlainText, toSafeHtml } from '../../../helpers/markdown.js';
import { CONFIG } from '../../../initializers/config.js';
import { WEBSERVER } from '../../../initializers/constants.js';
import { getServerActor } from '../../../models/application/application.js';
import { getCategoryLabel } from '../../../models/video/formatter/index.js';
import { VideoModel } from '../../../models/video/video.js';
export async function getVideosForFeeds(options) {
    const server = await getServerActor();
    const { data } = await VideoModel.listForApi(Object.assign({ start: 0, count: CONFIG.FEEDS.VIDEOS.COUNT, displayOnlyForFollower: {
            actorId: server.id,
            orLocalVideos: true
        }, hasFiles: true, countVideos: false }, options));
    return data;
}
export function getCommonVideoFeedAttributes(video) {
    const localLink = WEBSERVER.URL + video.getWatchStaticPath();
    const thumbnailModels = [];
    if (video.hasPreview())
        thumbnailModels.push(video.getPreview());
    if (video.hasMiniature())
        thumbnailModels.push(video.getMiniature());
    return {
        title: video.name,
        link: localLink,
        description: mdToPlainText(video.getTruncatedDescription()),
        content: toSafeHtml(video.description),
        date: video.publishedAt,
        nsfw: video.nsfw,
        category: video.category
            ? [{ name: getCategoryLabel(video.category) }]
            : undefined,
        thumbnails: thumbnailModels.map(t => ({
            url: WEBSERVER.URL + t.getLocalStaticPath(),
            width: t.width,
            height: t.height
        }))
    };
}
export function getPodcastFeedUrlCustomTag(videoChannel) {
    return {
        name: 'podcast:txt',
        attributes: {
            purpose: 'p20url'
        },
        value: getChannelPodcastFeed(WEBSERVER.URL, videoChannel)
    };
}
//# sourceMappingURL=video-feed-utils.js.map