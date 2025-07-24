import { FFmpegLive } from '@peertube/peertube-ffmpeg';
import { getFFmpegCommandWrapperOptions } from '../../../../helpers/ffmpeg/index.js';
import { logger } from '../../../../helpers/logger.js';
import { CONFIG } from '../../../../initializers/config.js';
import { VIDEO_LIVE } from '../../../../initializers/constants.js';
import { VideoTranscodingProfilesManager } from '../../../transcoding/default-transcoding-profiles.js';
import { getLiveSegmentTime } from '../../live-utils.js';
import { AbstractTranscodingWrapper } from './abstract-transcoding-wrapper.js';
export class FFmpegTranscodingWrapper extends AbstractTranscodingWrapper {
    constructor() {
        super(...arguments);
        this.aborted = false;
        this.errored = false;
        this.ended = false;
    }
    async run() {
        this.ffmpegCommand = CONFIG.LIVE.TRANSCODING.ENABLED
            ? await this.buildFFmpegLive().getLiveTranscodingCommand({
                inputUrl: this.inputLocalUrl,
                outPath: this.outDirectory,
                masterPlaylistName: this.streamingPlaylist.playlistFilename,
                segmentListSize: this.segmentListSize,
                segmentDuration: this.segmentDuration,
                toTranscode: this.toTranscode,
                bitrate: this.bitrate,
                ratio: this.ratio,
                probe: this.probe,
                hasAudio: this.hasAudio,
                hasVideo: this.hasVideo,
                splitAudioAndVideo: true
            })
            : this.buildFFmpegLive().getLiveMuxingCommand({
                inputUrl: this.inputLocalUrl,
                outPath: this.outDirectory,
                masterPlaylistName: this.streamingPlaylist.playlistFilename,
                segmentListSize: VIDEO_LIVE.SEGMENTS_LIST_SIZE,
                segmentDuration: getLiveSegmentTime(this.videoLive.latencyMode)
            });
        logger.info('Running local live muxing/transcoding for %s.', this.videoUUID, this.lTags());
        let ffmpegShellCommand;
        this.ffmpegCommand.on('start', cmdline => {
            ffmpegShellCommand = cmdline;
            logger.debug('Running ffmpeg command for live', Object.assign({ ffmpegShellCommand }, this.lTags()));
        });
        this.ffmpegCommand.on('error', (err, stdout, stderr) => {
            this.onFFmpegError({ err, stdout, stderr, ffmpegShellCommand });
        });
        this.ffmpegCommand.on('end', () => {
            this.onFFmpegEnded();
        });
        this.ffmpegCommand.run();
    }
    abort() {
        if (this.ended || this.errored || this.aborted)
            return;
        logger.debug('Killing ffmpeg after live abort of ' + this.videoUUID, this.lTags());
        if (this.ffmpegCommand) {
            this.ffmpegCommand.kill('SIGINT');
        }
        this.aborted = true;
        this.emit('end');
    }
    onFFmpegError(options) {
        var _a;
        const { err, stdout, stderr, ffmpegShellCommand } = options;
        if ((_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.includes('Exiting normally'))
            return;
        if (this.ended || this.errored || this.aborted)
            return;
        logger.error('FFmpeg transcoding error.', Object.assign({ err, stdout, stderr, ffmpegShellCommand }, this.lTags()));
        this.errored = true;
        this.emit('error', { err });
    }
    onFFmpegEnded() {
        if (this.ended || this.errored || this.aborted)
            return;
        logger.debug('Live ffmpeg transcoding ended for ' + this.videoUUID, this.lTags());
        this.ended = true;
        this.emit('end');
    }
    buildFFmpegLive() {
        return new FFmpegLive(getFFmpegCommandWrapperOptions('live', VideoTranscodingProfilesManager.Instance.getAvailableEncoders()));
    }
}
//# sourceMappingURL=ffmpeg-transcoding-wrapper.js.map