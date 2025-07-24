import { pick } from '@peertube/peertube-core-utils';
import { ffprobePromise, getVideoStreamDuration } from '@peertube/peertube-ffmpeg';
import { LiveVideoLatencyMode, ThumbnailType, VideoCommentPolicy, VideoPrivacy, VideoState } from '@peertube/peertube-models';
import { buildUUID, getFileSize } from '@peertube/peertube-node-utils';
import { isArray, isBooleanValid, isUUIDValid } from '../../../helpers/custom-validators/misc.js';
import { isVideoCaptionLanguageValid } from '../../../helpers/custom-validators/video-captions.js';
import { isVideoChannelUsernameValid } from '../../../helpers/custom-validators/video-channels.js';
import { isVideoChapterTimecodeValid, isVideoChapterTitleValid } from '../../../helpers/custom-validators/video-chapters.js';
import { isLiveLatencyModeValid } from '../../../helpers/custom-validators/video-lives.js';
import { isPasswordValid, isVideoCategoryValid, isVideoCommentsPolicyValid, isVideoDescriptionValid, isVideoDurationValid, isVideoLanguageValid, isVideoLicenceValid, isVideoNameValid, isVideoOriginallyPublishedAtValid, isVideoPrivacyValid, isVideoReplayPrivacyValid, isVideoSourceFilenameValid, isVideoSupportValid, isVideoTagValid } from '../../../helpers/custom-validators/videos.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { CONFIG } from '../../../initializers/config.js';
import { CONSTRAINTS_FIELDS } from '../../../initializers/constants.js';
import { LocalVideoCreator } from '../../local-video-creator.js';
import { isLocalVideoFileAccepted } from '../../moderation.js';
import { Hooks } from '../../plugins/hooks.js';
import { isUserQuotaValid } from '../../user.js';
import { createLocalCaption, updateHLSMasterOnCaptionChange } from '../../video-captions.js';
import { buildNextVideoState } from '../../video-state.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { VideoModel } from '../../../models/video/video.js';
import { parse } from 'path';
import { AbstractUserImporter } from './abstract-user-importer.js';
const lTags = loggerTagsFactory('user-import');
export class VideosImporter extends AbstractUserImporter {
    getImportObjects(json) {
        return json.videos;
    }
    sanitize(o) {
        var _a, _b, _c;
        if (!isVideoNameValid(o.name))
            return undefined;
        if (!isVideoDurationValid(o.duration + ''))
            return undefined;
        if (!isVideoChannelUsernameValid((_a = o.channel) === null || _a === void 0 ? void 0 : _a.name))
            return undefined;
        if (!isVideoPrivacyValid(o.privacy))
            return undefined;
        if (o.isLive !== true && !((_b = o.archiveFiles) === null || _b === void 0 ? void 0 : _b.videoFile))
            return undefined;
        if (!isVideoCategoryValid(o.category))
            o.category = null;
        if (!o.licence || !isVideoLicenceValid(o.licence))
            o.licence = CONFIG.DEFAULTS.PUBLISH.LICENCE;
        if (!isVideoLanguageValid(o.language))
            o.language = null;
        if (!isVideoDescriptionValid(o.description))
            o.description = null;
        if (!isVideoSupportValid(o.support))
            o.support = null;
        if (!isBooleanValid(o.nsfw))
            o.nsfw = false;
        if (!isBooleanValid(o.isLive))
            o.isLive = false;
        if (!isBooleanValid(o.downloadEnabled))
            o.downloadEnabled = CONFIG.DEFAULTS.PUBLISH.DOWNLOAD_ENABLED;
        if (!isBooleanValid(o.waitTranscoding))
            o.waitTranscoding = true;
        if (!o.commentsPolicy || !isVideoCommentsPolicyValid(o.commentsPolicy)) {
            if (isBooleanValid(o.commentsEnabled)) {
                o.commentsPolicy = o.commentsEnabled === true
                    ? VideoCommentPolicy.ENABLED
                    : VideoCommentPolicy.DISABLED;
            }
            else {
                o.commentsPolicy = CONFIG.DEFAULTS.PUBLISH.COMMENTS_POLICY;
            }
        }
        if (!isVideoSourceFilenameValid((_c = o.source) === null || _c === void 0 ? void 0 : _c.inputFilename))
            o.source = undefined;
        if (!isVideoOriginallyPublishedAtValid(o.originallyPublishedAt))
            o.originallyPublishedAt = null;
        if (!isArray(o.tags))
            o.tags = [];
        if (!isArray(o.captions))
            o.captions = [];
        if (!isArray(o.chapters))
            o.chapters = [];
        o.tags = o.tags.filter(t => isVideoTagValid(t));
        o.captions = o.captions.filter(c => isVideoCaptionLanguageValid(c.language));
        o.chapters = o.chapters.filter(c => isVideoChapterTimecodeValid(c.timecode) && isVideoChapterTitleValid(c.title));
        if (o.isLive) {
            if (!o.live)
                return undefined;
            if (!isBooleanValid(o.live.permanentLive))
                return undefined;
            if (!isBooleanValid(o.live.saveReplay))
                o.live.saveReplay = false;
            if (o.live.saveReplay && !isVideoReplayPrivacyValid(o.live.replaySettings.privacy))
                return undefined;
            if (!o.live.latencyMode || !isLiveLatencyModeValid(o.live.latencyMode))
                o.live.latencyMode = LiveVideoLatencyMode.DEFAULT;
            if (!o.live.streamKey)
                o.live.streamKey = buildUUID();
            else if (!isUUIDValid(o.live.streamKey))
                return undefined;
        }
        if (o.privacy === VideoPrivacy.PASSWORD_PROTECTED) {
            if (!isArray(o.passwords))
                return undefined;
            if (o.passwords.some(p => !isPasswordValid(p)))
                return undefined;
        }
        return pick(o, [
            'name',
            'duration',
            'channel',
            'privacy',
            'archiveFiles',
            'category',
            'licence',
            'language',
            'description',
            'support',
            'nsfw',
            'isLive',
            'commentsPolicy',
            'downloadEnabled',
            'waitTranscoding',
            'originallyPublishedAt',
            'tags',
            'captions',
            'live',
            'passwords',
            'source',
            'chapters'
        ]);
    }
    async importObject(videoImportData) {
        var _a;
        const videoFilePath = !videoImportData.isLive
            ? this.getSafeArchivePathOrThrow(videoImportData.archiveFiles.videoFile)
            : null;
        const videoChannel = await VideoChannelModel.loadLocalByNameAndPopulateAccount(videoImportData.channel.name);
        if (!videoChannel)
            throw new Error(`Channel ${videoImportData} not found`);
        if (videoChannel.accountId !== this.user.Account.id) {
            throw new Error(`Channel ${videoChannel.name} is not owned by user ${this.user.username}`);
        }
        const existingVideo = await VideoModel.loadByNameAndChannel(videoChannel, videoImportData.name);
        if (existingVideo && Math.abs(existingVideo.duration - videoImportData.duration) <= 1) {
            logger.info(`Do not import video ${videoImportData.name} that already exists in the account`, lTags());
            return { duplicate: true };
        }
        const videoSize = videoFilePath
            ? await getFileSize(videoFilePath)
            : undefined;
        let duration = 0;
        let ffprobe;
        if (videoFilePath) {
            if (await isUserQuotaValid({ userId: this.user.id, uploadSize: videoSize, checkDaily: false }) === false) {
                throw new Error(`Cannot import video ${videoImportData.name} for user ${this.user.username} because of exceeded quota`);
            }
            await this.checkVideoFileIsAcceptedOrThrow({ videoFilePath, size: videoSize, channel: videoChannel, videoImportData });
            ffprobe = await ffprobePromise(videoFilePath);
            duration = await getVideoStreamDuration(videoFilePath, ffprobe);
        }
        const thumbnailPath = this.getSafeArchivePathOrThrow(videoImportData.archiveFiles.thumbnail);
        const thumbnails = [];
        for (const type of [ThumbnailType.MINIATURE, ThumbnailType.PREVIEW]) {
            if (!await this.isFileValidOrLog(thumbnailPath, CONSTRAINTS_FIELDS.VIDEOS.IMAGE.FILE_SIZE.max))
                continue;
            thumbnails.push({
                path: thumbnailPath,
                automaticallyGenerated: false,
                keepOriginal: true,
                type
            });
        }
        const localVideoCreator = new LocalVideoCreator({
            lTags,
            videoFile: videoFilePath
                ? { path: videoFilePath, probe: ffprobe }
                : undefined,
            user: this.user,
            channel: videoChannel,
            chapters: videoImportData.chapters,
            fallbackChapters: {
                fromDescription: false,
                finalFallback: undefined
            },
            videoAttributes: Object.assign(Object.assign({}, pick(videoImportData, [
                'name',
                'category',
                'licence',
                'language',
                'privacy',
                'description',
                'support',
                'isLive',
                'nsfw',
                'tags',
                'commentsPolicy',
                'downloadEnabled',
                'waitTranscoding',
                'originallyPublishedAt'
            ])), { videoPasswords: videoImportData.passwords, duration, inputFilename: (_a = videoImportData.source) === null || _a === void 0 ? void 0 : _a.inputFilename, state: videoImportData.isLive
                    ? VideoState.WAITING_FOR_LIVE
                    : buildNextVideoState() }),
            liveAttributes: videoImportData.live,
            videoAttributeResultHook: 'filter:api.video.user-import.video-attribute.result',
            thumbnails
        });
        const { video } = await localVideoCreator.create();
        await this.importCaptions(video, videoImportData);
        logger.info('Video %s imported.', video.name, lTags(video.uuid));
        return { duplicate: false };
    }
    async importCaptions(video, videoImportData) {
        var _a, _b;
        const captionPaths = [];
        let updateHLS = false;
        for (const captionImport of videoImportData.captions) {
            const relativeFilePath = (_b = (_a = videoImportData.archiveFiles) === null || _a === void 0 ? void 0 : _a.captions) === null || _b === void 0 ? void 0 : _b[captionImport.language];
            if (!relativeFilePath) {
                logger.warn('Cannot import caption ' + captionImport.language + ': file does not exist in the archive', lTags(video.uuid));
                continue;
            }
            const absoluteFilePath = this.getSafeArchivePathOrThrow(relativeFilePath);
            if (!await this.isFileValidOrLog(absoluteFilePath, CONSTRAINTS_FIELDS.VIDEO_CAPTIONS.CAPTION_FILE.FILE_SIZE.max))
                continue;
            const caption = await createLocalCaption({
                video,
                language: captionImport.language,
                path: absoluteFilePath,
                automaticallyGenerated: captionImport.automaticallyGenerated === true
            });
            captionPaths.push(absoluteFilePath);
            if (caption.m3u8Filename)
                updateHLS = true;
        }
        if (updateHLS && video.getHLSPlaylist()) {
            await updateHLSMasterOnCaptionChange(video, video.getHLSPlaylist());
        }
        return captionPaths;
    }
    async checkVideoFileIsAcceptedOrThrow(options) {
        const { videoFilePath, size, videoImportData, channel } = options;
        const acceptParameters = {
            videoBody: Object.assign(Object.assign({}, videoImportData), { channelId: channel.id }),
            videoFile: {
                path: videoFilePath,
                filename: parse(videoFilePath).name,
                size,
                originalname: null
            },
            user: this.user
        };
        const acceptedResult = await Hooks.wrapFun(isLocalVideoFileAccepted, acceptParameters, 'filter:api.video.user-import.accept.result');
        if (!acceptedResult || acceptedResult.accepted !== true) {
            logger.info('Refused local video file to import.', Object.assign({ acceptedResult, acceptParameters }, lTags()));
            throw new Error('Video file is not accepted: ' + acceptedResult.errorMessage || 'unknown reason');
        }
    }
}
//# sourceMappingURL=videos-importer.js.map