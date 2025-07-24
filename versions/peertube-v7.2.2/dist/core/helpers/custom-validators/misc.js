import { isShortUUID, shortToUUID } from '@peertube/peertube-node-utils';
import 'multer';
import { sep } from 'path';
import validator from 'validator';
export function exists(value) {
    return value !== undefined && value !== null;
}
export function isSafePath(p) {
    return exists(p) &&
        (p + '').split(sep).every(part => {
            return ['..'].includes(part) === false;
        });
}
export function isSafeFilename(filename, extension) {
    const regex = extension
        ? new RegExp(`^[a-z0-9-]+\\.${extension}$`)
        : new RegExp(`^[a-z0-9-]+\\.[a-z0-9]{1,8}$`);
    return typeof filename === 'string' && !!filename.match(regex);
}
export function isSafePeerTubeFilenameWithoutExtension(filename) {
    return filename.match(/^[a-z0-9-]+$/);
}
export function isArray(value) {
    return Array.isArray(value);
}
export function isNotEmptyIntArray(value) {
    return Array.isArray(value) && value.every(v => validator.default.isInt('' + v)) && value.length !== 0;
}
export function isNotEmptyStringArray(value) {
    return Array.isArray(value) && value.every(v => typeof v === 'string' && v.length !== 0) && value.length !== 0;
}
export function hasArrayLength(value, options) {
    if (options.min !== undefined && value.length < options.min)
        return false;
    if (options.max !== undefined && value.length > options.max)
        return false;
    return true;
}
export function isArrayOf(value, validator) {
    return isArray(value) && value.every(v => validator(v));
}
export function isDateValid(value) {
    return exists(value) && validator.default.isISO8601(value);
}
export function isIdValid(value) {
    return exists(value) && validator.default.isInt('' + value);
}
export function isUUIDValid(value) {
    return exists(value) && validator.default.isUUID('' + value, 4);
}
export function areUUIDsValid(values) {
    return isArray(values) && values.every(v => isUUIDValid(v));
}
export function isIdOrUUIDValid(value) {
    return isIdValid(value) || isUUIDValid(value);
}
export function isBooleanValid(value) {
    return typeof value === 'boolean' || (typeof value === 'string' && validator.default.isBoolean(value));
}
export function isIntOrNull(value) {
    return value === null || validator.default.isInt('' + value);
}
export function isFileValid(options) {
    const { files, mimeTypeRegex, field, maxSize, optional = false } = options;
    if (!files)
        return optional;
    const fileArray = isArray(files)
        ? files
        : files[field];
    if (!fileArray || !isArray(fileArray) || fileArray.length === 0) {
        return optional;
    }
    const file = fileArray[0];
    if (!(file === null || file === void 0 ? void 0 : file.originalname))
        return false;
    if ((maxSize !== null) && file.size > maxSize)
        return false;
    if (mimeTypeRegex === null)
        return true;
    return checkMimetypeRegex(file.mimetype, mimeTypeRegex);
}
export function checkMimetypeRegex(fileMimeType, mimeTypeRegex) {
    return new RegExp(`^${mimeTypeRegex}$`, 'i').test(fileMimeType);
}
export function toCompleteUUID(value) {
    if (isShortUUID(value)) {
        try {
            return shortToUUID(value);
        }
        catch (_a) {
            return '';
        }
    }
    return value;
}
export function toCompleteUUIDs(values) {
    return values.map(v => toCompleteUUID(v));
}
export function toIntOrNull(value) {
    const v = toValueOrNull(value);
    if (v === null || v === undefined)
        return v;
    if (typeof v === 'number')
        return v;
    return validator.default.toInt('' + v);
}
export function toBooleanOrNull(value) {
    const v = toValueOrNull(value);
    if (v === null || v === undefined)
        return v;
    if (typeof v === 'boolean')
        return v;
    return validator.default.toBoolean('' + v);
}
export function toValueOrNull(value) {
    if (value === 'null')
        return null;
    return value;
}
export function toIntArray(value) {
    if (!value)
        return [];
    if (isArray(value) === false)
        return [validator.default.toInt(value)];
    return value.map(v => validator.default.toInt(v));
}
//# sourceMappingURL=misc.js.map