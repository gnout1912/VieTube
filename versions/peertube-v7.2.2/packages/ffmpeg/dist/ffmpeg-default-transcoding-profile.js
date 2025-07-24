import { getAverageTheoreticalBitrate, getMaxTheoreticalBitrate, getMinTheoreticalBitrate } from '@peertube/peertube-core-utils';
import { buildStreamSuffix, getAudioStream, getMaxAudioBitrate, getVideoStream, getVideoStreamBitrate, getVideoStreamDimensionsInfo, getVideoStreamFPS } from '@peertube/peertube-ffmpeg';
const defaultX264VODOptionsBuilder = (options) => {
    const { fps, inputRatio, inputBitrate, resolution } = options;
    const targetBitrate = getTargetBitrate({ inputBitrate, ratio: inputRatio, fps, resolution });
    return {
        outputOptions: [
            ...getCommonOutputOptions(targetBitrate),
            `-r ${fps}`
        ]
    };
};
const defaultX264LiveOptionsBuilder = (options) => {
    const { streamNum, fps, inputBitrate, inputRatio, resolution } = options;
    const targetBitrate = getTargetBitrate({ inputBitrate, ratio: inputRatio, fps, resolution });
    return {
        outputOptions: [
            ...getCommonOutputOptions(targetBitrate, streamNum),
            `${buildStreamSuffix('-r:v', streamNum)} ${fps}`,
            `${buildStreamSuffix('-b:v', streamNum)} ${targetBitrate}`
        ]
    };
};
const defaultAACOptionsBuilder = async ({ input, streamNum, canCopyAudio, inputProbe }) => {
    if (canCopyAudio && await canDoQuickAudioTranscode(input, inputProbe)) {
        return { copy: true, outputOptions: [] };
    }
    const parsedAudio = await getAudioStream(input, inputProbe);
    const audioCodecName = parsedAudio.audioStream['codec_name'];
    const bitrate = getMaxAudioBitrate(audioCodecName, parsedAudio.bitrate);
    const base = ['-channel_layout', 'stereo'];
    if (bitrate !== -1) {
        return { outputOptions: base.concat([buildStreamSuffix('-b:a', streamNum), bitrate + 'k']) };
    }
    return { outputOptions: base };
};
const defaultLibFDKAACVODOptionsBuilder = ({ streamNum }) => {
    return { outputOptions: [buildStreamSuffix('-q:a', streamNum), '5'] };
};
export function getDefaultAvailableEncoders() {
    return {
        vod: {
            libx264: {
                default: defaultX264VODOptionsBuilder
            },
            aac: {
                default: defaultAACOptionsBuilder
            },
            libfdk_aac: {
                default: defaultLibFDKAACVODOptionsBuilder
            }
        },
        live: {
            libx264: {
                default: defaultX264LiveOptionsBuilder
            },
            aac: {
                default: defaultAACOptionsBuilder
            }
        }
    };
}
export function getDefaultEncodersToTry() {
    return {
        vod: {
            video: ['libx264'],
            audio: ['libfdk_aac', 'aac']
        },
        live: {
            video: ['libx264'],
            audio: ['libfdk_aac', 'aac']
        }
    };
}
export async function canDoQuickAudioTranscode(path, probe) {
    const parsedAudio = await getAudioStream(path, probe);
    if (!parsedAudio.audioStream)
        return true;
    if (parsedAudio.audioStream['codec_name'] !== 'aac')
        return false;
    const audioBitrate = parsedAudio.bitrate;
    if (!audioBitrate)
        return false;
    const maxAudioBitrate = getMaxAudioBitrate('aac', audioBitrate);
    if (maxAudioBitrate !== -1 && audioBitrate > maxAudioBitrate)
        return false;
    const channelLayout = parsedAudio.audioStream['channel_layout'];
    if (!channelLayout || channelLayout === 'unknown' || channelLayout === 'quad')
        return false;
    return true;
}
export async function canDoQuickVideoTranscode(path, maxFPS, probe) {
    const videoStream = await getVideoStream(path, probe);
    const fps = await getVideoStreamFPS(path, probe);
    const bitRate = await getVideoStreamBitrate(path, probe);
    const resolutionData = await getVideoStreamDimensionsInfo(path, probe);
    if (!bitRate)
        return false;
    if (!videoStream)
        return false;
    if (videoStream['codec_name'] !== 'h264')
        return false;
    if (videoStream['pix_fmt'] !== 'yuv420p')
        return false;
    if (fps < 2 || fps > maxFPS)
        return false;
    if (bitRate > getMaxTheoreticalBitrate(Object.assign(Object.assign({}, resolutionData), { fps })))
        return false;
    return true;
}
function getTargetBitrate(options) {
    const { inputBitrate, resolution, ratio, fps } = options;
    const capped = capBitrate(inputBitrate, getAverageTheoreticalBitrate({ resolution, fps, ratio }));
    const limit = getMinTheoreticalBitrate({ resolution, fps, ratio });
    return Math.max(limit, capped);
}
function capBitrate(inputBitrate, targetBitrate) {
    if (!inputBitrate)
        return targetBitrate;
    const inputBitrateWithMargin = inputBitrate + (inputBitrate * 0.3);
    return Math.min(targetBitrate, inputBitrateWithMargin);
}
function getCommonOutputOptions(targetBitrate, streamNum) {
    return [
        `-preset veryfast`,
        `${buildStreamSuffix('-maxrate:v', streamNum)} ${targetBitrate}`,
        `${buildStreamSuffix('-bufsize:v', streamNum)} ${targetBitrate * 2}`,
        `-b_strategy 1`,
        `-bf 16`
    ];
}
//# sourceMappingURL=ffmpeg-default-transcoding-profile.js.map