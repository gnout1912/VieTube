import validator from 'validator';
import { VideoBlacklistType } from '@peertube/peertube-models';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { exists } from './misc.js';
const VIDEO_BLACKLIST_CONSTRAINTS_FIELDS = CONSTRAINTS_FIELDS.VIDEO_BLACKLIST;
function isVideoBlacklistReasonValid(value) {
    return value === null || validator.default.isLength(value, VIDEO_BLACKLIST_CONSTRAINTS_FIELDS.REASON);
}
function isVideoBlacklistTypeValid(value) {
    return exists(value) &&
        (value === VideoBlacklistType.AUTO_BEFORE_PUBLISHED || value === VideoBlacklistType.MANUAL);
}
export { isVideoBlacklistReasonValid, isVideoBlacklistTypeValid };
//# sourceMappingURL=video-blacklist.js.map