export const uuidRegex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function removeFragmentedMP4Ext(path) {
    return path.replace(/-fragmented.mp4$/i, '');
}
export function removeVTTExt(path) {
    return path.replace(/\.vtt$/i, '');
}
//# sourceMappingURL=regexp.js.map