import { isVideoMissHLSAudio } from '../../runners/job-handlers/shared/utils.js';
import { onTranscodingEnded } from '../../transcoding/ended-transcoding.js';
import { generateHlsPlaylistResolution } from '../../transcoding/hls-transcoding.js';
import { mergeAudioVideofile, optimizeOriginalVideofile, transcodeNewWebVideoResolution } from '../../transcoding/web-transcoding.js';
import { removeAllWebVideoFiles } from '../../video-file.js';
import { VideoPathManager } from '../../video-path-manager.js';
import { moveToFailedTranscodingState } from '../../video-state.js';
import { UserModel } from '../../../models/user/user.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { VideoModel } from '../../../models/video/video.js';
const handlers = {
    'new-resolution-to-hls': handleHLSJob,
    'new-resolution-to-web-video': handleNewWebVideoResolutionJob,
    'merge-audio-to-web-video': handleWebVideoMergeAudioJob,
    'optimize-to-web-video': handleWebVideoOptimizeJob
};
const lTags = loggerTagsFactory('transcoding');
async function processVideoTranscoding(job) {
    const payload = job.data;
    logger.info('Processing transcoding job %s.', job.id, lTags(payload.videoUUID));
    const video = await VideoModel.loadFull(payload.videoUUID);
    if (!video) {
        logger.info(`Do not process job ${job.id}, video does not exist.`, lTags(payload.videoUUID));
        return undefined;
    }
    const user = await UserModel.loadByChannelActorId(video.VideoChannel.actorId);
    const handler = handlers[payload.type];
    if (!handler) {
        await moveToFailedTranscodingState(video);
        await VideoJobInfoModel.decrease(video.uuid, 'pendingTranscode');
        throw new Error('Cannot find transcoding handler for ' + payload.type);
    }
    try {
        await handler(job, payload, video, user);
    }
    catch (error) {
        await moveToFailedTranscodingState(video);
        await VideoJobInfoModel.decrease(video.uuid, 'pendingTranscode');
        throw error;
    }
    return video;
}
export { processVideoTranscoding };
async function handleWebVideoMergeAudioJob(job, payload, video, user) {
    logger.info('Handling merge audio transcoding job for %s.', video.uuid, lTags(video.uuid), { payload });
    await mergeAudioVideofile({ video, resolution: payload.resolution, fps: payload.fps, job });
    logger.info('Merge audio transcoding job for %s ended.', video.uuid, lTags(video.uuid), { payload });
    await onTranscodingEnded({ isNewVideo: payload.isNewVideo, moveVideoToNextState: !payload.hasChildren, video });
}
async function handleWebVideoOptimizeJob(job, payload, video, user) {
    logger.info('Handling optimize transcoding job for %s.', video.uuid, lTags(video.uuid), { payload });
    await optimizeOriginalVideofile({ video, quickTranscode: payload.quickTranscode, job });
    logger.info('Optimize transcoding job for %s ended.', video.uuid, lTags(video.uuid), { payload });
    await onTranscodingEnded({ isNewVideo: payload.isNewVideo, moveVideoToNextState: !payload.hasChildren, video });
}
async function handleNewWebVideoResolutionJob(job, payload, video) {
    logger.info('Handling Web Video transcoding job for %s.', video.uuid, lTags(video.uuid), { payload });
    await transcodeNewWebVideoResolution({ video, resolution: payload.resolution, fps: payload.fps, job });
    logger.info('Web Video transcoding job for %s ended.', video.uuid, lTags(video.uuid), { payload });
    await onTranscodingEnded({ isNewVideo: payload.isNewVideo, moveVideoToNextState: !payload.hasChildren, video });
}
async function handleHLSJob(job, payload, videoArg) {
    logger.info('Handling HLS transcoding job for %s.', videoArg.uuid, lTags(videoArg.uuid), { payload });
    const inputFileMutexReleaser = await VideoPathManager.Instance.lockFiles(videoArg.uuid);
    let video;
    try {
        video = await VideoModel.loadFull(videoArg.uuid);
        const { videoFile, separatedAudioFile } = video.getMaxQualityAudioAndVideoFiles();
        const videoFileInputs = payload.copyCodecs
            ? [video.getWebVideoFileMinResolution(payload.resolution)]
            : [videoFile, separatedAudioFile].filter(v => !!v);
        await VideoPathManager.Instance.makeAvailableVideoFiles(videoFileInputs, ([videoPath, separatedAudioPath]) => {
            return generateHlsPlaylistResolution({
                video,
                videoInputPath: videoPath,
                separatedAudioInputPath: separatedAudioPath,
                inputFileMutexReleaser,
                resolution: payload.resolution,
                fps: payload.fps,
                copyCodecs: payload.copyCodecs,
                separatedAudio: payload.separatedAudio,
                job
            });
        });
    }
    finally {
        inputFileMutexReleaser();
    }
    logger.info('HLS transcoding job for %s ended.', video.uuid, lTags(video.uuid), { payload });
    if (payload.deleteWebVideoFiles === true) {
        logger.info('Removing Web Video files of %s now we have a HLS version of it.', video.uuid, lTags(video.uuid));
        await removeAllWebVideoFiles(video);
    }
    let moveVideoToNextState = !payload.hasChildren;
    if (await isVideoMissHLSAudio({ resolution: payload.resolution, separatedAudio: payload.separatedAudio, videoId: videoArg.uuid })) {
        moveVideoToNextState = false;
    }
    await onTranscodingEnded({ isNewVideo: payload.isNewVideo, moveVideoToNextState, video });
}
//# sourceMappingURL=video-transcoding.js.map