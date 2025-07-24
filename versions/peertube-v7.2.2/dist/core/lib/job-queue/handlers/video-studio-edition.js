import { pick } from '@peertube/peertube-core-utils';
import { FFmpegEdition } from '@peertube/peertube-ffmpeg';
import { VideoState } from '@peertube/peertube-models';
import { buildUUID } from '@peertube/peertube-node-utils';
import { getFFmpegCommandWrapperOptions } from '../../../helpers/ffmpeg/index.js';
import { CONFIG } from '../../../initializers/config.js';
import { VideoTranscodingProfilesManager } from '../../transcoding/default-transcoding-profiles.js';
import { isUserQuotaValid } from '../../user.js';
import { VideoPathManager } from '../../video-path-manager.js';
import { approximateIntroOutroAdditionalSize, onVideoStudioEnded, safeCleanupStudioTMPFiles } from '../../video-studio.js';
import { UserModel } from '../../../models/user/user.js';
import { VideoModel } from '../../../models/video/video.js';
import { remove } from 'fs-extra/esm';
import { extname, join } from 'path';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
const lTagsBase = loggerTagsFactory('video-studio');
async function processVideoStudioEdition(job) {
    const payload = job.data;
    const lTags = lTagsBase(payload.videoUUID);
    logger.info('Process video studio edition of %s in job %s.', payload.videoUUID, job.id, lTags);
    let inputFileMutexReleaser = await VideoPathManager.Instance.lockFiles(payload.videoUUID);
    try {
        const video = await VideoModel.loadFull(payload.videoUUID);
        if (!video) {
            logger.info('Can\'t process job %d, video does not exist.', job.id, lTags);
            await safeCleanupStudioTMPFiles(payload.tasks);
            return undefined;
        }
        await checkUserQuotaOrThrow(video, payload);
        await video.reload();
        const editionResultPath = await VideoPathManager.Instance.makeAvailableMaxQualityFiles(video, async ({ videoPath: originalVideoFilePath, separatedAudioPath }) => {
            let tmpInputFilePath;
            let outputPath;
            for (const task of payload.tasks) {
                const outputFilename = buildUUID() + extname(originalVideoFilePath);
                outputPath = join(CONFIG.STORAGE.TMP_DIR, outputFilename);
                await processTask({
                    videoInputPath: tmpInputFilePath !== null && tmpInputFilePath !== void 0 ? tmpInputFilePath : originalVideoFilePath,
                    separatedAudioInputPath: tmpInputFilePath
                        ? undefined
                        : separatedAudioPath,
                    inputFileMutexReleaser,
                    video,
                    outputPath,
                    task,
                    lTags
                });
                if (tmpInputFilePath)
                    await remove(tmpInputFilePath);
                tmpInputFilePath = outputPath;
                inputFileMutexReleaser = undefined;
            }
            return outputPath;
        });
        logger.info('Video edition ended for video %s.', video.uuid, lTags);
        await onVideoStudioEnded({ video, editionResultPath, tasks: payload.tasks });
    }
    catch (err) {
        await safeCleanupStudioTMPFiles(payload.tasks);
        try {
            const video = await VideoModel.loadFull(payload.videoUUID);
            await video.setNewState(VideoState.PUBLISHED, false, undefined);
        }
        catch (err) {
            logger.error('Cannot reset video state after studio error', Object.assign({ err }, lTags));
        }
        throw err;
    }
    finally {
        if (inputFileMutexReleaser)
            inputFileMutexReleaser();
    }
}
export { processVideoStudioEdition };
const taskProcessors = {
    'add-intro': processAddIntroOutro,
    'add-outro': processAddIntroOutro,
    'cut': processCut,
    'add-watermark': processAddWatermark
};
async function processTask(options) {
    const { video, task, lTags } = options;
    logger.info('Processing %s task for video %s.', task.name, video.uuid, Object.assign({ task }, lTags));
    const processor = taskProcessors[options.task.name];
    if (!process)
        throw new Error('Unknown task ' + task.name);
    return processor(options);
}
function processAddIntroOutro(options) {
    const { task, lTags } = options;
    logger.debug('Will add intro/outro to the video.', Object.assign({ options }, lTags));
    return buildFFmpegEdition().addIntroOutro(Object.assign(Object.assign({}, pick(options, ['inputFileMutexReleaser', 'videoInputPath', 'separatedAudioInputPath', 'outputPath'])), { introOutroPath: task.options.file, type: task.name === 'add-intro'
            ? 'intro'
            : 'outro' }));
}
function processCut(options) {
    const { task, lTags } = options;
    logger.debug('Will cut the video.', Object.assign({ options }, lTags));
    return buildFFmpegEdition().cutVideo(Object.assign(Object.assign({}, pick(options, ['inputFileMutexReleaser', 'videoInputPath', 'separatedAudioInputPath', 'outputPath'])), { start: task.options.start, end: task.options.end }));
}
function processAddWatermark(options) {
    const { task, lTags } = options;
    logger.debug('Will add watermark to the video.', Object.assign({ options }, lTags));
    return buildFFmpegEdition().addWatermark(Object.assign(Object.assign({}, pick(options, ['inputFileMutexReleaser', 'videoInputPath', 'separatedAudioInputPath', 'outputPath'])), { watermarkPath: task.options.file, videoFilters: {
            watermarkSizeRatio: task.options.watermarkSizeRatio,
            horitonzalMarginRatio: task.options.horitonzalMarginRatio,
            verticalMarginRatio: task.options.verticalMarginRatio
        } }));
}
async function checkUserQuotaOrThrow(video, payload) {
    const user = await UserModel.loadByVideoId(video.id);
    const filePathFinder = (i) => payload.tasks[i].options.file;
    const additionalBytes = await approximateIntroOutroAdditionalSize(video, payload.tasks, filePathFinder);
    if (await isUserQuotaValid({ userId: user.id, uploadSize: additionalBytes }) === false) {
        throw new Error('Quota exceeded for this user to edit the video');
    }
}
function buildFFmpegEdition() {
    return new FFmpegEdition(getFFmpegCommandWrapperOptions('vod', VideoTranscodingProfilesManager.Instance.getAvailableEncoders()));
}
//# sourceMappingURL=video-studio-edition.js.map