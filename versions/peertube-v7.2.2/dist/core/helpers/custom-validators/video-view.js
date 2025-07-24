import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import validator from 'validator';
import { exists } from './misc.js';
export function isVideoTimeValid(value, videoDuration) {
    if (value < 0)
        return false;
    if (exists(videoDuration) && value > videoDuration)
        return false;
    return true;
}
export function isVideoViewEvent(value) {
    return value === 'seek';
}
export function isVideoViewUAInfo(value) {
    return validator.default.isLength(value, CONSTRAINTS_FIELDS.VIDEO_VIEW.UA_INFO);
}
const devices = new Set(['console', 'embedded', 'mobile', 'smarttv', 'tablet', 'wearable', 'xr', 'desktop']);
export function toVideoViewUADeviceOrNull(value) {
    return devices.has(value)
        ? value
        : null;
}
//# sourceMappingURL=video-view.js.map