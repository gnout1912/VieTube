import { getResolutionLabel } from '@peertube/peertube-core-utils';
import { VideoCommentPolicy, VideoInclude } from '@peertube/peertube-models';
import { uuidToShort } from '@peertube/peertube-node-utils';
import { generateMagnetUri } from '../../../helpers/webtorrent.js';
import { tracer } from '../../../lib/opentelemetry/tracing.js';
import { getHLSResolutionPlaylistFilename } from '../../../lib/paths.js';
import { getLocalVideoFileMetadataUrl } from '../../../lib/video-urls.js';
import { VideoViewsManager } from '../../../lib/views/video-views-manager.js';
import { isArray } from '../../../helpers/custom-validators/misc.js';
import { VIDEO_CATEGORIES, VIDEO_COMMENTS_POLICY, VIDEO_LANGUAGES, VIDEO_LICENCES, VIDEO_PRIVACIES, VIDEO_STATES } from '../../../initializers/constants.js';
import { sortByResolutionDesc } from './shared/index.js';
export function guessAdditionalAttributesFromQuery(query) {
    if (!(query === null || query === void 0 ? void 0 : query.include))
        return {};
    return {
        additionalAttributes: {
            state: !!(query.include & VideoInclude.NOT_PUBLISHED_STATE),
            waitTranscoding: !!(query.include & VideoInclude.NOT_PUBLISHED_STATE),
            scheduledUpdate: !!(query.include & VideoInclude.NOT_PUBLISHED_STATE),
            blacklistInfo: !!(query.include & VideoInclude.BLACKLISTED),
            files: !!(query.include & VideoInclude.FILES),
            source: !!(query.include & VideoInclude.SOURCE),
            blockedOwner: !!(query.include & VideoInclude.BLOCKED_OWNER),
            automaticTags: !!(query.include & VideoInclude.AUTOMATIC_TAGS)
        }
    };
}
export function videoModelToFormattedJSON(video, options = {}) {
    const span = tracer.startSpan('peertube.VideoModel.toFormattedJSON');
    const userHistory = isArray(video.UserVideoHistories)
        ? video.UserVideoHistories[0]
        : undefined;
    const videoObject = Object.assign({ id: video.id, uuid: video.uuid, shortUUID: uuidToShort(video.uuid), url: video.url, name: video.name, category: {
            id: video.category,
            label: getCategoryLabel(video.category)
        }, licence: {
            id: video.licence,
            label: getLicenceLabel(video.licence)
        }, language: {
            id: video.language,
            label: getLanguageLabel(video.language)
        }, privacy: {
            id: video.privacy,
            label: getPrivacyLabel(video.privacy)
        }, nsfw: video.nsfw, nsfwFlags: video.nsfwFlags, nsfwSummary: video.nsfwSummary, truncatedDescription: video.getTruncatedDescription(), description: options && options.completeDescription === true
            ? video.description
            : video.getTruncatedDescription(), isLocal: video.isOwned(), duration: video.duration, aspectRatio: video.aspectRatio, views: video.views, viewers: VideoViewsManager.Instance.getTotalViewersOf(video), likes: video.likes, dislikes: video.dislikes, thumbnailPath: video.getMiniatureStaticPath(), previewPath: video.getPreviewStaticPath(), embedPath: video.getEmbedStaticPath(), createdAt: video.createdAt, updatedAt: video.updatedAt, publishedAt: video.publishedAt, originallyPublishedAt: video.originallyPublishedAt, isLive: video.isLive, account: video.VideoChannel.Account.toFormattedSummaryJSON(), channel: video.VideoChannel.toFormattedSummaryJSON(), userHistory: userHistory
            ? { currentTime: userHistory.currentTime }
            : undefined, comments: video.comments, pluginData: video.pluginData }, buildAdditionalAttributes(video, options));
    span.end();
    return videoObject;
}
export function videoModelToFormattedDetailsJSON(video) {
    const span = tracer.startSpan('peertube.VideoModel.toFormattedDetailsJSON');
    const videoJSON = video.toFormattedJSON({
        completeDescription: true,
        additionalAttributes: {
            scheduledUpdate: true,
            blacklistInfo: true,
            files: true
        }
    });
    const tags = video.Tags
        ? video.Tags.map(t => t.name)
        : [];
    const detailsJSON = Object.assign(Object.assign({}, videoJSON), { support: video.support, channel: video.VideoChannel.toFormattedJSON(), account: video.VideoChannel.Account.toFormattedJSON(), tags, commentsEnabled: video.commentsPolicy !== VideoCommentPolicy.DISABLED, commentsPolicy: {
            id: video.commentsPolicy,
            label: VIDEO_COMMENTS_POLICY[video.commentsPolicy]
        }, downloadEnabled: video.downloadEnabled, waitTranscoding: video.waitTranscoding, inputFileUpdatedAt: video.inputFileUpdatedAt, state: {
            id: video.state,
            label: getStateLabel(video.state)
        }, trackerUrls: video.getTrackerUrls() });
    span.end();
    return detailsJSON;
}
export function streamingPlaylistsModelToFormattedJSON(video, playlists) {
    if (isArray(playlists) === false)
        return [];
    return playlists
        .map(playlist => ({
        id: playlist.id,
        type: playlist.type,
        playlistUrl: playlist.getMasterPlaylistUrl(video),
        segmentsSha256Url: playlist.getSha256SegmentsUrl(video),
        redundancies: isArray(playlist.RedundancyVideos)
            ? playlist.RedundancyVideos.map(r => ({ baseUrl: r.fileUrl }))
            : [],
        files: videoFilesModelToFormattedJSON(video, playlist.VideoFiles, { includePlaylistUrl: true })
    }));
}
export function videoFilesModelToFormattedJSON(video, videoFiles, options = {}) {
    const { includePlaylistUrl = false, includeMagnet = true } = options;
    if (isArray(videoFiles) === false)
        return [];
    const trackerUrls = includeMagnet
        ? video.getTrackerUrls()
        : [];
    return videoFiles
        .filter(f => !f.isLive())
        .sort(sortByResolutionDesc)
        .map(videoFile => {
        var _a;
        const fileUrl = videoFile.getFileUrl(video);
        return {
            id: videoFile.id,
            resolution: {
                id: videoFile.resolution,
                label: getResolutionLabel({
                    resolution: videoFile.resolution,
                    height: videoFile.height,
                    width: videoFile.width
                })
            },
            width: videoFile.width,
            height: videoFile.height,
            magnetUri: includeMagnet && videoFile.hasTorrent()
                ? generateMagnetUri(video, videoFile, trackerUrls)
                : undefined,
            size: videoFile.size,
            fps: videoFile.fps,
            torrentUrl: videoFile.getTorrentUrl(),
            torrentDownloadUrl: videoFile.getTorrentDownloadUrl(),
            fileUrl,
            fileDownloadUrl: videoFile.getFileDownloadUrl(video),
            metadataUrl: (_a = videoFile.metadataUrl) !== null && _a !== void 0 ? _a : getLocalVideoFileMetadataUrl(video, videoFile),
            hasAudio: videoFile.hasAudio(),
            hasVideo: videoFile.hasVideo(),
            playlistUrl: includePlaylistUrl === true
                ? getHLSResolutionPlaylistFilename(fileUrl)
                : undefined,
            storage: video.remote
                ? null
                : videoFile.storage
        };
    });
}
export function getCategoryLabel(id) {
    return VIDEO_CATEGORIES[id] || 'Unknown';
}
export function getLicenceLabel(id) {
    return VIDEO_LICENCES[id] || 'Unknown';
}
export function getLanguageLabel(id) {
    return VIDEO_LANGUAGES[id] || 'Unknown';
}
export function getPrivacyLabel(id) {
    return VIDEO_PRIVACIES[id] || 'Unknown';
}
export function getStateLabel(id) {
    return VIDEO_STATES[id] || 'Unknown';
}
function buildAdditionalAttributes(video, options) {
    var _a;
    const add = options.additionalAttributes;
    const result = {};
    if ((add === null || add === void 0 ? void 0 : add.state) === true) {
        result.state = {
            id: video.state,
            label: getStateLabel(video.state)
        };
    }
    if ((add === null || add === void 0 ? void 0 : add.waitTranscoding) === true) {
        result.waitTranscoding = video.waitTranscoding;
    }
    if ((add === null || add === void 0 ? void 0 : add.scheduledUpdate) === true && video.ScheduleVideoUpdate) {
        result.scheduledUpdate = {
            updateAt: video.ScheduleVideoUpdate.updateAt,
            privacy: video.ScheduleVideoUpdate.privacy || undefined
        };
    }
    if ((add === null || add === void 0 ? void 0 : add.blacklistInfo) === true) {
        result.blacklisted = !!video.VideoBlacklist;
        result.blacklistedReason = video.VideoBlacklist
            ? video.VideoBlacklist.reason
            : null;
    }
    if ((add === null || add === void 0 ? void 0 : add.blockedOwner) === true) {
        result.blockedOwner = video.VideoChannel.Account.isBlocked();
        const server = video.VideoChannel.Account.Actor.Server;
        result.blockedServer = !!(server === null || server === void 0 ? void 0 : server.isBlocked());
    }
    if ((add === null || add === void 0 ? void 0 : add.files) === true) {
        result.streamingPlaylists = streamingPlaylistsModelToFormattedJSON(video, video.VideoStreamingPlaylists);
        result.files = videoFilesModelToFormattedJSON(video, video.VideoFiles);
    }
    if ((add === null || add === void 0 ? void 0 : add.source) === true) {
        result.videoSource = ((_a = video.VideoSource) === null || _a === void 0 ? void 0 : _a.toFormattedJSON()) || null;
    }
    if ((add === null || add === void 0 ? void 0 : add.automaticTags) === true) {
        result.automaticTags = (video.VideoAutomaticTags || []).map(t => t.AutomaticTag.name);
    }
    return result;
}
//# sourceMappingURL=video-api-format.js.map