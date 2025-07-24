import { pick } from '@peertube/peertube-core-utils';
import { readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { FFmpegCommandWrapper } from './ffmpeg-command-wrapper.js';
import { ffprobePromise, getVideoStreamDimensionsInfo } from './ffprobe.js';
import { presetCopy, presetVOD } from './shared/presets.js';
export class FFmpegVOD {
    constructor(options) {
        this.ended = false;
        this.commandWrapper = new FFmpegCommandWrapper(options);
    }
    async transcode(options) {
        const builders = {
            'quick-transcode': this.buildQuickTranscodeCommand.bind(this),
            'hls': this.buildHLSVODCommand.bind(this),
            'hls-from-ts': this.buildHLSVODFromTSCommand.bind(this),
            'merge-audio': this.buildAudioMergeCommand.bind(this),
            'video': this.buildVODCommand.bind(this)
        };
        this.commandWrapper.debugLog('Will run transcode.', { options });
        const inputPaths = [options.videoInputPath, options.separatedAudioInputPath].filter(e => !!e);
        this.commandWrapper.buildCommand(inputPaths, options.inputFileMutexReleaser)
            .output(options.outputPath);
        await builders[options.type](options);
        await this.commandWrapper.runCommand();
        await this.fixHLSPlaylistIfNeeded(options);
        this.ended = true;
    }
    isEnded() {
        return this.ended;
    }
    async buildVODCommand(options) {
        const { resolution, fps, videoInputPath, separatedAudioInputPath, videoStreamOnly = false, canCopyAudio = true, canCopyVideo = true } = options;
        let scaleFilterValue;
        if (resolution) {
            const probe = await ffprobePromise(videoInputPath);
            const videoStreamInfo = await getVideoStreamDimensionsInfo(videoInputPath, probe);
            scaleFilterValue = (videoStreamInfo === null || videoStreamInfo === void 0 ? void 0 : videoStreamInfo.isPortraitMode) === true
                ? `w=${resolution}:h=-2`
                : `w=-2:h=${resolution}`;
        }
        await presetVOD({
            commandWrapper: this.commandWrapper,
            resolution,
            videoStreamOnly,
            videoInputPath,
            separatedAudioInputPath,
            canCopyAudio,
            canCopyVideo,
            fps,
            scaleFilterValue
        });
    }
    buildQuickTranscodeCommand(_options) {
        const command = this.commandWrapper.getCommand();
        presetCopy(this.commandWrapper);
        command.outputOption('-map_metadata -1')
            .outputOption('-movflags faststart');
    }
    async buildAudioMergeCommand(options) {
        const command = this.commandWrapper.getCommand();
        command.loop(undefined);
        await presetVOD(Object.assign(Object.assign({}, pick(options, ['resolution'])), { commandWrapper: this.commandWrapper, videoInputPath: options.audioPath, canCopyAudio: true, canCopyVideo: true, videoStreamOnly: false, fps: options.fps, scaleFilterValue: this.getMergeAudioScaleFilterValue() }));
        command.outputOption('-preset:v veryfast');
        command.input(options.audioPath)
            .outputOption('-tune stillimage')
            .outputOption('-shortest');
    }
    getMergeAudioScaleFilterValue() {
        return 'trunc(iw/2)*2:trunc(ih/2)*2';
    }
    async buildHLSVODCommand(options) {
        const command = this.commandWrapper.getCommand();
        const videoPath = this.getHLSVideoPath(options);
        if (options.copyCodecs) {
            presetCopy(this.commandWrapper, {
                withAudio: !options.separatedAudio || !options.resolution,
                withVideo: !options.separatedAudio || !!options.resolution
            });
        }
        else {
            await this.buildVODCommand(Object.assign(Object.assign({}, options), { canCopyAudio: false, canCopyVideo: false, videoStreamOnly: options.separatedAudio && !!options.resolution }));
        }
        this.addCommonHLSVODCommandOptions(command, videoPath);
    }
    buildHLSVODFromTSCommand(options) {
        const command = this.commandWrapper.getCommand();
        const videoPath = this.getHLSVideoPath(options);
        command.outputOption('-c copy');
        command.outputOption('-copyts');
        if (options.isAAC) {
            command.outputOption('-bsf:a aac_adtstoasc');
        }
        this.addCommonHLSVODCommandOptions(command, videoPath);
    }
    addCommonHLSVODCommandOptions(command, outputPath) {
        return command.outputOption('-hls_time 4')
            .outputOption('-hls_list_size 0')
            .outputOption('-hls_playlist_type vod')
            .outputOption('-hls_segment_filename ' + outputPath)
            .outputOption('-hls_segment_type fmp4')
            .outputOption('-f hls')
            .outputOption('-hls_flags single_file');
    }
    async fixHLSPlaylistIfNeeded(options) {
        if (options.type !== 'hls' && options.type !== 'hls-from-ts')
            return;
        const fileContent = await readFile(options.outputPath);
        const videoFileName = options.hlsPlaylist.videoFilename;
        const videoFilePath = this.getHLSVideoPath(options);
        const newContent = fileContent.toString()
            .replace(`#EXT-X-MAP:URI="${videoFilePath}",`, `#EXT-X-MAP:URI="${videoFileName}",`);
        await writeFile(options.outputPath, newContent);
    }
    getHLSVideoPath(options) {
        return `${dirname(options.outputPath)}/${options.hlsPlaylist.videoFilename}`;
    }
}
//# sourceMappingURL=ffmpeg-vod.js.map