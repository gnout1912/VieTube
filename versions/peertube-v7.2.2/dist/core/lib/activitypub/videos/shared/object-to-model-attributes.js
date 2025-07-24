import { arrayify, maxBy, minBy } from '@peertube/peertube-core-utils';
import { NSFWFlag, stringToNSFWFlag, VideoFileFormatFlag, VideoFileStream, VideoPrivacy, VideoResolution, VideoStreamingPlaylistType } from '@peertube/peertube-models';
import { hasAPPublic } from '../../../../helpers/activity-pub-utils.js';
import { isAPVideoFileUrlMetadataObject } from '../../../../helpers/custom-validators/activitypub/videos.js';
import { exists, isArray } from '../../../../helpers/custom-validators/misc.js';
import { isVideoFileInfoHashValid } from '../../../../helpers/custom-validators/videos.js';
import { generateImageFilename } from '../../../../helpers/image-utils.js';
import { getExtFromMimetype } from '../../../../helpers/video.js';
import { MIMETYPES, P2P_MEDIA_LOADER_PEER_VERSION, PREVIEWS_SIZE, THUMBNAILS_SIZE } from '../../../../initializers/constants.js';
import { generateTorrentFileName } from '../../../paths.js';
import { VideoCaptionModel } from '../../../../models/video/video-caption.js';
import { VideoStreamingPlaylistModel } from '../../../../models/video/video-streaming-playlist.js';
import { isStreamingPlaylist } from '../../../../types/models/index.js';
import { decode as magnetUriDecode } from 'magnet-uri';
import { basename, extname } from 'path';
import { getDurationFromActivityStream } from '../../activity.js';
export function getThumbnailFromIcons(videoObject) {
    let validIcons = videoObject.icon.filter(i => i.width > THUMBNAILS_SIZE.minRemoteWidth);
    if (validIcons.length === 0)
        validIcons = videoObject.icon;
    return minBy(validIcons, 'width');
}
export function getPreviewFromIcons(videoObject) {
    const validIcons = videoObject.icon.filter(i => i.width > PREVIEWS_SIZE.minRemoteWidth);
    return maxBy(validIcons, 'width');
}
export function getTagsFromObject(videoObject) {
    return videoObject.tag
        .filter(isAPHashTagObject)
        .map(t => t.name);
}
export function getFileAttributesFromUrl(videoOrPlaylist, urls) {
    const fileUrls = urls.filter(u => isAPVideoUrlObject(u));
    if (fileUrls.length === 0)
        return [];
    const attributes = [];
    for (const fileUrl of fileUrls) {
        const metadata = urls.filter(isAPVideoFileUrlMetadataObject)
            .find(u => {
            return u.height === fileUrl.height &&
                u.fps === fileUrl.fps &&
                u.rel.includes(fileUrl.mediaType);
        });
        const extname = getExtFromMimetype(MIMETYPES.VIDEO.MIMETYPE_EXT, fileUrl.mediaType);
        const resolution = fileUrl.height;
        const [videoId, videoStreamingPlaylistId] = isStreamingPlaylist(videoOrPlaylist)
            ? [null, videoOrPlaylist.id]
            : [videoOrPlaylist.id, null];
        const { torrentFilename, infoHash, torrentUrl } = getTorrentRelatedInfo({ videoOrPlaylist, urls, fileUrl });
        const attribute = {
            extname,
            resolution,
            size: fileUrl.size,
            fps: exists(fileUrl.fps) && fileUrl.fps >= 0
                ? fileUrl.fps
                : -1,
            metadataUrl: metadata === null || metadata === void 0 ? void 0 : metadata.href,
            width: fileUrl.width,
            height: fileUrl.height,
            filename: basename(fileUrl.href),
            fileUrl: fileUrl.href,
            infoHash,
            torrentFilename,
            torrentUrl,
            formatFlags: buildFileFormatFlags(fileUrl, isStreamingPlaylist(videoOrPlaylist)),
            streams: buildFileStreams(fileUrl, resolution),
            videoId,
            videoStreamingPlaylistId
        };
        attributes.push(attribute);
    }
    return attributes;
}
function buildFileFormatFlags(fileUrl, isStreamingPlaylist) {
    const attachment = fileUrl.attachment || [];
    const formatHints = attachment.filter(a => a.type === 'PropertyValue' && a.name === 'peertube_format_flag');
    if (formatHints.length === 0) {
        return isStreamingPlaylist
            ? VideoFileFormatFlag.FRAGMENTED
            : VideoFileFormatFlag.WEB_VIDEO;
    }
    let formatFlags = VideoFileFormatFlag.NONE;
    for (const hint of formatHints) {
        if (hint.value === 'fragmented')
            formatFlags |= VideoFileFormatFlag.FRAGMENTED;
        else if (hint.value === 'web-video')
            formatFlags |= VideoFileFormatFlag.WEB_VIDEO;
    }
    return formatFlags;
}
function buildFileStreams(fileUrl, resolution) {
    const attachment = fileUrl.attachment || [];
    const formatHints = attachment.filter(a => a.type === 'PropertyValue' && a.name === 'ffprobe_codec_type');
    if (formatHints.length === 0) {
        if (resolution === VideoResolution.H_NOVIDEO)
            return VideoFileStream.AUDIO;
        return VideoFileStream.VIDEO | VideoFileStream.AUDIO;
    }
    let streams = VideoFileStream.NONE;
    for (const hint of formatHints) {
        if (hint.value === 'audio')
            streams |= VideoFileStream.AUDIO;
        else if (hint.value === 'video')
            streams |= VideoFileStream.VIDEO;
    }
    return streams;
}
export function getStreamingPlaylistAttributesFromObject(video, videoObject) {
    var _a;
    const playlistUrls = videoObject.url.filter(u => isAPStreamingPlaylistUrlObject(u));
    if (playlistUrls.length === 0)
        return [];
    const attributes = [];
    for (const playlistUrlObject of playlistUrls) {
        const segmentsSha256UrlObject = playlistUrlObject.tag.find(isAPPlaylistSegmentHashesUrlObject);
        const files = playlistUrlObject.tag.filter(u => isAPVideoUrlObject(u));
        const attribute = {
            type: VideoStreamingPlaylistType.HLS,
            playlistFilename: basename(playlistUrlObject.href),
            playlistUrl: playlistUrlObject.href,
            segmentsSha256Filename: segmentsSha256UrlObject
                ? basename(segmentsSha256UrlObject.href)
                : null,
            segmentsSha256Url: (_a = segmentsSha256UrlObject === null || segmentsSha256UrlObject === void 0 ? void 0 : segmentsSha256UrlObject.href) !== null && _a !== void 0 ? _a : null,
            p2pMediaLoaderInfohashes: VideoStreamingPlaylistModel.buildP2PMediaLoaderInfoHashes(playlistUrlObject.href, files),
            p2pMediaLoaderPeerVersion: P2P_MEDIA_LOADER_PEER_VERSION,
            videoId: video.id,
            tagAPObject: playlistUrlObject.tag
        };
        attributes.push(attribute);
    }
    return attributes;
}
export function getLiveAttributesFromObject(video, videoObject) {
    return {
        saveReplay: videoObject.liveSaveReplay,
        permanentLive: videoObject.permanentLive,
        latencyMode: videoObject.latencyMode,
        videoId: video.id
    };
}
export function getCaptionAttributesFromObject(video, videoObject) {
    return videoObject.subtitleLanguage.map(c => {
        var _a, _b;
        const url = c.url;
        const filename = VideoCaptionModel.generateCaptionName(c.identifier);
        return {
            videoId: video.id,
            filename,
            language: c.identifier,
            automaticallyGenerated: c.automaticallyGenerated === true,
            fileUrl: (_a = url.find(u => u.mediaType === 'text/vtt')) === null || _a === void 0 ? void 0 : _a.href,
            m3u8Filename: VideoCaptionModel.generateM3U8Filename(filename),
            m3u8Url: (_b = url.find(u => u.mediaType === 'application/x-mpegURL')) === null || _b === void 0 ? void 0 : _b.href
        };
    });
}
export function getStoryboardAttributeFromObject(video, videoObject) {
    if (!isArray(videoObject.preview))
        return undefined;
    const storyboard = videoObject.preview.find(p => p.rel.includes('storyboard'));
    if (!storyboard)
        return undefined;
    const url = arrayify(storyboard.url).find(u => u.mediaType === 'image/jpeg');
    return {
        filename: generateImageFilename(extname(url.href)),
        totalHeight: url.height,
        totalWidth: url.width,
        spriteHeight: url.tileHeight,
        spriteWidth: url.tileWidth,
        spriteDuration: getDurationFromActivityStream(url.tileDuration),
        fileUrl: url.href,
        videoId: video.id
    };
}
export function getVideoAttributesFromObject(videoChannel, videoObject, to = []) {
    var _a, _b;
    const privacy = hasAPPublic(to)
        ? VideoPrivacy.PUBLIC
        : VideoPrivacy.UNLISTED;
    const language = (_a = videoObject.language) === null || _a === void 0 ? void 0 : _a.identifier;
    const category = videoObject.category
        ? parseInt(videoObject.category.identifier, 10)
        : undefined;
    const licence = videoObject.licence
        ? parseInt(videoObject.licence.identifier, 10)
        : undefined;
    const description = videoObject.content || null;
    const support = videoObject.support || null;
    return {
        name: videoObject.name,
        uuid: videoObject.uuid,
        url: videoObject.id,
        category,
        licence,
        language,
        description,
        support,
        nsfw: videoObject.sensitive,
        nsfwSummary: videoObject.sensitive
            ? ((_b = videoObject.summary) !== null && _b !== void 0 ? _b : null)
            : null,
        nsfwFlags: videoObject.sensitive
            ? getNSFWFlags(videoObject.tag)
            : NSFWFlag.NONE,
        commentsPolicy: videoObject.commentsPolicy,
        downloadEnabled: videoObject.downloadEnabled,
        waitTranscoding: videoObject.waitTranscoding,
        isLive: videoObject.isLiveBroadcast,
        state: videoObject.state,
        aspectRatio: videoObject.aspectRatio,
        channelId: videoChannel.id,
        duration: getDurationFromActivityStream(videoObject.duration),
        createdAt: new Date(videoObject.published),
        publishedAt: new Date(videoObject.published),
        originallyPublishedAt: videoObject.originallyPublishedAt
            ? new Date(videoObject.originallyPublishedAt)
            : null,
        inputFileUpdatedAt: videoObject.uploadDate
            ? new Date(videoObject.uploadDate)
            : null,
        updatedAt: new Date(videoObject.updated),
        views: videoObject.views,
        remote: true,
        privacy
    };
}
function isAPVideoUrlObject(url) {
    return !!MIMETYPES.AP_VIDEO.MIMETYPE_EXT[url.mediaType];
}
function isAPStreamingPlaylistUrlObject(url) {
    return url && url.mediaType === 'application/x-mpegURL';
}
function isAPPlaylistSegmentHashesUrlObject(tag) {
    return tag && tag.name === 'sha256' && tag.type === 'Link' && tag.mediaType === 'application/json';
}
function isAPMagnetUrlObject(url) {
    return url && url.mediaType === 'application/x-bittorrent;x-scheme-handler/magnet';
}
function isAPHashTagObject(tag) {
    return tag && tag.type === 'Hashtag';
}
function isAPSensitiveTagObject(tag) {
    return tag && tag.type === 'SensitiveTag';
}
function getTorrentRelatedInfo(options) {
    const { urls, fileUrl, videoOrPlaylist } = options;
    const magnet = urls.filter(isAPMagnetUrlObject)
        .find(u => u.height === fileUrl.height);
    if (!magnet) {
        return {
            torrentUrl: null,
            torrentFilename: null,
            infoHash: null
        };
    }
    const magnetParsed = magnetUriDecode(magnet.href);
    if (magnetParsed && isVideoFileInfoHashValid(magnetParsed.infoHash) === false) {
        throw new Error('Info hash is not valid in magnet URI ' + magnet.href);
    }
    const torrentUrl = Array.isArray(magnetParsed.xs)
        ? magnetParsed.xs[0]
        : magnetParsed.xs;
    return {
        torrentUrl,
        torrentFilename: generateTorrentFileName(videoOrPlaylist, fileUrl.height),
        infoHash: magnetParsed.infoHash
    };
}
function getNSFWFlags(tags) {
    return tags.filter(t => isAPSensitiveTagObject(t))
        .map(t => stringToNSFWFlag(t.name))
        .filter(t => !!t)
        .reduce((acc, t) => acc | t, 0);
}
//# sourceMappingURL=object-to-model-attributes.js.map