import { logger } from '../../helpers/logger.js';
import { Hooks } from '../../lib/plugins/hooks.js';
import { getServerActor } from '../../models/application/application.js';
import { VideoModel } from '../../models/video/video.js';
import express from 'express';
import memoizee from 'memoizee';
import { buildNSFWFilters } from '../../helpers/express-utils.js';
import { MEMOIZE_TTL, OVERVIEWS } from '../../initializers/constants.js';
import { apiRateLimiter, asyncMiddleware, optionalAuthenticate, videosOverviewValidator } from '../../middlewares/index.js';
import { TagModel } from '../../models/video/tag.js';
const overviewsRouter = express.Router();
overviewsRouter.use(apiRateLimiter);
overviewsRouter.get('/videos', videosOverviewValidator, optionalAuthenticate, asyncMiddleware(getVideosOverview));
export { overviewsRouter };
const buildSamples = memoizee(async function () {
    const [categories, channels, tags] = await Promise.all([
        VideoModel.getRandomFieldSamples('category', OVERVIEWS.VIDEOS.SAMPLE_THRESHOLD, OVERVIEWS.VIDEOS.SAMPLES_COUNT),
        VideoModel.getRandomFieldSamples('channelId', OVERVIEWS.VIDEOS.SAMPLE_THRESHOLD, OVERVIEWS.VIDEOS.SAMPLES_COUNT),
        TagModel.getRandomSamples(OVERVIEWS.VIDEOS.SAMPLE_THRESHOLD, OVERVIEWS.VIDEOS.SAMPLES_COUNT)
    ]);
    const result = { categories, channels, tags };
    logger.debug('Building samples for overview endpoint.', { result });
    return result;
}, { maxAge: MEMOIZE_TTL.OVERVIEWS_SAMPLE });
async function getVideosOverview(req, res) {
    const attributes = await buildSamples();
    const page = req.query.page || 1;
    const index = page - 1;
    const categories = [];
    const channels = [];
    const tags = [];
    await Promise.all([
        getVideosByCategory(attributes.categories, index, res, categories),
        getVideosByChannel(attributes.channels, index, res, channels),
        getVideosByTag(attributes.tags, index, res, tags)
    ]);
    const result = {
        categories,
        channels,
        tags
    };
    return res.json(result);
}
async function getVideosByTag(tagsSample, index, res, acc) {
    if (tagsSample.length <= index)
        return;
    const tag = tagsSample[index];
    const videos = await getVideos(res, { tagsOneOf: [tag] });
    if (videos.length === 0)
        return;
    acc.push({
        tag,
        videos
    });
}
async function getVideosByCategory(categoriesSample, index, res, acc) {
    if (categoriesSample.length <= index)
        return;
    const category = categoriesSample[index];
    const videos = await getVideos(res, { categoryOneOf: [category] });
    if (videos.length === 0)
        return;
    acc.push({
        category: videos[0].category,
        videos
    });
}
async function getVideosByChannel(channelsSample, index, res, acc) {
    if (channelsSample.length <= index)
        return;
    const channelId = channelsSample[index];
    const videos = await getVideos(res, { videoChannelId: channelId });
    if (videos.length === 0)
        return;
    acc.push({
        channel: videos[0].channel,
        videos
    });
}
async function getVideos(res, where) {
    const serverActor = await getServerActor();
    const query = await Hooks.wrapObject(Object.assign(Object.assign(Object.assign({}, buildNSFWFilters({ res })), { start: 0, count: 12, sort: '-createdAt', displayOnlyForFollower: {
            actorId: serverActor.id,
            orLocalVideos: true
        }, user: res.locals.oauth ? res.locals.oauth.token.User : undefined, countVideos: false }), where), 'filter:api.overviews.videos.list.params');
    const { data } = await Hooks.wrapPromiseFun(VideoModel.listForApi.bind(VideoModel), query, 'filter:api.overviews.videos.list.result');
    return data.map(d => d.toFormattedJSON());
}
//# sourceMappingURL=overviews.js.map