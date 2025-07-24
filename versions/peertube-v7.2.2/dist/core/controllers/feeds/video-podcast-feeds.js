import { LiveItemStatus } from '@peertube/feed/lib/typings/index.js';
import { buildDownloadFilesUrl, getResolutionLabel, sortObjectComparator } from '@peertube/peertube-core-utils';
import { ActorImageType, VideoInclude, VideoResolution, VideoState } from '@peertube/peertube-models';
import { buildUUIDv5FromURL } from '@peertube/peertube-node-utils';
import { buildNSFWFilters } from '../../helpers/express-utils.js';
import { CONFIG } from '../../initializers/config.js';
import { InternalEventEmitter } from '../../lib/internal-event-emitter.js';
import { Hooks } from '../../lib/plugins/hooks.js';
import { getVideoFileMimeType } from '../../lib/video-file.js';
import { buildPodcastGroupsCache, cacheRouteFactory, videoFeedsPodcastSetCacheKey } from '../../middlewares/index.js';
import express from 'express';
import { extname } from 'path';
import { MIMETYPES, ROUTE_CACHE_LIFETIME, WEBSERVER } from '../../initializers/constants.js';
import { asyncMiddleware, setFeedPodcastContentType, videoFeedsPodcastValidator } from '../../middlewares/index.js';
import { VideoCaptionModel } from '../../models/video/video-caption.js';
import { VideoModel } from '../../models/video/video.js';
import { buildFeedMetadata, getCommonVideoFeedAttributes, getPodcastFeedUrlCustomTag, getVideosForFeeds, initFeed } from './shared/index.js';
const videoPodcastFeedsRouter = express.Router();
const { middleware: podcastCacheRouteMiddleware, instance: podcastApiCache } = cacheRouteFactory({
    headerBlacklist: ['Content-Type']
});
for (const event of ['video-created', 'video-updated', 'video-deleted']) {
    InternalEventEmitter.Instance.on(event, ({ video }) => {
        if (video.remote)
            return;
        podcastApiCache.clearGroupSafe(buildPodcastGroupsCache({ channelId: video.channelId }));
    });
}
for (const event of ['channel-updated', 'channel-deleted']) {
    InternalEventEmitter.Instance.on(event, ({ channel }) => {
        podcastApiCache.clearGroupSafe(buildPodcastGroupsCache({ channelId: channel.id }));
    });
}
videoPodcastFeedsRouter.get('/podcast/videos.xml', setFeedPodcastContentType, videoFeedsPodcastSetCacheKey, podcastCacheRouteMiddleware(ROUTE_CACHE_LIFETIME.FEEDS), asyncMiddleware(videoFeedsPodcastValidator), asyncMiddleware(generateVideoPodcastFeed));
export { videoPodcastFeedsRouter };
async function generateVideoPodcastFeed(req, res) {
    const videoChannel = res.locals.videoChannel;
    const { name, description, imageUrl, ownerImageUrl, email, link, ownerLink } = await buildFeedMetadata({ videoChannel });
    const nsfwOptions = buildNSFWFilters();
    const data = await getVideosForFeeds(Object.assign(Object.assign({}, nsfwOptions), { sort: '-publishedAt', isLocal: true, include: VideoInclude.FILES, videoChannelId: videoChannel === null || videoChannel === void 0 ? void 0 : videoChannel.id }));
    const language = await VideoModel.guessLanguageOrCategoryOfChannel(videoChannel.id, 'language');
    const category = await VideoModel.guessLanguageOrCategoryOfChannel(videoChannel.id, 'category');
    const hasNSFW = nsfwOptions.nsfw !== false
        ? await VideoModel.channelHasNSFWContent(videoChannel.id)
        : false;
    const customTags = await Hooks.wrapObject([getPodcastFeedUrlCustomTag(videoChannel)], 'filter:feed.podcast.channel.create-custom-tags.result', { videoChannel });
    const customXMLNS = await Hooks.wrapObject([], 'filter:feed.podcast.rss.create-custom-xmlns.result');
    const feed = initFeed({
        name,
        description,
        link,
        isPodcast: true,
        imageUrl,
        language: language || 'en',
        category: categoryToItunes(category),
        nsfw: hasNSFW,
        guid: buildUUIDv5FromURL(videoChannel.Actor.url),
        locked: email
            ? { isLocked: true, email }
            : undefined,
        person: [{ name, href: ownerLink, img: ownerImageUrl }],
        author: { name: CONFIG.INSTANCE.NAME, link: WEBSERVER.URL },
        resourceType: 'videos',
        queryString: new URL(WEBSERVER.URL + req.url).search,
        medium: 'video',
        customXMLNS,
        customTags
    });
    await addVideosToPodcastFeed(feed, data);
    return res.send(feed.podcast()).end();
}
async function generatePodcastItem(options) {
    const { video, liveItem, media } = options;
    const customTags = await Hooks.wrapObject([], 'filter:feed.podcast.video.create-custom-tags.result', { video, liveItem });
    const commonAttributes = getCommonVideoFeedAttributes(video);
    const guid = liveItem
        ? `${video.url}?publishedAt=${video.publishedAt.toISOString()}`
        : video.url;
    const account = video.VideoChannel.Account;
    const person = {
        name: account.getDisplayName(),
        href: account.getClientUrl(),
        img: account.Actor.hasImage(ActorImageType.AVATAR)
            ? WEBSERVER.URL + account.Actor.getMaxQualityImage(ActorImageType.AVATAR).getStaticPath()
            : undefined
    };
    return Object.assign(Object.assign({ guid }, commonAttributes), { trackers: video.getTrackerUrls(), person: [person], media, socialInteract: [
            {
                uri: video.url,
                protocol: 'activitypub',
                accountUrl: account.getClientUrl()
            }
        ], duration: video.duration, customTags });
}
async function addVideosToPodcastFeed(feed, videos) {
    const captionsGroup = await VideoCaptionModel.listCaptionsOfMultipleVideos(videos.map(v => v.id));
    for (const video of videos) {
        if (!video.isLive) {
            await addVODPodcastItem({ feed, video, captionsGroup });
        }
        else if (video.isLive && video.state !== VideoState.LIVE_ENDED) {
            await addLivePodcastItem({ feed, video });
        }
    }
}
async function addVODPodcastItem(options) {
    const { feed, video, captionsGroup } = options;
    const webVideos = video.getFormattedWebVideoFilesJSON(true)
        .map(f => buildVODWebVideoFile(video, f))
        .sort(sortObjectComparator('bitrate', 'asc'));
    const streamingPlaylistFiles = buildVODStreamingPlaylists(video);
    const media = [...webVideos, ...streamingPlaylistFiles];
    const videoCaptions = buildVODCaptions(video, captionsGroup[video.id]);
    const item = await generatePodcastItem({ video, liveItem: false, media });
    feed.addPodcastItem(Object.assign(Object.assign({}, item), { subTitle: videoCaptions }));
}
async function addLivePodcastItem(options) {
    const { feed, video } = options;
    let status;
    switch (video.state) {
        case VideoState.WAITING_FOR_LIVE:
            status = LiveItemStatus.pending;
            break;
        case VideoState.PUBLISHED:
            status = LiveItemStatus.live;
            break;
    }
    const item = await generatePodcastItem({ video, liveItem: true, media: buildLiveStreamingPlaylists(video) });
    feed.addPodcastLiveItem(Object.assign(Object.assign({}, item), { status, start: video.updatedAt.toISOString() }));
}
function buildVODWebVideoFile(video, videoFile) {
    const sources = [
        { uri: videoFile.fileUrl },
        { uri: videoFile.torrentUrl, contentType: 'application/x-bittorrent' }
    ];
    if (videoFile.magnetUri) {
        sources.push({ uri: videoFile.magnetUri });
    }
    return {
        type: getAppleMimeType(extname(videoFile.fileUrl), videoFile.resolution.id === VideoResolution.H_NOVIDEO),
        title: videoFile.resolution.label,
        length: videoFile.size,
        bitrate: videoFile.size / video.duration * 8,
        language: video.language,
        sources
    };
}
function buildVODStreamingPlaylists(video) {
    const hls = video.getHLSPlaylist();
    if (!hls)
        return [];
    const { separatedAudioFile } = video.getMaxQualityAudioAndVideoFiles();
    return [
        ...hls.VideoFiles
            .sort(sortObjectComparator('resolution', 'asc'))
            .map(videoFile => {
            const files = [videoFile];
            if (videoFile.resolution !== VideoResolution.H_NOVIDEO && separatedAudioFile) {
                files.push(separatedAudioFile);
            }
            return {
                type: getAppleMimeType(videoFile.extname, videoFile.resolution === VideoResolution.H_NOVIDEO),
                title: getResolutionLabel(videoFile),
                length: files.reduce((p, f) => p + f.size, 0),
                language: video.language,
                sources: [
                    {
                        uri: buildDownloadFilesUrl({
                            baseUrl: WEBSERVER.URL,
                            videoFiles: files.map(f => f.id),
                            videoUUID: video.uuid,
                            extension: videoFile.hasVideo()
                                ? '.mp4'
                                : '.m4a'
                        })
                    }
                ]
            };
        }),
        {
            type: 'application/x-mpegURL',
            title: 'HLS',
            sources: [
                { uri: hls.getMasterPlaylistUrl(video) }
            ],
            language: video.language
        }
    ];
}
function buildLiveStreamingPlaylists(video) {
    const hls = video.getHLSPlaylist();
    return [
        {
            type: 'application/x-mpegURL',
            title: `HLS live stream`,
            sources: [
                { uri: hls.getMasterPlaylistUrl(video) }
            ],
            language: video.language
        }
    ];
}
function buildVODCaptions(video, videoCaptions) {
    return videoCaptions.map(caption => {
        const type = MIMETYPES.VIDEO_CAPTIONS.EXT_MIMETYPE[extname(caption.filename)];
        if (!type)
            return null;
        return {
            url: caption.getFileUrl(video),
            language: caption.language,
            type,
            rel: 'captions'
        };
    }).filter(c => c);
}
function categoryToItunes(category) {
    const itunesMap = {
        1: 'Music',
        2: 'TV &amp; Film',
        3: 'Leisure',
        4: 'Arts',
        5: 'Sports',
        6: 'Places &amp; Travel',
        7: 'Video Games',
        8: 'Society &amp; Culture',
        9: 'Comedy',
        10: 'Fiction',
        11: 'News',
        12: 'Leisure',
        13: 'Education',
        14: 'Society &amp; Culture',
        15: 'Technology',
        16: 'Pets &amp; Animals',
        17: 'Kids &amp; Family',
        18: 'Food'
    };
    return itunesMap[category];
}
function getAppleMimeType(extname, isAudio) {
    if (extname === '.mp4' && isAudio)
        return 'audio/x-m4a';
    if (extname === '.mp3')
        return 'audio/mpeg';
    return getVideoFileMimeType(extname, isAudio);
}
//# sourceMappingURL=video-podcast-feeds.js.map