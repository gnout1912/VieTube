export function buildStreamSuffix(base, streamNum) {
    if (streamNum !== undefined) {
        return `${base}:${streamNum}`;
    }
    return base;
}
export function getScaleFilter(options) {
    if (options.scaleFilter)
        return options.scaleFilter.name;
    return 'scale';
}
//# sourceMappingURL=ffmpeg-utils.js.map