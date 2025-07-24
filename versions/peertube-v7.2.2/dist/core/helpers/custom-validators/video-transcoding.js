import { exists } from './misc.js';
export function isValidCreateTranscodingType(value) {
    return exists(value) && (value === 'hls' || value === 'web-video');
}
//# sourceMappingURL=video-transcoding.js.map