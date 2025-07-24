import { FFmpegCommandWrapper } from './ffmpeg-command-wrapper.js';
import { getVideoStreamDuration } from './ffprobe.js';
export class FFmpegImage {
    constructor(options) {
        this.commandWrapper = new FFmpegCommandWrapper(options);
    }
    processImage(options) {
        const { path, destination, newSize } = options;
        const command = this.commandWrapper.buildCommand(path);
        if (newSize)
            command.size(`${newSize.width}x${newSize.height}`);
        command.output(destination);
        return this.commandWrapper.runCommand({ silent: true });
    }
    async generateThumbnailFromVideo(options) {
        const { fromPath, ffprobe } = options;
        let duration = await getVideoStreamDuration(fromPath, ffprobe);
        if (isNaN(duration))
            duration = 0;
        this.buildGenerateThumbnailFromVideo(options)
            .seekInput(duration / 2);
        try {
            return await this.commandWrapper.runCommand();
        }
        catch (err) {
            this.commandWrapper.debugLog('Cannot generate thumbnail from video using seek input, fallback to no seek', { err });
            this.commandWrapper.resetCommand();
            this.buildGenerateThumbnailFromVideo(options);
            return this.commandWrapper.runCommand();
        }
    }
    buildGenerateThumbnailFromVideo(options) {
        const { fromPath, output, framesToAnalyze, scale } = options;
        const command = this.commandWrapper.buildCommand(fromPath)
            .videoFilter('thumbnail=' + framesToAnalyze)
            .outputOption('-frames:v 1')
            .outputOption('-q:v 5')
            .outputOption('-abort_on empty_output')
            .output(output);
        if (scale) {
            command.videoFilter(`scale=${scale.width}x${scale.height}:force_original_aspect_ratio=decrease`);
        }
        return command;
    }
    async generateStoryboardFromVideo(options) {
        const { path, destination, inputFileMutexReleaser, sprites } = options;
        const command = this.commandWrapper.buildCommand(path, inputFileMutexReleaser);
        const filter = [
            `setpts='N/FRAME_RATE/TB'`,
            `select='isnan(prev_selected_t)+gte(t-prev_selected_t,${options.sprites.duration})'`,
            `scale=${sprites.size.width}:${sprites.size.height}`,
            `tile=layout=${sprites.count.width}x${sprites.count.height}`
        ].join(',');
        command.outputOption('-filter_complex', filter);
        command.outputOption('-frames:v', '1');
        command.outputOption('-q:v', '2');
        command.output(destination);
        return this.commandWrapper.runCommand();
    }
}
//# sourceMappingURL=ffmpeg-images.js.map