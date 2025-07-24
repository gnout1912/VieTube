import { arrayify, pick, promisify0 } from '@peertube/peertube-core-utils';
import ffmpeg from 'fluent-ffmpeg';
export class FFmpegCommandWrapper {
    constructor(options) {
        this.availableEncoders = options.availableEncoders;
        this.profile = options.profile;
        this.niceness = options.niceness;
        this.tmpDirectory = options.tmpDirectory;
        this.threads = options.threads;
        this.logger = options.logger;
        this.lTags = options.lTags || { tags: [] };
        this.updateJobProgress = options.updateJobProgress;
        this.onEnd = options.onEnd;
        this.onError = options.onError;
    }
    getAvailableEncoders() {
        return this.availableEncoders;
    }
    getProfile() {
        return this.profile;
    }
    getCommand() {
        return this.command;
    }
    debugLog(msg, meta = {}) {
        this.logger.debug(msg, Object.assign(Object.assign({}, meta), this.lTags));
    }
    resetCommand() {
        this.command = undefined;
    }
    buildCommand(inputs, inputFileMutexReleaser) {
        if (this.command)
            throw new Error('Command is already built');
        this.command = ffmpeg({
            niceness: this.niceness,
            cwd: this.tmpDirectory
        });
        for (const input of arrayify(inputs)) {
            this.command.input(input);
        }
        if (this.threads > 0) {
            this.command.outputOption('-threads ' + this.threads);
        }
        if (inputFileMutexReleaser) {
            this.command.on('start', () => {
                setTimeout(() => inputFileMutexReleaser(), 1000);
            });
        }
        return this.command;
    }
    async runCommand(options = {}) {
        const { silent = false } = options;
        return new Promise((res, rej) => {
            let shellCommand;
            this.command.on('start', cmdline => {
                shellCommand = cmdline;
            });
            this.command.on('error', (err, stdout, stderr) => {
                if (silent !== true)
                    this.logger.error('Error in ffmpeg.', Object.assign({ err, stdout, stderr, shellCommand }, this.lTags));
                err.stdout = stdout;
                err.stderr = stderr;
                if (this.onError)
                    this.onError(err);
                rej(err);
            });
            this.command.on('end', (stdout, stderr) => {
                this.logger.debug('FFmpeg command ended.', Object.assign({ stdout, stderr, shellCommand }, this.lTags));
                if (this.onEnd)
                    this.onEnd();
                res();
            });
            if (this.updateJobProgress) {
                this.command.on('progress', progress => {
                    if (!progress.percent)
                        return;
                    let percent = Math.round(progress.percent);
                    if (percent < 0)
                        percent = 0;
                    if (percent > 100)
                        percent = 100;
                    this.updateJobProgress(percent);
                });
            }
            this.command.run();
        });
    }
    static resetSupportedEncoders() {
        FFmpegCommandWrapper.supportedEncoders = undefined;
    }
    async getEncoderBuilderResult(options) {
        if (!this.availableEncoders) {
            throw new Error('There is no available encoders');
        }
        const { streamType, videoType } = options;
        const encodersToTry = this.availableEncoders.encodersToTry[videoType][streamType];
        const encoders = this.availableEncoders.available[videoType];
        for (const encoder of encodersToTry) {
            if (!(await this.checkFFmpegEncoders(this.availableEncoders)).get(encoder)) {
                this.logger.debug(`Encoder ${encoder} not available in ffmpeg, skipping.`, this.lTags);
                continue;
            }
            if (!encoders[encoder]) {
                this.logger.debug(`Encoder ${encoder} not available in peertube encoders, skipping.`, this.lTags);
                continue;
            }
            const builderProfiles = encoders[encoder];
            let builder = builderProfiles[this.profile];
            if (!builder) {
                this.logger.debug(`Profile ${this.profile} for encoder ${encoder} not available. Fallback to default.`, this.lTags);
                builder = builderProfiles.default;
                if (!builder) {
                    this.logger.debug(`Default profile for encoder ${encoder} not available. Try next available encoder.`, this.lTags);
                    continue;
                }
            }
            const result = await builder(pick(options, [
                'input',
                'canCopyAudio',
                'canCopyVideo',
                'resolution',
                'inputBitrate',
                'inputProbe',
                'fps',
                'inputRatio',
                'streamNum'
            ]));
            return {
                result,
                encoder: result.copy === true
                    ? 'copy'
                    : encoder
            };
        }
        return null;
    }
    async checkFFmpegEncoders(peertubeAvailableEncoders) {
        if (FFmpegCommandWrapper.supportedEncoders !== undefined) {
            return FFmpegCommandWrapper.supportedEncoders;
        }
        const getAvailableEncodersPromise = promisify0(ffmpeg.getAvailableEncoders);
        const availableFFmpegEncoders = await getAvailableEncodersPromise();
        const searchEncoders = new Set();
        for (const type of ['live', 'vod']) {
            for (const streamType of ['audio', 'video']) {
                for (const encoder of peertubeAvailableEncoders.encodersToTry[type][streamType]) {
                    searchEncoders.add(encoder);
                }
            }
        }
        const supportedEncoders = new Map();
        for (const searchEncoder of searchEncoders) {
            supportedEncoders.set(searchEncoder, availableFFmpegEncoders[searchEncoder] !== undefined);
        }
        this.logger.info('Built supported ffmpeg encoders.', Object.assign({ supportedEncoders, searchEncoders }, this.lTags));
        FFmpegCommandWrapper.supportedEncoders = supportedEncoders;
        return supportedEncoders;
    }
}
//# sourceMappingURL=ffmpeg-command-wrapper.js.map