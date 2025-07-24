import { buildAspectRatio, forceNumber } from '@peertube/peertube-core-utils';
import { VideoResolution } from '@peertube/peertube-models';
import ffmpeg from 'fluent-ffmpeg';
function ffprobePromise(path) {
    return new Promise((res, rej) => {
        ffmpeg.ffprobe(path, ['-show_chapters'], (err, data) => {
            if (err)
                return rej(err);
            return res(data);
        });
    });
}
const imageCodecs = new Set([
    'ansi',
    'apng',
    'bintext',
    'bmp',
    'brender_pix',
    'dpx',
    'exr',
    'fits',
    'gem',
    'gif',
    'jpeg2000',
    'jpgls',
    'mjpeg',
    'mjpegb',
    'msp2',
    'pam',
    'pbm',
    'pcx',
    'pfm',
    'pgm',
    'pgmyuv',
    'pgx',
    'photocd',
    'pictor',
    'png',
    'ppm',
    'psd',
    'sgi',
    'sunrast',
    'svg',
    'targa',
    'tiff',
    'txd',
    'webp',
    'xbin',
    'xbm',
    'xface',
    'xpm',
    'xwd'
]);
async function isAudioFile(path, existingProbe) {
    const videoStream = await getVideoStream(path, existingProbe);
    if (!videoStream)
        return true;
    if (imageCodecs.has(videoStream.codec_name))
        return true;
    return false;
}
async function hasAudioStream(path, existingProbe) {
    const { audioStream } = await getAudioStream(path, existingProbe);
    return !!audioStream;
}
async function getAudioStream(videoPath, existingProbe) {
    const data = existingProbe || await ffprobePromise(videoPath);
    if (Array.isArray(data.streams)) {
        const audioStream = data.streams.find(stream => stream['codec_type'] === 'audio');
        if (audioStream) {
            return {
                absolutePath: data.format.filename,
                audioStream,
                bitrate: forceNumber(audioStream['bit_rate'])
            };
        }
    }
    return { absolutePath: data.format.filename };
}
function getMaxAudioBitrate(type, bitrate) {
    const maxKBitrate = 384;
    const kToBits = (kbits) => kbits * 1000;
    if (!bitrate)
        return 256;
    if (type === 'aac') {
        switch (true) {
            case bitrate > kToBits(maxKBitrate):
                return maxKBitrate;
            default:
                return -1;
        }
    }
    switch (true) {
        case bitrate <= kToBits(192):
            return 128;
        case bitrate <= kToBits(384):
            return 256;
        default:
            return maxKBitrate;
    }
}
async function getVideoStreamDimensionsInfo(path, existingProbe) {
    const videoStream = await getVideoStream(path, existingProbe);
    if (!videoStream) {
        return {
            width: 0,
            height: 0,
            ratio: 0,
            resolution: VideoResolution.H_NOVIDEO,
            isPortraitMode: false
        };
    }
    const rotation = videoStream.rotation
        ? videoStream.rotation + ''
        : undefined;
    if (rotation === '90' || rotation === '-90') {
        const width = videoStream.width;
        videoStream.width = videoStream.height;
        videoStream.height = width;
    }
    return {
        width: videoStream.width,
        height: videoStream.height,
        ratio: buildAspectRatio({ width: videoStream.width, height: videoStream.height }),
        resolution: Math.min(videoStream.height, videoStream.width),
        isPortraitMode: videoStream.height > videoStream.width
    };
}
async function getVideoStreamFPS(path, existingProbe) {
    const videoStream = await getVideoStream(path, existingProbe);
    if (!videoStream)
        return 0;
    for (const key of ['avg_frame_rate', 'r_frame_rate']) {
        const valuesText = videoStream[key];
        if (!valuesText)
            continue;
        const [frames, seconds] = valuesText.split('/');
        if (!frames || !seconds)
            continue;
        const result = parseInt(frames, 10) / parseInt(seconds, 10);
        if (result > 0)
            return Math.round(result);
    }
    return 0;
}
async function getVideoStreamBitrate(path, existingProbe) {
    const metadata = existingProbe || await ffprobePromise(path);
    let bitrate = metadata.format.bit_rate;
    if (bitrate && !isNaN(bitrate))
        return bitrate;
    const videoStream = await getVideoStream(path, existingProbe);
    if (!videoStream)
        return undefined;
    bitrate = forceNumber(videoStream === null || videoStream === void 0 ? void 0 : videoStream.bit_rate);
    if (bitrate && !isNaN(bitrate))
        return bitrate;
    return undefined;
}
async function getVideoStreamDuration(path, existingProbe) {
    const metadata = existingProbe || await ffprobePromise(path);
    return Math.round(metadata.format.duration);
}
async function getVideoStream(path, existingProbe) {
    const metadata = existingProbe || await ffprobePromise(path);
    return metadata.streams.find(s => s.codec_type === 'video');
}
async function hasVideoStream(path, existingProbe) {
    const videoStream = await getVideoStream(path, existingProbe);
    return !!videoStream;
}
async function getChaptersFromContainer(options) {
    const { path, maxTitleLength, ffprobe } = options;
    const metadata = ffprobe || await ffprobePromise(path);
    if (!Array.isArray(metadata === null || metadata === void 0 ? void 0 : metadata.chapters))
        return [];
    return metadata.chapters
        .map(c => ({
        timecode: Math.round(c.start_time),
        title: (c['TAG:title'] || '').slice(0, maxTitleLength)
    }));
}
export { ffprobePromise, getAudioStream, getChaptersFromContainer, getMaxAudioBitrate, getVideoStream, getVideoStreamBitrate, getVideoStreamDimensionsInfo, getVideoStreamDuration, getVideoStreamFPS, hasAudioStream, hasVideoStream, isAudioFile };
//# sourceMappingURL=ffprobe.js.map