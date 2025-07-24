import { join } from 'path';
export function generateHLSObjectStorageKey(playlist, filename) {
    return join(generateHLSObjectBaseStorageKey(playlist), filename);
}
export function generateHLSObjectBaseStorageKey(playlist) {
    return join(playlist.getStringType(), playlist.Video.uuid);
}
export function generateWebVideoObjectStorageKey(filename) {
    return filename;
}
export function generateOriginalVideoObjectStorageKey(filename) {
    return filename;
}
export function generateCaptionObjectStorageKey(filename) {
    return filename;
}
export function generateUserExportObjectStorageKey(filename) {
    return filename;
}
//# sourceMappingURL=keys.js.map