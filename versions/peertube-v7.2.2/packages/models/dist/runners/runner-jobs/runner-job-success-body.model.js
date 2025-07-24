export function isWebVideoOrAudioMergeTranscodingPayloadSuccess(payload) {
    return !!(payload === null || payload === void 0 ? void 0 : payload.videoFile);
}
export function isHLSTranscodingPayloadSuccess(payload) {
    return !!(payload === null || payload === void 0 ? void 0 : payload.resolutionPlaylistFile);
}
export function isTranscriptionPayloadSuccess(payload) {
    return !!(payload === null || payload === void 0 ? void 0 : payload.vttFile);
}
//# sourceMappingURL=runner-job-success-body.model.js.map