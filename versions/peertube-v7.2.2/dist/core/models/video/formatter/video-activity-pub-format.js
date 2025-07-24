import { nsfwFlagsToString, VideoCommentPolicy } from '@peertube/peertube-models';
import { getAPPublicValue } from '../../../helpers/activity-pub-utils.js';
import { isArray } from '../../../helpers/custom-validators/misc.js';
import { generateMagnetUri } from '../../../helpers/webtorrent.js';
import { getActivityStreamDuration } from '../../../lib/activitypub/activity.js';
import { getLocalVideoFileMetadataUrl } from '../../../lib/video-urls.js';
import { WEBSERVER } from '../../../initializers/constants.js';
import { getLocalVideoChaptersActivityPubUrl, getLocalVideoCommentsActivityPubUrl, getLocalVideoDislikesActivityPubUrl, getLocalVideoLikesActivityPubUrl, getLocalVideoSharesActivityPubUrl } from '../../../lib/activitypub/url.js';
import { sortByResolutionDesc } from './shared/index.js';
import { getCategoryLabel, getLanguageLabel, getLicenceLabel } from './video-api-format.js';
export function videoModelToActivityPubObject(video) {
    var _a;
    const language = video.language
        ? { identifier: video.language, name: getLanguageLabel(video.language) }
        : undefined;
    const category = video.category
        ? { identifier: video.category + '', name: getCategoryLabel(video.category) }
        : undefined;
    const licence = video.licence
        ? { identifier: video.licence + '', name: getLicenceLabel(video.licence) }
        : undefined;
    const url = [
        {
            type: 'Link',
            mediaType: 'text/html',
            href: WEBSERVER.URL + video.getWatchStaticPath()
        },
        {
            type: 'Link',
            mediaType: 'text/html',
            href: video.url
        },
        ...buildVideoFileUrls({ video, files: video.VideoFiles }),
        ...buildStreamingPlaylistUrls(video),
        ...buildTrackerUrls(video)
    ];
    return Object.assign({ type: 'Video', id: video.url, name: video.name, duration: getActivityStreamDuration(video.duration), uuid: video.uuid, category,
        licence,
        language, views: video.views, sensitive: video.nsfw, summary: video.nsfwSummary, waitTranscoding: video.waitTranscoding, state: video.state, commentsEnabled: video.commentsPolicy !== VideoCommentPolicy.DISABLED, canReply: video.commentsPolicy === VideoCommentPolicy.ENABLED
            ? null
            : getAPPublicValue(), commentsPolicy: video.commentsPolicy, downloadEnabled: video.downloadEnabled, published: video.publishedAt.toISOString(), originallyPublishedAt: video.originallyPublishedAt
            ? video.originallyPublishedAt.toISOString()
            : null, updated: video.updatedAt.toISOString(), uploadDate: (_a = video.inputFileUpdatedAt) === null || _a === void 0 ? void 0 : _a.toISOString(), tag: buildTags(video), mediaType: 'text/markdown', content: video.description, support: video.support, subtitleLanguage: buildSubtitleLanguage(video), icon: buildIcon(video), preview: buildPreviewAPAttribute(video), aspectRatio: video.aspectRatio, url, likes: getLocalVideoLikesActivityPubUrl(video), dislikes: getLocalVideoDislikesActivityPubUrl(video), shares: getLocalVideoSharesActivityPubUrl(video), comments: getLocalVideoCommentsActivityPubUrl(video), hasParts: getLocalVideoChaptersActivityPubUrl(video), attributedTo: [
            {
                type: 'Person',
                id: video.VideoChannel.Account.Actor.url
            },
            {
                type: 'Group',
                id: video.VideoChannel.Actor.url
            }
        ] }, buildLiveAPAttributes(video));
}
function buildLiveAPAttributes(video) {
    if (!video.isLive) {
        return {
            isLiveBroadcast: false,
            liveSaveReplay: null,
            permanentLive: null,
            latencyMode: null
        };
    }
    return {
        isLiveBroadcast: true,
        liveSaveReplay: video.VideoLive.saveReplay,
        permanentLive: video.VideoLive.permanentLive,
        latencyMode: video.VideoLive.latencyMode
    };
}
function buildPreviewAPAttribute(video) {
    if (!video.Storyboard)
        return undefined;
    const storyboard = video.Storyboard;
    return [
        {
            type: 'Image',
            rel: ['storyboard'],
            url: [
                {
                    mediaType: 'image/jpeg',
                    href: storyboard.getOriginFileUrl(video),
                    width: storyboard.totalWidth,
                    height: storyboard.totalHeight,
                    tileWidth: storyboard.spriteWidth,
                    tileHeight: storyboard.spriteHeight,
                    tileDuration: getActivityStreamDuration(storyboard.spriteDuration)
                }
            ]
        }
    ];
}
function buildVideoFileUrls(options) {
    const { video, files } = options;
    if (!isArray(files))
        return [];
    const urls = [];
    const trackerUrls = video.getTrackerUrls();
    const sortedFiles = files
        .filter(f => !f.isLive())
        .sort(sortByResolutionDesc);
    for (const file of sortedFiles) {
        const fileAP = file.toActivityPubObject(video);
        urls.push(fileAP);
        urls.push({
            type: 'Link',
            rel: ['metadata', fileAP.mediaType],
            mediaType: 'application/json',
            href: getLocalVideoFileMetadataUrl(video, file),
            height: file.height || file.resolution,
            width: file.width,
            fps: file.fps
        });
        if (file.hasTorrent()) {
            urls.push({
                type: 'Link',
                mediaType: 'application/x-bittorrent',
                href: file.getTorrentUrl(),
                height: file.height || file.resolution,
                width: file.width,
                fps: file.fps
            });
            urls.push({
                type: 'Link',
                mediaType: 'application/x-bittorrent;x-scheme-handler/magnet',
                href: generateMagnetUri(video, file, trackerUrls),
                height: file.height || file.resolution,
                width: file.width,
                fps: file.fps
            });
        }
    }
    return urls;
}
function buildStreamingPlaylistUrls(video) {
    if (!isArray(video.VideoStreamingPlaylists))
        return [];
    return video.VideoStreamingPlaylists
        .map(playlist => ({
        type: 'Link',
        mediaType: 'application/x-mpegURL',
        href: playlist.getMasterPlaylistUrl(video),
        tag: buildStreamingPlaylistTags(video, playlist)
    }));
}
function buildStreamingPlaylistTags(video, playlist) {
    return [
        ...playlist.p2pMediaLoaderInfohashes.map(i => ({ type: 'Infohash', name: i })),
        {
            type: 'Link',
            name: 'sha256',
            mediaType: 'application/json',
            href: playlist.getSha256SegmentsUrl(video)
        },
        ...buildVideoFileUrls({ video, files: playlist.VideoFiles })
    ];
}
function buildTrackerUrls(video) {
    return video.getTrackerUrls()
        .map(trackerUrl => {
        const rel2 = trackerUrl.startsWith('http')
            ? 'http'
            : 'websocket';
        return {
            type: 'Link',
            name: `tracker-${rel2}`,
            rel: ['tracker', rel2],
            href: trackerUrl
        };
    });
}
function buildTags(video) {
    const tags = isArray(video.Tags)
        ? video.Tags
        : [];
    return [
        ...tags.map(t => ({
            type: 'Hashtag',
            name: t.name
        })),
        ...nsfwFlagsToString(video.nsfwFlags).map(f => ({
            type: 'SensitiveTag',
            name: f
        }))
    ];
}
function buildIcon(video) {
    return [video.getMiniature(), video.getPreview()]
        .filter(i => !!i)
        .map(i => i.toActivityPubObject(video));
}
function buildSubtitleLanguage(video) {
    if (!isArray(video.VideoCaptions))
        return [];
    return video.VideoCaptions
        .map(caption => caption.toActivityPubObject(video));
}
//# sourceMappingURL=video-activity-pub-format.js.map