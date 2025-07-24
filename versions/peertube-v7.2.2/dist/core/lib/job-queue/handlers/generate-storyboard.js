import { FFmpegImage, ffprobePromise, getVideoStreamDimensionsInfo } from '@peertube/peertube-ffmpeg';
import { VideoFileStream } from '@peertube/peertube-models';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { getFFmpegCommandWrapperOptions } from '../../../helpers/ffmpeg/index.js';
import { generateImageFilename } from '../../../helpers/image-utils.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { deleteFileAndCatch } from '../../../helpers/utils.js';
import { CONFIG } from '../../../initializers/config.js';
import { STORYBOARD } from '../../../initializers/constants.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { federateVideoIfNeeded } from '../../activitypub/videos/index.js';
import { VideoPathManager } from '../../video-path-manager.js';
import { getImageSizeFromWorker } from '../../worker/parent-process.js';
import { StoryboardModel } from '../../../models/video/storyboard.js';
import { VideoModel } from '../../../models/video/video.js';
import { join } from 'path';
const lTagsBase = loggerTagsFactory('storyboard');
async function processGenerateStoryboard(job) {
    const payload = job.data;
    const lTags = lTagsBase(payload.videoUUID);
    logger.info(`Processing generate storyboard of ${payload.videoUUID} in job ${job.id}.`, lTags);
    if (CONFIG.STORYBOARDS.ENABLED !== true) {
        logger.info(`Storyboard disabled, do not process storyboard of ${payload.videoUUID} in job ${job.id}.`, lTags);
        return;
    }
    const inputFileMutexReleaser = await VideoPathManager.Instance.lockFiles(payload.videoUUID);
    try {
        const video = await VideoModel.loadFull(payload.videoUUID);
        if (!video) {
            logger.info(`Video ${payload.videoUUID} does not exist anymore, skipping storyboard generation.`, lTags);
            return;
        }
        const inputFile = video.getMaxQualityFile(VideoFileStream.VIDEO);
        if (!inputFile) {
            logger.info(`Do not generate a storyboard of ${payload.videoUUID} since the video does not have a video stream`, lTags);
            return;
        }
        await VideoPathManager.Instance.makeAvailableVideoFile(inputFile, async (videoPath) => {
            const probe = await ffprobePromise(videoPath);
            const videoStreamInfo = await getVideoStreamDimensionsInfo(videoPath, probe);
            let spriteHeight;
            let spriteWidth;
            if (videoStreamInfo.isPortraitMode) {
                spriteHeight = STORYBOARD.SPRITE_MAX_SIZE;
                spriteWidth = Math.round(spriteHeight * videoStreamInfo.ratio);
            }
            else {
                spriteWidth = STORYBOARD.SPRITE_MAX_SIZE;
                spriteHeight = Math.round(spriteWidth / videoStreamInfo.ratio);
            }
            const ffmpeg = new FFmpegImage(getFFmpegCommandWrapperOptions('thumbnail'));
            const filename = generateImageFilename();
            const destination = join(CONFIG.STORAGE.STORYBOARDS_DIR, filename);
            const { totalSprites, spriteDuration } = buildSpritesMetadata({ video });
            if (totalSprites === 0) {
                logger.info(`Do not generate a storyboard of ${payload.videoUUID} because the video is not long enough`, lTags);
                return;
            }
            const spritesCount = findGridSize({
                toFind: totalSprites,
                maxEdgeCount: STORYBOARD.SPRITES_MAX_EDGE_COUNT
            });
            logger.debug(`Generating storyboard from video of ${video.uuid} to ${destination}`, Object.assign(Object.assign({}, lTags), { totalSprites, spritesCount, spriteDuration, videoDuration: video.duration, spriteHeight, spriteWidth }));
            await ffmpeg.generateStoryboardFromVideo({
                destination,
                path: videoPath,
                inputFileMutexReleaser,
                sprites: {
                    size: {
                        height: spriteHeight,
                        width: spriteWidth
                    },
                    count: spritesCount,
                    duration: spriteDuration
                }
            });
            const imageSize = await getImageSizeFromWorker(destination);
            await retryTransactionWrapper(() => {
                return sequelizeTypescript.transaction(async (transaction) => {
                    const videoStillExists = await VideoModel.load(video.id, transaction);
                    if (!videoStillExists) {
                        logger.info(`Video ${payload.videoUUID} does not exist anymore, skipping storyboard generation.`, lTags);
                        deleteFileAndCatch(destination);
                        return;
                    }
                    const existing = await StoryboardModel.loadByVideo(video.id, transaction);
                    if (existing)
                        await existing.destroy({ transaction });
                    await StoryboardModel.create({
                        filename,
                        totalHeight: imageSize.height,
                        totalWidth: imageSize.width,
                        spriteHeight,
                        spriteWidth,
                        spriteDuration,
                        videoId: video.id
                    }, { transaction });
                    logger.info(`Storyboard generation ${destination} ended for video ${video.uuid}.`, lTags);
                    if (payload.federate) {
                        await federateVideoIfNeeded(video, false, transaction);
                    }
                });
            });
        });
    }
    finally {
        inputFileMutexReleaser();
    }
}
export { processGenerateStoryboard };
function buildSpritesMetadata(options) {
    const { video } = options;
    if (video.duration < 3)
        return { spriteDuration: undefined, totalSprites: 0 };
    const maxSprites = Math.min(Math.ceil(video.duration), STORYBOARD.SPRITES_MAX_EDGE_COUNT * STORYBOARD.SPRITES_MAX_EDGE_COUNT);
    const spriteDuration = Math.ceil(video.duration / maxSprites);
    const totalSprites = Math.ceil(video.duration / spriteDuration);
    if (totalSprites <= STORYBOARD.SPRITES_MAX_EDGE_COUNT)
        return { spriteDuration, totalSprites };
    return { spriteDuration, totalSprites };
}
function findGridSize(options) {
    const { toFind, maxEdgeCount } = options;
    for (let i = 1; i <= maxEdgeCount; i++) {
        for (let j = i; j <= maxEdgeCount; j++) {
            if (toFind <= i * j)
                return { width: j, height: i };
        }
    }
    throw new Error(`Could not find grid size (to find: ${toFind}, max edge count: ${maxEdgeCount}`);
}
//# sourceMappingURL=generate-storyboard.js.map