import { HttpStatusCode } from '@peertube/peertube-models';
import { ApiCache } from './shared/index.js';
const defaultOptions = {
    excludeStatus: [
        HttpStatusCode.FORBIDDEN_403,
        HttpStatusCode.NOT_FOUND_404
    ]
};
export function cacheRoute(duration) {
    const instance = new ApiCache(defaultOptions);
    return instance.buildMiddleware(duration);
}
export function cacheRouteFactory(options = {}) {
    const instance = new ApiCache(Object.assign(Object.assign({}, defaultOptions), options));
    return { instance, middleware: instance.buildMiddleware.bind(instance) };
}
export function buildPodcastGroupsCache(options) {
    return 'podcast-feed-' + options.channelId;
}
export function buildAPVideoChaptersGroupsCache(options) {
    return 'ap-video-chapters-' + options.videoId;
}
export const videoFeedsPodcastSetCacheKey = [
    (req, res, next) => {
        if (req.query.videoChannelId) {
            res.locals.apicacheGroups = [buildPodcastGroupsCache({ channelId: req.query.videoChannelId })];
        }
        return next();
    }
];
export const apVideoChaptersSetCacheKey = [
    (req, res, next) => {
        if (req.params.id) {
            res.locals.apicacheGroups = [buildAPVideoChaptersGroupsCache({ videoId: req.params.id })];
        }
        return next();
    }
];
//# sourceMappingURL=cache.js.map