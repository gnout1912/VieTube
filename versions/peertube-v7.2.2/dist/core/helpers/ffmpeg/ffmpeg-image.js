import { FFmpegImage } from '@peertube/peertube-ffmpeg';
import { getFFmpegCommandWrapperOptions } from './ffmpeg-options.js';
export function processImage(options) {
    return new FFmpegImage(getFFmpegCommandWrapperOptions('thumbnail')).processImage(options);
}
export function generateThumbnailFromVideo(options) {
    return new FFmpegImage(getFFmpegCommandWrapperOptions('thumbnail')).generateThumbnailFromVideo(options);
}
//# sourceMappingURL=ffmpeg-image.js.map