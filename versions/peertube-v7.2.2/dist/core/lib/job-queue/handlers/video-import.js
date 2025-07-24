import { buildAspectRatio } from '@peertube/peertube-core-utils';
import { ffprobePromise, getChaptersFromContainer, getVideoStreamDuration } from '@peertube/peertube-ffmpeg';
import { ThumbnailType, VideoImportState, VideoState } from '@peertube/peertube-models';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { YoutubeDLWrapper } from '../../../helpers/youtube-dl/index.js';
import { CONFIG } from '../../../initializers/config.js';
import { AutomaticTagger } from '../../automatic-tags/automatic-tagger.js';
import { setAndSaveVideoAutomaticTags } from '../../automatic-tags/automatic-tags.js';
import { isPostImportVideoAccepted } from '../../moderation.js';
import { Hooks } from '../../plugins/hooks.js';
import { ServerConfigManager } from '../../server-config-manager.js';
import { createOptimizeOrMergeAudioJobs } from '../../transcoding/create-transcoding-job.js';
import { isUserQuotaValid } from '../../user.js';
import { createTranscriptionTaskIfNeeded } from '../../video-captions.js';
import { replaceChaptersIfNotExist } from '../../video-chapters.js';
import { buildNewFile } from '../../video-file.js';
import { buildMoveVideoJob, buildStoryboardJobIfNeeded } from '../../video-jobs.js';
import { VideoPathManager } from '../../video-path-manager.js';
import { buildNextVideoState } from '../../video-state.js';
import { VideoCaptionModel } from '../../../models/video/video-caption.js';
import { move, remove } from 'fs-extra/esm';
import { stat } from 'fs/promises';
import { logger } from '../../../helpers/logger.js';
import { getSecureTorrentName } from '../../../helpers/utils.js';
import { createTorrentAndSetInfoHash, downloadWebTorrentVideo } from '../../../helpers/webtorrent.js';
import { CONSTRAINTS_FIELDS, JOB_TTL } from '../../../initializers/constants.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { VideoImportModel } from '../../../models/video/video-import.js';
import { VideoModel } from '../../../models/video/video.js';
import { federateVideoIfNeeded } from '../../activitypub/videos/index.js';
import { Notifier } from '../../notifier/index.js';
import { generateLocalVideoMiniature } from '../../thumbnail.js';
import { JobQueue } from '../job-queue.js';
async function processVideoImport(job) {
    const payload = job.data;
    const videoImport = await getVideoImportOrDie(payload);
    if (videoImport.state === VideoImportState.CANCELLED) {
        logger.info('Do not process import since it has been cancelled', { payload });
        return { resultType: 'success' };
    }
    videoImport.state = VideoImportState.PROCESSING;
    await videoImport.save();
    try {
        if (payload.type === 'youtube-dl')
            await processYoutubeDLImport(job, videoImport, payload);
        if (payload.type === 'magnet-uri' || payload.type === 'torrent-file')
            await processTorrentImport(job, videoImport, payload);
        return { resultType: 'success' };
    }
    catch (err) {
        if (!payload.preventException)
            throw err;
        logger.warn('Catch error in video import to send value to parent job.', { payload, err });
        return { resultType: 'error' };
    }
}
export { processVideoImport };
async function processTorrentImport(job, videoImport, payload) {
    logger.info('Processing torrent video import in job %s.', job.id);
    const options = { type: payload.type, generateTranscription: payload.generateTranscription, videoImportId: payload.videoImportId };
    const target = {
        torrentName: videoImport.torrentName ? getSecureTorrentName(videoImport.torrentName) : undefined,
        uri: videoImport.magnetUri
    };
    return processFile(() => downloadWebTorrentVideo(target, JOB_TTL['video-import']), videoImport, options);
}
async function processYoutubeDLImport(job, videoImport, payload) {
    logger.info('Processing youtubeDL video import in job %s.', job.id);
    const options = { type: payload.type, generateTranscription: payload.generateTranscription, videoImportId: videoImport.id };
    const youtubeDL = new YoutubeDLWrapper(videoImport.targetUrl, ServerConfigManager.Instance.getEnabledResolutions('vod'), CONFIG.TRANSCODING.ALWAYS_TRANSCODE_ORIGINAL_RESOLUTION);
    return processFile(() => youtubeDL.downloadVideo(payload.fileExt, JOB_TTL['video-import']), videoImport, options);
}
async function getVideoImportOrDie(payload) {
    const videoImport = await VideoImportModel.loadAndPopulateVideo(payload.videoImportId);
    if (!(videoImport === null || videoImport === void 0 ? void 0 : videoImport.Video)) {
        throw new Error(`Cannot import video ${payload.videoImportId}: the video import or video linked to this import does not exist anymore.`);
    }
    return videoImport;
}
async function processFile(downloader, videoImport, options) {
    let tmpVideoPath;
    let videoFile;
    try {
        tmpVideoPath = await downloader();
        const stats = await stat(tmpVideoPath);
        const isAble = await isUserQuotaValid({ userId: videoImport.User.id, uploadSize: stats.size });
        if (isAble === false) {
            throw new Error('The user video quota is exceeded with this video to import.');
        }
        const ffprobe = await ffprobePromise(tmpVideoPath);
        const duration = await getVideoStreamDuration(tmpVideoPath, ffprobe);
        const containerChapters = await getChaptersFromContainer({
            path: tmpVideoPath,
            maxTitleLength: CONSTRAINTS_FIELDS.VIDEO_CHAPTERS.TITLE.max,
            ffprobe
        });
        videoFile = await buildNewFile({ mode: 'web-video', ffprobe, path: tmpVideoPath });
        videoFile.videoId = videoImport.videoId;
        const hookName = options.type === 'youtube-dl'
            ? 'filter:api.video.post-import-url.accept.result'
            : 'filter:api.video.post-import-torrent.accept.result';
        const acceptParameters = {
            videoImport,
            video: videoImport.Video,
            videoFilePath: tmpVideoPath,
            videoFile: videoFile,
            user: videoImport.User
        };
        const acceptedResult = await Hooks.wrapFun(isPostImportVideoAccepted, acceptParameters, hookName);
        if (acceptedResult.accepted !== true) {
            logger.info('Refused imported video.', { acceptedResult, acceptParameters });
            videoImport.state = VideoImportState.REJECTED;
            await videoImport.save();
            throw new Error(acceptedResult.errorMessage);
        }
        const videoFileLockReleaser = await VideoPathManager.Instance.lockFiles(videoImport.Video.uuid);
        try {
            const videoImportWithFiles = await refreshVideoImportFromDB(videoImport, videoFile);
            const videoDestFile = VideoPathManager.Instance.getFSVideoFileOutputPath(videoImportWithFiles.Video, videoFile);
            await move(tmpVideoPath, videoDestFile);
            tmpVideoPath = null;
            const thumbnails = await generateMiniature({ videoImportWithFiles, videoFile, ffprobe });
            await createTorrentAndSetInfoHash(videoImportWithFiles.Video, videoFile);
            const { videoImportUpdated, video } = await retryTransactionWrapper(() => {
                return sequelizeTypescript.transaction(async (t) => {
                    const video = await VideoModel.load(videoImportWithFiles.videoId, t);
                    if (!video)
                        throw new Error('Video linked to import ' + videoImportWithFiles.videoId + ' does not exist anymore.');
                    await videoFile.save({ transaction: t });
                    video.duration = duration;
                    video.state = buildNextVideoState(video.state);
                    video.aspectRatio = buildAspectRatio({ width: videoFile.width, height: videoFile.height });
                    await video.save({ transaction: t });
                    for (const thumbnail of thumbnails) {
                        await video.addAndSaveThumbnail(thumbnail, t);
                    }
                    await replaceChaptersIfNotExist({ video, chapters: containerChapters, transaction: t });
                    const automaticTags = await new AutomaticTagger().buildVideoAutomaticTags({ video, transaction: t });
                    await setAndSaveVideoAutomaticTags({ video, automaticTags, transaction: t });
                    const videoForFederation = await VideoModel.loadFull(video.uuid, t);
                    await federateVideoIfNeeded(videoForFederation, true, t);
                    videoImportWithFiles.state = VideoImportState.SUCCESS;
                    const videoImportUpdated = await videoImportWithFiles.save({ transaction: t });
                    logger.info('Video %s imported.', video.uuid);
                    return { videoImportUpdated, video: videoForFederation };
                });
            });
            await afterImportSuccess({
                videoImport: videoImportUpdated,
                video,
                videoFile,
                user: videoImport.User,
                generateTranscription: options.generateTranscription,
                videoFileAlreadyLocked: true
            });
        }
        finally {
            videoFileLockReleaser();
        }
    }
    catch (err) {
        await onImportError(err, tmpVideoPath, videoImport);
        throw err;
    }
}
async function refreshVideoImportFromDB(videoImport, videoFile) {
    const video = await videoImport.Video.reload();
    const videoWithFiles = Object.assign(video, { VideoFiles: [videoFile], VideoStreamingPlaylists: [] });
    return Object.assign(videoImport, { Video: videoWithFiles });
}
async function generateMiniature(options) {
    const { ffprobe, videoFile, videoImportWithFiles } = options;
    const thumbnailsToGenerate = [];
    if (!videoImportWithFiles.Video.getMiniature()) {
        thumbnailsToGenerate.push(ThumbnailType.MINIATURE);
    }
    if (!videoImportWithFiles.Video.getPreview()) {
        thumbnailsToGenerate.push(ThumbnailType.PREVIEW);
    }
    return generateLocalVideoMiniature({
        video: videoImportWithFiles.Video,
        videoFile,
        types: thumbnailsToGenerate,
        ffprobe
    });
}
async function afterImportSuccess(options) {
    const { video, videoFile, videoImport, user, generateTranscription, videoFileAlreadyLocked } = options;
    Notifier.Instance.notifyOnFinishedVideoImport({ videoImport: Object.assign(videoImport, { Video: video }), success: true });
    if (video.isBlacklisted()) {
        const videoBlacklist = Object.assign(video.VideoBlacklist, { Video: video });
        Notifier.Instance.notifyOnVideoAutoBlacklist(videoBlacklist);
    }
    else {
        Notifier.Instance.notifyOnNewVideoOrLiveIfNeeded(video);
    }
    await JobQueue.Instance.createJob(buildStoryboardJobIfNeeded({ video, federate: true }));
    if (await VideoCaptionModel.hasVideoCaption(video.id) !== true && generateTranscription === true) {
        await createTranscriptionTaskIfNeeded(video);
    }
    if (video.state === VideoState.TO_MOVE_TO_EXTERNAL_STORAGE) {
        await JobQueue.Instance.createJob(await buildMoveVideoJob({ video, previousVideoState: VideoState.TO_IMPORT, type: 'move-to-object-storage' }));
        return;
    }
    if (video.state === VideoState.TO_TRANSCODE) {
        await createOptimizeOrMergeAudioJobs({ video, videoFile, isNewVideo: true, user, videoFileAlreadyLocked });
    }
}
async function onImportError(err, tempVideoPath, videoImport) {
    try {
        if (tempVideoPath)
            await remove(tempVideoPath);
    }
    catch (errUnlink) {
        logger.warn('Cannot cleanup files after a video import error.', { err: errUnlink });
    }
    videoImport.error = err.message;
    if (videoImport.state !== VideoImportState.REJECTED) {
        videoImport.state = VideoImportState.FAILED;
    }
    await videoImport.save();
    Notifier.Instance.notifyOnFinishedVideoImport({ videoImport, success: false });
}
//# sourceMappingURL=video-import.js.map