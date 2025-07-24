import { isArray } from './misc.js';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import validator from 'validator';
export function areVideoChaptersValid(value) {
    if (!isArray(value))
        return false;
    if (!value.every(v => isVideoChapterValid(v)))
        return false;
    const timecodes = value.map(c => c.timecode);
    return new Set(timecodes).size === timecodes.length;
}
export function isVideoChapterValid(value) {
    return isVideoChapterTimecodeValid(value.timecode) && isVideoChapterTitleValid(value.title);
}
export function isVideoChapterTitleValid(value) {
    return validator.default.isLength(value + '', CONSTRAINTS_FIELDS.VIDEO_CHAPTERS.TITLE);
}
export function isVideoChapterTimecodeValid(value) {
    return validator.default.isInt(value + '', { min: 0 });
}
//# sourceMappingURL=video-chapters.js.map