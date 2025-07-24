import { NSFWFlag, ThumbnailType, VideoImportState, VideoPrivacy, VideoState } from '@peertube/peertube-models';
import { isVTTFileValid } from '../helpers/custom-validators/video-captions.js';
import { isVideoFileExtnameValid } from '../helpers/custom-validators/videos.js';
import { isResolvingToUnicastOnly } from '../helpers/dns.js';
import { logger } from '../helpers/logger.js';
import { YoutubeDLWrapper } from '../helpers/youtube-dl/index.js';
import { CONFIG } from '../initializers/config.js';
import { sequelizeTypescript } from '../initializers/database.js';
import { Hooks } from './plugins/hooks.js';
import { ServerConfigManager } from './server-config-manager.js';
import { autoBlacklistVideoIfNeeded } from './video-blacklist.js';
import { buildCommentsPolicy, setVideoTags } from './video.js';
import { VideoImportModel } from '../models/video/video-import.js';
import { VideoPasswordModel } from '../models/video/video-password.js';
import { VideoModel } from '../models/video/video.js';
import { remove } from 'fs-extra/esm';
import { getLocalVideoActivityPubUrl } from './activitypub/url.js';
import { updateLocalVideoMiniatureFromExisting, updateLocalVideoMiniatureFromUrl } from './thumbnail.js';
import { createLocalCaption } from './video-captions.js';
import { replaceChapters, replaceChaptersFromDescriptionIfNeeded } from './video-chapters.js';
class YoutubeDlImportError extends Error {
    constructor({ message, code }) {
        super(message);
        this.code = code;
    }
    static fromError(err, code, message) {
        const ytDlErr = new this({ message: message !== null && message !== void 0 ? message : err.message, code });
        ytDlErr.cause = err;
        ytDlErr.stack = err.stack;
        return ytDlErr;
    }
}
(function (YoutubeDlImportError) {
    let CODE;
    (function (CODE) {
        CODE[CODE["FETCH_ERROR"] = 0] = "FETCH_ERROR";
        CODE[CODE["NOT_ONLY_UNICAST_URL"] = 1] = "NOT_ONLY_UNICAST_URL";
    })(CODE = YoutubeDlImportError.CODE || (YoutubeDlImportError.CODE = {}));
})(YoutubeDlImportError || (YoutubeDlImportError = {}));
async function insertFromImportIntoDB(parameters) {
    const { video, thumbnailModel, previewModel, videoChannel, tags, videoImportAttributes, user, videoPasswords } = parameters;
    const videoImport = await sequelizeTypescript.transaction(async (t) => {
        const sequelizeOptions = { transaction: t };
        const videoCreated = await video.save(sequelizeOptions);
        videoCreated.VideoChannel = videoChannel;
        if (thumbnailModel)
            await videoCreated.addAndSaveThumbnail(thumbnailModel, t);
        if (previewModel)
            await videoCreated.addAndSaveThumbnail(previewModel, t);
        if (videoCreated.privacy === VideoPrivacy.PASSWORD_PROTECTED) {
            await VideoPasswordModel.addPasswords(videoPasswords, video.id, t);
        }
        await autoBlacklistVideoIfNeeded({
            video: videoCreated,
            user,
            notify: false,
            isRemote: false,
            isNew: true,
            isNewFile: true,
            transaction: t
        });
        await setVideoTags({ video: videoCreated, tags, transaction: t });
        const videoImport = await VideoImportModel.create(Object.assign({ videoId: videoCreated.id }, videoImportAttributes), sequelizeOptions);
        videoImport.Video = videoCreated;
        return videoImport;
    });
    return videoImport;
}
async function buildVideoFromImport({ channelId, importData, importDataOverride, importType }) {
    var _a, _b, _c, _d;
    let videoData = {
        name: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.name) || importData.name || 'Unknown name',
        remote: false,
        category: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.category) || importData.category,
        licence: (_b = (_a = importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.licence) !== null && _a !== void 0 ? _a : importData.licence) !== null && _b !== void 0 ? _b : CONFIG.DEFAULTS.PUBLISH.LICENCE,
        language: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.language) || importData.language,
        commentsPolicy: buildCommentsPolicy(importDataOverride),
        downloadEnabled: (_c = importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.downloadEnabled) !== null && _c !== void 0 ? _c : CONFIG.DEFAULTS.PUBLISH.DOWNLOAD_ENABLED,
        waitTranscoding: (_d = importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.waitTranscoding) !== null && _d !== void 0 ? _d : true,
        state: VideoState.TO_IMPORT,
        nsfw: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.nsfw) || importData.nsfw || false,
        nsfwFlags: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.nsfwFlags) || NSFWFlag.NONE,
        nsfwSummary: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.nsfwSummary) || null,
        description: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.description) || importData.description,
        support: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.support) || null,
        privacy: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.privacy) || VideoPrivacy.PRIVATE,
        duration: 0,
        channelId,
        originallyPublishedAt: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.originallyPublishedAt)
            ? new Date(importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.originallyPublishedAt)
            : importData.originallyPublishedAtWithoutTime
    };
    videoData = await Hooks.wrapObject(videoData, importType === 'url'
        ? 'filter:api.video.import-url.video-attribute.result'
        : 'filter:api.video.import-torrent.video-attribute.result');
    const video = new VideoModel(videoData);
    video.url = getLocalVideoActivityPubUrl(video);
    return video;
}
async function buildYoutubeDLImport(options) {
    var _a;
    const { targetUrl, channel, channelSync, importDataOverride, thumbnailFilePath, previewFilePath, user } = options;
    const youtubeDL = new YoutubeDLWrapper(targetUrl, ServerConfigManager.Instance.getEnabledResolutions('vod'), CONFIG.TRANSCODING.ALWAYS_TRANSCODE_ORIGINAL_RESOLUTION);
    let youtubeDLInfo;
    try {
        youtubeDLInfo = await youtubeDL.getInfoForDownload();
    }
    catch (err) {
        throw YoutubeDlImportError.fromError(err, YoutubeDlImportError.CODE.FETCH_ERROR, `Cannot fetch information from import for URL ${targetUrl}`);
    }
    if (!await hasUnicastURLsOnly(youtubeDLInfo)) {
        throw new YoutubeDlImportError({
            message: 'Cannot use non unicast IP as targetUrl.',
            code: YoutubeDlImportError.CODE.NOT_ONLY_UNICAST_URL
        });
    }
    const video = await buildVideoFromImport({
        channelId: channel.id,
        importData: youtubeDLInfo,
        importDataOverride,
        importType: 'url'
    });
    const thumbnailModel = await forgeThumbnail({
        inputPath: thumbnailFilePath,
        downloadUrl: youtubeDLInfo.thumbnailUrl,
        video,
        type: ThumbnailType.MINIATURE
    });
    const previewModel = await forgeThumbnail({
        inputPath: previewFilePath,
        downloadUrl: youtubeDLInfo.thumbnailUrl,
        video,
        type: ThumbnailType.PREVIEW
    });
    const videoImport = await insertFromImportIntoDB({
        video,
        thumbnailModel,
        previewModel,
        videoChannel: channel,
        tags: (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.tags) || youtubeDLInfo.tags,
        user,
        videoImportAttributes: {
            targetUrl,
            state: VideoImportState.PENDING,
            userId: user.id,
            videoChannelSyncId: channelSync === null || channelSync === void 0 ? void 0 : channelSync.id
        },
        videoPasswords: importDataOverride.videoPasswords
    });
    await sequelizeTypescript.transaction(async (transaction) => {
        if (importDataOverride === null || importDataOverride === void 0 ? void 0 : importDataOverride.description) {
            const inserted = await replaceChaptersFromDescriptionIfNeeded({ newDescription: importDataOverride.description, video, transaction });
            if (inserted)
                return;
        }
        if (youtubeDLInfo.chapters.length !== 0) {
            logger.info(`Inserting chapters in video ${video.uuid} from youtube-dl`, { chapters: youtubeDLInfo.chapters, tags: ['chapters', video.uuid] });
            await replaceChapters({ video, chapters: youtubeDLInfo.chapters, transaction });
            return;
        }
        if (video.description) {
            await replaceChaptersFromDescriptionIfNeeded({ newDescription: video.description, video, transaction });
        }
    });
    await processYoutubeSubtitles(youtubeDL, targetUrl, video);
    let fileExt = `.${youtubeDLInfo.ext}`;
    if (!isVideoFileExtnameValid(fileExt))
        fileExt = '.mp4';
    const payload = {
        type: 'youtube-dl',
        videoImportId: videoImport.id,
        fileExt,
        generateTranscription: (_a = importDataOverride.generateTranscription) !== null && _a !== void 0 ? _a : true,
        preventException: !!channelSync
    };
    return {
        videoImport,
        job: { type: 'video-import', payload }
    };
}
export { buildVideoFromImport, buildYoutubeDLImport, insertFromImportIntoDB, YoutubeDlImportError };
async function forgeThumbnail({ inputPath, video, downloadUrl, type }) {
    if (inputPath) {
        return updateLocalVideoMiniatureFromExisting({
            inputPath,
            video,
            type,
            automaticallyGenerated: false
        });
    }
    if (downloadUrl) {
        try {
            return await updateLocalVideoMiniatureFromUrl({ downloadUrl, video, type });
        }
        catch (err) {
            logger.warn('Cannot process thumbnail %s from youtube-dl.', downloadUrl, { err });
        }
    }
    return null;
}
async function processYoutubeSubtitles(youtubeDL, targetUrl, video) {
    try {
        const subtitles = await youtubeDL.getSubtitles();
        logger.info('Found %s subtitles candidates from youtube-dl import %s.', subtitles.length, targetUrl);
        for (const subtitle of subtitles) {
            if (!await isVTTFileValid(subtitle.path)) {
                logger.info('%s is not a valid youtube-dl subtitle, skipping', subtitle.path);
                await remove(subtitle.path);
                continue;
            }
            await createLocalCaption({
                language: subtitle.language,
                path: subtitle.path,
                video,
                automaticallyGenerated: false
            });
            logger.info('Added %s youtube-dl subtitle', subtitle.path);
        }
    }
    catch (err) {
        logger.warn('Cannot get video subtitles.', { err });
    }
}
async function hasUnicastURLsOnly(youtubeDLInfo) {
    const hosts = youtubeDLInfo.urls.map(u => new URL(u).hostname);
    const uniqHosts = new Set(hosts);
    for (const h of uniqHosts) {
        if (await isResolvingToUnicastOnly(h) !== true) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=video-pre-import.js.map