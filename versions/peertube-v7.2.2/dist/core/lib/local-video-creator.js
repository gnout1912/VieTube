import { buildAspectRatio } from '@peertube/peertube-core-utils';
import { LiveVideoLatencyMode, NSFWFlag, ThumbnailType, VideoPrivacy } from '@peertube/peertube-models';
import { buildUUID } from '@peertube/peertube-node-utils';
import { retryTransactionWrapper } from '../helpers/database-utils.js';
import { logger } from '../helpers/logger.js';
import { CONFIG } from '../initializers/config.js';
import { sequelizeTypescript } from '../initializers/database.js';
import { ScheduleVideoUpdateModel } from '../models/video/schedule-video-update.js';
import { VideoLiveReplaySettingModel } from '../models/video/video-live-replay-setting.js';
import { VideoLiveModel } from '../models/video/video-live.js';
import { VideoPasswordModel } from '../models/video/video-password.js';
import { VideoModel } from '../models/video/video.js';
import { move } from 'fs-extra/esm';
import { getLocalVideoActivityPubUrl } from './activitypub/url.js';
import { federateVideoIfNeeded } from './activitypub/videos/federate.js';
import { AutomaticTagger } from './automatic-tags/automatic-tagger.js';
import { setAndSaveVideoAutomaticTags } from './automatic-tags/automatic-tags.js';
import { Hooks } from './plugins/hooks.js';
import { generateLocalVideoMiniature, updateLocalVideoMiniatureFromExisting } from './thumbnail.js';
import { autoBlacklistVideoIfNeeded } from './video-blacklist.js';
import { replaceChapters, replaceChaptersFromDescriptionIfNeeded } from './video-chapters.js';
import { buildNewFile, createVideoSource } from './video-file.js';
import { addVideoJobsAfterCreation } from './video-jobs.js';
import { VideoPathManager } from './video-path-manager.js';
import { buildCommentsPolicy, setVideoTags } from './video.js';
export class LocalVideoCreator {
    constructor(options) {
        var _a, _b;
        this.options = options;
        this.videoFilePath = (_a = options.videoFile) === null || _a === void 0 ? void 0 : _a.path;
        this.videoFileProbe = (_b = options.videoFile) === null || _b === void 0 ? void 0 : _b.probe;
        this.videoAttributes = options.videoAttributes;
        this.liveAttributes = options.liveAttributes;
        this.channel = options.channel;
        this.videoAttributeResultHook = options.videoAttributeResultHook;
        this.lTags = options.lTags;
    }
    async create() {
        this.video = new VideoModel(await Hooks.wrapObject(this.buildVideo(this.videoAttributes, this.channel), this.videoAttributeResultHook));
        this.video.VideoChannel = this.channel;
        this.video.url = getLocalVideoActivityPubUrl(this.video);
        if (this.videoFilePath) {
            this.videoFile = await buildNewFile({ path: this.videoFilePath, mode: 'web-video', ffprobe: this.videoFileProbe });
            this.videoPath = VideoPathManager.Instance.getFSVideoFileOutputPath(this.video, this.videoFile);
            await move(this.videoFilePath, this.videoPath);
            this.video.aspectRatio = buildAspectRatio({ width: this.videoFile.width, height: this.videoFile.height });
        }
        const thumbnails = await this.createThumbnails();
        await retryTransactionWrapper(() => {
            return sequelizeTypescript.transaction(async (transaction) => {
                var _a, _b;
                await this.video.save({ transaction });
                for (const thumbnail of thumbnails) {
                    await this.video.addAndSaveThumbnail(thumbnail, transaction);
                }
                if (this.videoFile) {
                    this.videoFile.videoId = this.video.id;
                    await this.videoFile.save({ transaction });
                    this.video.VideoFiles = [this.videoFile];
                }
                await setVideoTags({ video: this.video, tags: this.videoAttributes.tags, transaction });
                const automaticTags = await new AutomaticTagger().buildVideoAutomaticTags({ video: this.video, transaction });
                await setAndSaveVideoAutomaticTags({ video: this.video, automaticTags, transaction });
                if (this.videoAttributes.scheduleUpdate) {
                    await ScheduleVideoUpdateModel.create({
                        videoId: this.video.id,
                        updateAt: new Date(this.videoAttributes.scheduleUpdate.updateAt),
                        privacy: this.videoAttributes.scheduleUpdate.privacy || null
                    }, { transaction });
                }
                if (this.options.chapters) {
                    await replaceChapters({ video: this.video, chapters: this.options.chapters, transaction });
                }
                else if (this.options.fallbackChapters.fromDescription) {
                    if (!await replaceChaptersFromDescriptionIfNeeded({ newDescription: this.video.description, video: this.video, transaction })) {
                        await replaceChapters({ video: this.video, chapters: this.options.fallbackChapters.finalFallback, transaction });
                    }
                }
                await autoBlacklistVideoIfNeeded({
                    video: this.video,
                    user: this.options.user,
                    isRemote: false,
                    isNew: true,
                    isNewFile: true,
                    transaction
                });
                if (this.videoAttributes.privacy === VideoPrivacy.PASSWORD_PROTECTED) {
                    await VideoPasswordModel.addPasswords(this.videoAttributes.videoPasswords, this.video.id, transaction);
                }
                if (this.videoAttributes.isLive) {
                    const videoLive = new VideoLiveModel({
                        saveReplay: this.liveAttributes.saveReplay || false,
                        permanentLive: this.liveAttributes.permanentLive || false,
                        latencyMode: this.liveAttributes.latencyMode || LiveVideoLatencyMode.DEFAULT,
                        streamKey: this.liveAttributes.streamKey || buildUUID()
                    });
                    if (videoLive.saveReplay) {
                        const replaySettings = new VideoLiveReplaySettingModel({
                            privacy: (_b = (_a = this.liveAttributes.replaySettings) === null || _a === void 0 ? void 0 : _a.privacy) !== null && _b !== void 0 ? _b : this.video.privacy
                        });
                        await replaySettings.save({ transaction });
                        videoLive.replaySettingId = replaySettings.id;
                    }
                    videoLive.videoId = this.video.id;
                    this.video.VideoLive = await videoLive.save({ transaction });
                }
                if (this.videoFile) {
                    transaction.afterCommit(() => {
                        var _a;
                        addVideoJobsAfterCreation({
                            video: this.video,
                            videoFile: this.videoFile,
                            generateTranscription: (_a = this.videoAttributes.generateTranscription) !== null && _a !== void 0 ? _a : true
                        }).catch(err => logger.error('Cannot build new video jobs of %s.', this.video.uuid, Object.assign({ err }, this.lTags(this.video.uuid))));
                    });
                }
                else {
                    await federateVideoIfNeeded(this.video, true, transaction);
                }
            }).catch(err => {
                this.video.isNewRecord = true;
                if (this.videoFile)
                    this.videoFile.isNewRecord = true;
                for (const t of thumbnails) {
                    t.isNewRecord = true;
                }
                throw err;
            });
        });
        if (this.videoAttributes.inputFilename) {
            await createVideoSource({
                inputFilename: this.videoAttributes.inputFilename,
                inputPath: this.videoPath,
                inputProbe: this.videoFileProbe,
                video: this.video
            });
        }
        await this.channel.setAsUpdated();
        return { video: this.video, videoFile: this.videoFile };
    }
    async createThumbnails() {
        const promises = [];
        let toGenerate = [ThumbnailType.MINIATURE, ThumbnailType.PREVIEW];
        for (const type of [ThumbnailType.MINIATURE, ThumbnailType.PREVIEW]) {
            const thumbnail = this.options.thumbnails.find(t => t.type === type);
            if (!thumbnail)
                continue;
            promises.push(updateLocalVideoMiniatureFromExisting({
                inputPath: thumbnail.path,
                video: this.video,
                type,
                automaticallyGenerated: thumbnail.automaticallyGenerated || false,
                keepOriginal: thumbnail.keepOriginal
            }));
            toGenerate = toGenerate.filter(t => t !== thumbnail.type);
        }
        return [
            ...await Promise.all(promises),
            ...await generateLocalVideoMiniature({
                video: this.video,
                videoFile: this.videoFile,
                types: toGenerate,
                ffprobe: this.videoFileProbe
            })
        ];
    }
    buildVideo(videoInfo, channel) {
        var _a, _b;
        return {
            name: videoInfo.name,
            state: videoInfo.state,
            remote: false,
            category: videoInfo.category,
            licence: (_a = videoInfo.licence) !== null && _a !== void 0 ? _a : CONFIG.DEFAULTS.PUBLISH.LICENCE,
            language: videoInfo.language,
            commentsPolicy: buildCommentsPolicy(videoInfo),
            downloadEnabled: (_b = videoInfo.downloadEnabled) !== null && _b !== void 0 ? _b : CONFIG.DEFAULTS.PUBLISH.DOWNLOAD_ENABLED,
            waitTranscoding: videoInfo.waitTranscoding || false,
            nsfw: videoInfo.nsfw || false,
            nsfwSummary: videoInfo.nsfwSummary,
            nsfwFlags: videoInfo.nsfwFlags || NSFWFlag.NONE,
            description: videoInfo.description,
            support: videoInfo.support,
            privacy: videoInfo.privacy || VideoPrivacy.PRIVATE,
            isLive: videoInfo.isLive,
            channelId: channel.id,
            originallyPublishedAt: videoInfo.originallyPublishedAt
                ? new Date(videoInfo.originallyPublishedAt)
                : null,
            uuid: buildUUID(),
            duration: videoInfo.duration
        };
    }
}
//# sourceMappingURL=local-video-creator.js.map