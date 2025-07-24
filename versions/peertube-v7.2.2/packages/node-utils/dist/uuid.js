import short from 'short-uuid';
import { v5 } from 'uuid';
const translator = short();
export function buildUUID() {
    return short.uuid();
}
export function buildSUUID() {
    return short.generate();
}
export function uuidToShort(uuid) {
    if (!uuid)
        return uuid;
    return translator.fromUUID(uuid);
}
export function shortToUUID(shortUUID) {
    if (!shortUUID)
        return shortUUID;
    return translator.toUUID(shortUUID);
}
export function isShortUUID(value) {
    if (!value)
        return false;
    return value.length === translator.maxLength;
}
export function buildUUIDv5FromURL(url) {
    return v5(url, v5.URL);
}
//# sourceMappingURL=uuid.js.map