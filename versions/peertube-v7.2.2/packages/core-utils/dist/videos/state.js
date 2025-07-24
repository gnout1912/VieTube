import { VideoState } from '@peertube/peertube-models';
export function canVideoFileBeEdited(state) {
    const validStates = new Set([
        VideoState.PUBLISHED,
        VideoState.TO_MOVE_TO_EXTERNAL_STORAGE_FAILED,
        VideoState.TO_MOVE_TO_FILE_SYSTEM_FAILED,
        VideoState.TRANSCODING_FAILED
    ]);
    return validStates.has(state);
}
//# sourceMappingURL=state.js.map