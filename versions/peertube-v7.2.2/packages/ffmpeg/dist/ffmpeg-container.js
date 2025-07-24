import { FFmpegCommandWrapper } from './ffmpeg-command-wrapper.js';
export class FFmpegContainer {
    constructor(options) {
        this.commandWrapper = new FFmpegCommandWrapper(options);
    }
    mergeInputs(options) {
        const { inputs, output, logError, coverPath } = options;
        const command = this.commandWrapper.buildCommand(inputs);
        for (let i = 0; i < inputs.length; i++) {
            command.outputOption('-map ' + i);
        }
        if (coverPath) {
            command.addInput(coverPath);
            command.outputOption('-map ' + inputs.length);
        }
        command.outputOption('-c copy')
            .outputOption('-movflags frag_every_frame+empty_moov')
            .outputOption('-min_frag_duration 5M')
            .format('mp4')
            .output(output);
        return this.commandWrapper.runCommand({ silent: !logError });
    }
    forceKill() {
        if (!this.commandWrapper)
            return;
        this.commandWrapper.getCommand().kill('SIGKILL');
    }
}
//# sourceMappingURL=ffmpeg-container.js.map