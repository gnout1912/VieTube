import { FFmpegCommandWrapper } from './ffmpeg-command-wrapper.js';
import { ffprobePromise, getVideoStreamDimensionsInfo, getVideoStreamDuration, getVideoStreamFPS, hasAudioStream } from './ffprobe.js';
import { presetVOD } from './shared/presets.js';
export class FFmpegEdition {
    constructor(options) {
        this.commandWrapper = new FFmpegCommandWrapper(options);
    }
    async cutVideo(options) {
        const { videoInputPath, separatedAudioInputPath, outputPath, inputFileMutexReleaser } = options;
        const mainProbe = await ffprobePromise(videoInputPath);
        const fps = await getVideoStreamFPS(videoInputPath, mainProbe);
        const { resolution } = await getVideoStreamDimensionsInfo(videoInputPath, mainProbe);
        const command = this.commandWrapper.buildCommand(this.buildInputs(options), inputFileMutexReleaser)
            .output(outputPath);
        await presetVOD({
            commandWrapper: this.commandWrapper,
            videoInputPath,
            separatedAudioInputPath,
            resolution,
            videoStreamOnly: false,
            fps,
            canCopyAudio: false,
            canCopyVideo: false
        });
        if (options.start) {
            command.outputOption('-ss ' + options.start);
        }
        if (options.end) {
            command.outputOption('-to ' + options.end);
        }
        await this.commandWrapper.runCommand();
    }
    async addWatermark(options) {
        const { watermarkPath, videoInputPath, separatedAudioInputPath, outputPath, videoFilters, inputFileMutexReleaser } = options;
        const videoProbe = await ffprobePromise(videoInputPath);
        const fps = await getVideoStreamFPS(videoInputPath, videoProbe);
        const { resolution, height } = await getVideoStreamDimensionsInfo(videoInputPath, videoProbe);
        const command = this.commandWrapper.buildCommand([...this.buildInputs(options), watermarkPath], inputFileMutexReleaser)
            .output(outputPath);
        await presetVOD({
            commandWrapper: this.commandWrapper,
            videoInputPath,
            separatedAudioInputPath,
            resolution,
            videoStreamOnly: false,
            fps,
            canCopyAudio: true,
            canCopyVideo: false
        });
        const videoInput = 0;
        const imageInput = separatedAudioInputPath
            ? 2
            : 1;
        const complexFilter = [
            {
                inputs: [`[${imageInput}]`],
                filter: 'scale',
                options: {
                    w: '-1',
                    h: `${height * videoFilters.watermarkSizeRatio}`
                },
                outputs: ['[watermark]']
            },
            {
                inputs: [`[${videoInput}]`, '[watermark]'],
                filter: 'overlay',
                options: {
                    x: `main_w - overlay_w - (main_h * ${videoFilters.horitonzalMarginRatio})`,
                    y: `main_h * ${videoFilters.verticalMarginRatio}`
                }
            }
        ];
        command.complexFilter(complexFilter);
        await this.commandWrapper.runCommand();
    }
    async addIntroOutro(options) {
        const { introOutroPath, videoInputPath, separatedAudioInputPath, outputPath, type, inputFileMutexReleaser } = options;
        const mainProbe = await ffprobePromise(videoInputPath);
        const fps = await getVideoStreamFPS(videoInputPath, mainProbe);
        const { resolution } = await getVideoStreamDimensionsInfo(videoInputPath, mainProbe);
        const mainHasAudio = await hasAudioStream(separatedAudioInputPath || videoInputPath);
        const introOutroProbe = await ffprobePromise(introOutroPath);
        const introOutroHasAudio = await hasAudioStream(introOutroPath, introOutroProbe);
        const command = this.commandWrapper.buildCommand([...this.buildInputs(options), introOutroPath], inputFileMutexReleaser)
            .output(outputPath);
        const videoInput = 0;
        const audioInput = separatedAudioInputPath
            ? videoInput + 1
            : videoInput;
        const introInput = audioInput + 1;
        let introAudio = introInput;
        if (!introOutroHasAudio && mainHasAudio) {
            const duration = await getVideoStreamDuration(introOutroPath, introOutroProbe);
            command.input('anullsrc');
            command.withInputFormat('lavfi');
            command.withInputOption('-t ' + duration);
            introAudio++;
        }
        await presetVOD({
            commandWrapper: this.commandWrapper,
            videoInputPath,
            separatedAudioInputPath,
            resolution,
            videoStreamOnly: false,
            fps,
            canCopyAudio: false,
            canCopyVideo: false
        });
        const complexFilter = [
            {
                inputs: [`${introInput}`, `${videoInput}`],
                filter: 'scale2ref',
                options: {
                    w: 'iw',
                    h: `ih`
                },
                outputs: ['intro-outro', 'main']
            },
            {
                inputs: ['intro-outro', 'main'],
                filter: 'scale2ref',
                options: {
                    w: 'iw',
                    h: `ih`
                },
                outputs: ['to-scale', 'main']
            },
            {
                inputs: 'to-scale',
                filter: 'drawbox',
                options: {
                    t: 'fill'
                },
                outputs: ['to-scale-bg']
            },
            {
                inputs: [`${introInput}`, 'to-scale-bg'],
                filter: 'scale2ref',
                options: {
                    w: 'iw',
                    h: 'ih',
                    force_original_aspect_ratio: 'decrease',
                    flags: 'spline'
                },
                outputs: ['to-scale', 'to-scale-bg']
            },
            {
                inputs: ['to-scale-bg', 'to-scale'],
                filter: 'overlay',
                options: {
                    x: '(main_w - overlay_w)/2',
                    y: '(main_h - overlay_h)/2'
                },
                outputs: 'intro-outro-resized'
            }
        ];
        const concatFilter = {
            inputs: [],
            filter: 'concat',
            options: {
                n: 2,
                v: 1,
                unsafe: 1
            },
            outputs: ['v']
        };
        const introOutroFilterInputs = ['intro-outro-resized'];
        const mainFilterInputs = ['main'];
        if (mainHasAudio) {
            mainFilterInputs.push(`${audioInput}:a`);
            introOutroFilterInputs.push(`${introAudio}:a`);
        }
        if (type === 'intro') {
            concatFilter.inputs = [...introOutroFilterInputs, ...mainFilterInputs];
        }
        else {
            concatFilter.inputs = [...mainFilterInputs, ...introOutroFilterInputs];
        }
        if (mainHasAudio) {
            concatFilter.options['a'] = 1;
            concatFilter.outputs.push('a');
            command.outputOption('-map [a]');
        }
        command.outputOption('-map [v]');
        complexFilter.push(concatFilter);
        command.complexFilter(complexFilter);
        await this.commandWrapper.runCommand();
    }
    buildInputs(options) {
        return [options.videoInputPath, options.separatedAudioInputPath].filter(i => !!i);
    }
}
//# sourceMappingURL=ffmpeg-edition.js.map