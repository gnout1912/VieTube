import { ColorActionName } from '@jimp/plugin-color';
import { buildUUID, getLowercaseExtension } from '@peertube/peertube-node-utils';
import { copy, remove } from 'fs-extra/esm';
import { readFile } from 'fs/promises';
import { processImage as processImageByFFmpeg } from './ffmpeg/index.js';
import { logger } from './logger.js';
export function generateImageFilename(extension = '.jpg') {
    return buildUUID() + extension;
}
export async function processImage(options) {
    const { path, destination, newSize, keepOriginal = false } = options;
    const extension = getLowercaseExtension(path);
    if (path === destination) {
        throw new Error('Jimp/FFmpeg needs an input path different that the output path.');
    }
    logger.debug('Processing image %s to %s.', path, destination);
    if (extension === '.gif' || extension === '.webp') {
        await processImageByFFmpeg({ path, destination, newSize });
    }
    else {
        await jimpProcessor({ path, destination, newSize, inputExt: extension });
    }
    if (keepOriginal !== true)
        await remove(path);
    logger.debug('Finished processing image %s to %s.', path, destination);
}
export async function getImageSize(path) {
    const inputBuffer = await readFile(path);
    const Jimp = await import('jimp');
    const image = await Jimp.default.read(inputBuffer);
    return {
        width: image.getWidth(),
        height: image.getHeight()
    };
}
async function jimpProcessor(options) {
    const { path, newSize, inputExt, destination } = options;
    const inputBuffer = await readFile(path);
    const Jimp = await import('jimp');
    const sourceImage = await Jimp.default.read(inputBuffer);
    await remove(destination);
    if (skipProcessing({
        sourceImage,
        newSize,
        imageBytes: inputBuffer.byteLength,
        inputExt,
        outputExt: getLowercaseExtension(destination)
    })) {
        return copy(path, destination);
    }
    if (newSize) {
        await autoResize({ sourceImage, newSize, destination });
    }
    else {
        await write(sourceImage, destination);
    }
}
async function autoResize(options) {
    const { sourceImage, newSize, destination } = options;
    const sourceIsPortrait = sourceImage.getWidth() <= sourceImage.getHeight();
    const destIsPortraitOrSquare = newSize.width <= newSize.height;
    removeExif(sourceImage);
    if (sourceIsPortrait && !destIsPortraitOrSquare) {
        const baseImage = sourceImage.cloneQuiet().cover(newSize.width, newSize.height)
            .color([{ apply: ColorActionName.SHADE, params: [50] }]);
        const topImage = sourceImage.cloneQuiet().contain(newSize.width, newSize.height);
        return write(baseImage.blit(topImage, 0, 0), destination);
    }
    return write(sourceImage.cover(newSize.width, newSize.height), destination);
}
function write(image, destination) {
    return image.quality(80).writeAsync(destination);
}
function skipProcessing(options) {
    const { sourceImage, newSize, imageBytes, inputExt, outputExt } = options;
    if (hasExif(sourceImage))
        return false;
    if (newSize && (sourceImage.getWidth() !== newSize.width || sourceImage.getHeight() !== newSize.height))
        return false;
    if (inputExt !== outputExt)
        return false;
    const kB = 1000;
    if (newSize) {
        if (newSize.height >= 1000)
            return imageBytes <= 200 * kB;
        if (newSize.height >= 500)
            return imageBytes <= 100 * kB;
    }
    return imageBytes <= 15 * kB;
}
function hasExif(image) {
    return !!image.bitmap.exifBuffer;
}
function removeExif(image) {
    ;
    image.bitmap.exifBuffer = null;
}
//# sourceMappingURL=image-utils.js.map