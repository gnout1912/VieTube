export function isMoveVideoStoragePayload(payload) {
    return 'videoUUID' in payload;
}
export function isMoveCaptionPayload(payload) {
    return 'captionId' in payload;
}
//# sourceMappingURL=job.model.js.map