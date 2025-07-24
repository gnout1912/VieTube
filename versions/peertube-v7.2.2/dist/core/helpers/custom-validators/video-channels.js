import validator from 'validator';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { exists } from './misc.js';
import { isUserUsernameValid } from './users.js';
const VIDEO_CHANNELS_CONSTRAINTS_FIELDS = CONSTRAINTS_FIELDS.VIDEO_CHANNELS;
function isVideoChannelUsernameValid(value) {
    return isUserUsernameValid(value);
}
function isVideoChannelDescriptionValid(value) {
    return value === null || validator.default.isLength(value, VIDEO_CHANNELS_CONSTRAINTS_FIELDS.DESCRIPTION);
}
function isVideoChannelDisplayNameValid(value) {
    return exists(value) && validator.default.isLength(value, VIDEO_CHANNELS_CONSTRAINTS_FIELDS.NAME);
}
function isVideoChannelSupportValid(value) {
    return value === null || (exists(value) && validator.default.isLength(value, VIDEO_CHANNELS_CONSTRAINTS_FIELDS.SUPPORT));
}
export { isVideoChannelUsernameValid, isVideoChannelDescriptionValid, isVideoChannelDisplayNameValid, isVideoChannelSupportValid };
//# sourceMappingURL=video-channels.js.map