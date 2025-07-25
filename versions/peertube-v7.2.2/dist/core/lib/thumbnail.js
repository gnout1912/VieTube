import { ThumbnailType, VideoFileStream } from '@peertube/peertube-models';
import { generateThumbnailFromVideo } from '../helpers/ffmpeg/ffmpeg-image.js';
import { logger, loggerTagsFactory } from '../helpers/logger.js';
import Bluebird from 'bluebird';
import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { generateImageFilename } from '../helpers/image-utils.js';
import { CONFIG } from '../initializers/config.js';
import { ASSETS_PATH, PREVIEWS_SIZE, THUMBNAILS_SIZE } from '../initializers/constants.js';
import { ThumbnailModel } from '../models/video/thumbnail.js';
import { VideoPathManager } from './video-path-manager.js';
import { downloadImageFromWorker, processImageFromWorker } from './worker/parent-process.js';
const lTags = loggerTagsFactory('thumbnail');
export function updateLocalPlaylistMiniatureFromExisting(options) {
    const { inputPath, playlist, automaticallyGenerated, keepOriginal = false, size } = options;
    const { filename, outputPath, height, width, existingThumbnail } = buildMetadataFromPlaylist(playlist, size);
    const type = ThumbnailType.MINIATURE;
    const thumbnailCreator = () => {
        return processImageFromWorker({ path: inputPath, destination: outputPath, newSize: { width, height }, keepOriginal });
    };
    return updateThumbnailFromFunction({
        thumbnailCreator,
        filename,
        height,
        width,
        type,
        automaticallyGenerated,
        onDisk: true,
        existingThumbnail
    });
}
export function updateRemotePlaylistMiniatureFromUrl(options) {
    const { downloadUrl, playlist, size } = options;
    const { filename, basePath, height, width, existingThumbnail } = buildMetadataFromPlaylist(playlist, size);
    const type = ThumbnailType.MINIATURE;
    const fileUrl = playlist.isOwned()
        ? null
        : downloadUrl;
    const thumbnailCreator = () => {
        return downloadImageFromWorker({ url: downloadUrl, destDir: basePath, destName: filename, size: { width, height } });
    };
    return updateThumbnailFromFunction({ thumbnailCreator, filename, height, width, type, existingThumbnail, fileUrl, onDisk: true });
}
export function updateLocalVideoMiniatureFromExisting(options) {
    const { inputPath, video, type, automaticallyGenerated, size, keepOriginal = false } = options;
    const { filename, outputPath, height, width, existingThumbnail } = buildMetadataFromVideo(video, type, size);
    const thumbnailCreator = () => {
        return processImageFromWorker({ path: inputPath, destination: outputPath, newSize: { width, height }, keepOriginal });
    };
    return updateThumbnailFromFunction({
        thumbnailCreator,
        filename,
        height,
        width,
        type,
        automaticallyGenerated,
        existingThumbnail,
        onDisk: true
    });
}
export function generateLocalVideoMiniature(options) {
    const { video, videoFile, types, ffprobe } = options;
    if (types.length === 0)
        return Promise.resolve([]);
    return VideoPathManager.Instance.makeAvailableVideoFile(videoFile.withVideoOrPlaylist(video), input => {
        const metadatas = types.map(type => buildMetadataFromVideo(video, type))
            .sort((a, b) => {
            if (a.height < b.height)
                return 1;
            if (a.height === b.height)
                return 0;
            return -1;
        });
        let biggestImagePath;
        return Bluebird.mapSeries(metadatas, metadata => {
            const { filename, basePath, height, width, existingThumbnail, outputPath, type } = metadata;
            let thumbnailCreator;
            if (videoFile.isAudio()) {
                thumbnailCreator = () => processImageFromWorker({
                    path: ASSETS_PATH.DEFAULT_AUDIO_BACKGROUND,
                    destination: outputPath,
                    newSize: { width, height },
                    keepOriginal: true
                });
            }
            else if (biggestImagePath) {
                thumbnailCreator = () => processImageFromWorker({
                    path: biggestImagePath,
                    destination: outputPath,
                    newSize: { width, height },
                    keepOriginal: true
                });
            }
            else {
                thumbnailCreator = () => generateImageFromVideoFile({
                    fromPath: input,
                    folder: basePath,
                    imageName: filename,
                    size: { height, width },
                    ffprobe
                });
            }
            if (!biggestImagePath)
                biggestImagePath = outputPath;
            return updateThumbnailFromFunction({
                thumbnailCreator,
                filename,
                height,
                width,
                type,
                automaticallyGenerated: true,
                onDisk: true,
                existingThumbnail
            });
        });
    });
}
export function updateLocalVideoMiniatureFromUrl(options) {
    const { downloadUrl, video, type, size } = options;
    const { filename: updatedFilename, basePath, height, width, existingThumbnail } = buildMetadataFromVideo(video, type, size);
    const fileUrl = video.isOwned()
        ? null
        : downloadUrl;
    const thumbnailUrlChanged = hasThumbnailUrlChanged(existingThumbnail, downloadUrl, video);
    const filename = thumbnailUrlChanged
        ? updatedFilename
        : existingThumbnail.filename;
    const thumbnailCreator = () => {
        if (thumbnailUrlChanged) {
            return downloadImageFromWorker({ url: downloadUrl, destDir: basePath, destName: filename, size: { width, height } });
        }
        return Promise.resolve();
    };
    return updateThumbnailFromFunction({ thumbnailCreator, filename, height, width, type, existingThumbnail, fileUrl, onDisk: true });
}
export function updateRemoteVideoThumbnail(options) {
    const { fileUrl, video, type, size, onDisk } = options;
    const { filename: generatedFilename, height, width, existingThumbnail } = buildMetadataFromVideo(video, type, size);
    const thumbnail = existingThumbnail || new ThumbnailModel();
    if (hasThumbnailUrlChanged(existingThumbnail, fileUrl, video)) {
        thumbnail.previousThumbnailFilename = thumbnail.filename;
        thumbnail.filename = generatedFilename;
    }
    thumbnail.height = height;
    thumbnail.width = width;
    thumbnail.type = type;
    thumbnail.fileUrl = fileUrl;
    thumbnail.onDisk = onDisk;
    return thumbnail;
}
export async function regenerateMiniaturesIfNeeded(video, ffprobe) {
    const thumbnailsToGenerate = [];
    if (video.getMiniature().automaticallyGenerated === true) {
        thumbnailsToGenerate.push(ThumbnailType.MINIATURE);
    }
    if (video.getPreview().automaticallyGenerated === true) {
        thumbnailsToGenerate.push(ThumbnailType.PREVIEW);
    }
    const models = await generateLocalVideoMiniature({
        video,
        videoFile: video.getMaxQualityFile(VideoFileStream.VIDEO) || video.getMaxQualityFile(VideoFileStream.AUDIO),
        ffprobe,
        types: thumbnailsToGenerate
    });
    for (const model of models) {
        await video.addAndSaveThumbnail(model);
    }
}
function hasThumbnailUrlChanged(existingThumbnail, downloadUrl, video) {
    const existingUrl = existingThumbnail
        ? existingThumbnail.fileUrl
        : null;
    return !existingUrl || existingUrl !== downloadUrl || downloadUrl.endsWith(`${video.uuid}.jpg`);
}
function buildMetadataFromPlaylist(playlist, size) {
    const filename = playlist.generateThumbnailName();
    const basePath = CONFIG.STORAGE.THUMBNAILS_DIR;
    return {
        filename,
        basePath,
        existingThumbnail: playlist.Thumbnail,
        outputPath: join(basePath, filename),
        height: size ? size.height : THUMBNAILS_SIZE.height,
        width: size ? size.width : THUMBNAILS_SIZE.width
    };
}
function buildMetadataFromVideo(video, type, size) {
    const existingThumbnail = Array.isArray(video.Thumbnails)
        ? video.Thumbnails.find(t => t.type === type)
        : undefined;
    if (type === ThumbnailType.MINIATURE) {
        const filename = generateImageFilename();
        const basePath = CONFIG.STORAGE.THUMBNAILS_DIR;
        return {
            type,
            filename,
            basePath,
            existingThumbnail,
            outputPath: join(basePath, filename),
            height: size ? size.height : THUMBNAILS_SIZE.height,
            width: size ? size.width : THUMBNAILS_SIZE.width
        };
    }
    if (type === ThumbnailType.PREVIEW) {
        const filename = generateImageFilename();
        const basePath = CONFIG.STORAGE.PREVIEWS_DIR;
        return {
            type,
            filename,
            basePath,
            existingThumbnail,
            outputPath: join(basePath, filename),
            height: size ? size.height : PREVIEWS_SIZE.height,
            width: size ? size.width : PREVIEWS_SIZE.width
        };
    }
    return undefined;
}
async function updateThumbnailFromFunction(parameters) {
    const { thumbnailCreator, filename, width, height, type, existingThumbnail, onDisk, automaticallyGenerated = null, fileUrl = null } = parameters;
    const oldFilename = existingThumbnail && existingThumbnail.filename !== filename
        ? existingThumbnail.filename
        : undefined;
    const thumbnail = existingThumbnail || new ThumbnailModel();
    thumbnail.filename = filename;
    thumbnail.height = height;
    thumbnail.width = width;
    thumbnail.type = type;
    thumbnail.fileUrl = fileUrl;
    thumbnail.automaticallyGenerated = automaticallyGenerated;
    thumbnail.onDisk = onDisk;
    if (oldFilename)
        thumbnail.previousThumbnailFilename = oldFilename;
    await thumbnailCreator();
    return thumbnail;
}
async function generateImageFromVideoFile(options) {
    const { fromPath, folder, imageName, size, ffprobe } = options;
    const pendingImageName = 'pending-' + imageName;
    const pendingImagePath = join(folder, pendingImageName);
    try {
        const framesToAnalyze = CONFIG.THUMBNAILS.GENERATION_FROM_VIDEO.FRAMES_TO_ANALYZE;
        await generateThumbnailFromVideo({ fromPath, output: pendingImagePath, framesToAnalyze, ffprobe, scale: size });
        const destination = join(folder, imageName);
        await processImageFromWorker({ path: pendingImagePath, destination, newSize: size });
        return destination;
    }
    catch (err) {
        logger.error('Cannot generate image from video %s.', fromPath, Object.assign({ err }, lTags()));
        try {
            await remove(pendingImagePath);
        }
        catch (err) {
            logger.debug('Cannot remove pending image path after generation error.', Object.assign({ err }, lTags()));
        }
        throw err;
    }
}
//# sourceMappingURL=thumbnail.js.map