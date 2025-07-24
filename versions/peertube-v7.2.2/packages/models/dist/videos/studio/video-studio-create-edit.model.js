export function isVideoStudioTaskIntro(v) {
    return v.name === 'add-intro';
}
export function isVideoStudioTaskOutro(v) {
    return v.name === 'add-outro';
}
export function isVideoStudioTaskWatermark(v) {
    return v.name === 'add-watermark';
}
export function hasVideoStudioTaskFile(v) {
    return isVideoStudioTaskIntro(v) || isVideoStudioTaskOutro(v) || isVideoStudioTaskWatermark(v);
}
//# sourceMappingURL=video-studio-create-edit.model.js.map