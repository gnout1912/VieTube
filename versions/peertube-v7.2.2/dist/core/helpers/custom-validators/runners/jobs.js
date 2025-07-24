import { CONSTRAINTS_FIELDS, RUNNER_JOB_STATES } from '../../../initializers/constants.js';
import validator from 'validator';
import { exists, isArray, isFileValid, isSafeFilename } from '../misc.js';
const RUNNER_JOBS_CONSTRAINTS_FIELDS = CONSTRAINTS_FIELDS.RUNNER_JOBS;
const runnerJobTypes = new Set(['vod-hls-transcoding', 'vod-web-video-transcoding', 'vod-audio-merge-transcoding']);
export function isRunnerJobTypeValid(value) {
    return runnerJobTypes.has(value);
}
export function isRunnerJobSuccessPayloadValid(value, type, files) {
    return isRunnerJobVODWebVideoResultPayloadValid(value, type, files) ||
        isRunnerJobVODHLSResultPayloadValid(value, type, files) ||
        isRunnerJobVODAudioMergeResultPayloadValid(value, type, files) ||
        isRunnerJobLiveRTMPHLSResultPayloadValid(value, type) ||
        isRunnerJobVideoStudioResultPayloadValid(value, type, files) ||
        isRunnerJobTranscriptionResultPayloadValid(value, type, files);
}
export function isRunnerJobProgressValid(value) {
    return validator.default.isInt(value + '', RUNNER_JOBS_CONSTRAINTS_FIELDS.PROGRESS);
}
export function isRunnerJobUpdatePayloadValid(value, type, files) {
    return isRunnerJobVODWebVideoUpdatePayloadValid(value, type, files) ||
        isRunnerJobVODHLSUpdatePayloadValid(value, type, files) ||
        isRunnerJobVideoStudioUpdatePayloadValid(value, type, files) ||
        isRunnerJobVODAudioMergeUpdatePayloadValid(value, type, files) ||
        isRunnerJobLiveRTMPHLSUpdatePayloadValid(value, type, files) ||
        isRunnerJobTranscriptionUpdatePayloadValid(value, type, files);
}
export function isRunnerJobTokenValid(value) {
    return exists(value) && validator.default.isLength(value, RUNNER_JOBS_CONSTRAINTS_FIELDS.TOKEN);
}
export function isRunnerJobAbortReasonValid(value) {
    return validator.default.isLength(value, RUNNER_JOBS_CONSTRAINTS_FIELDS.REASON);
}
export function isRunnerJobErrorMessageValid(value) {
    return validator.default.isLength(value, RUNNER_JOBS_CONSTRAINTS_FIELDS.ERROR_MESSAGE);
}
export function isRunnerJobStateValid(value) {
    return exists(value) && RUNNER_JOB_STATES[value] !== undefined;
}
export function isRunnerJobArrayOfStateValid(value) {
    return isArray(value) && value.every(v => isRunnerJobStateValid(v));
}
function isRunnerJobVODWebVideoResultPayloadValid(_value, type, files) {
    return type === 'vod-web-video-transcoding' &&
        isFileValid({ files, field: 'payload[videoFile]', mimeTypeRegex: null, maxSize: null });
}
function isRunnerJobVODHLSResultPayloadValid(_value, type, files) {
    return type === 'vod-hls-transcoding' &&
        isFileValid({ files, field: 'payload[videoFile]', mimeTypeRegex: null, maxSize: null }) &&
        isFileValid({ files, field: 'payload[resolutionPlaylistFile]', mimeTypeRegex: null, maxSize: null });
}
function isRunnerJobVODAudioMergeResultPayloadValid(_value, type, files) {
    return type === 'vod-audio-merge-transcoding' &&
        isFileValid({ files, field: 'payload[videoFile]', mimeTypeRegex: null, maxSize: null });
}
function isRunnerJobLiveRTMPHLSResultPayloadValid(value, type) {
    return type === 'live-rtmp-hls-transcoding' && (!value || (typeof value === 'object' && Object.keys(value).length === 0));
}
function isRunnerJobVideoStudioResultPayloadValid(_value, type, files) {
    return type === 'video-studio-transcoding' &&
        isFileValid({ files, field: 'payload[videoFile]', mimeTypeRegex: null, maxSize: null });
}
function isRunnerJobTranscriptionResultPayloadValid(value, type, files) {
    return type === 'video-transcription' &&
        isFileValid({ files, field: 'payload[vttFile]', mimeTypeRegex: null, maxSize: null });
}
function isRunnerJobVODWebVideoUpdatePayloadValid(value, type, _files) {
    return type === 'vod-web-video-transcoding' &&
        (!value || (typeof value === 'object' && Object.keys(value).length === 0));
}
function isRunnerJobVODHLSUpdatePayloadValid(value, type, _files) {
    return type === 'vod-hls-transcoding' &&
        (!value || (typeof value === 'object' && Object.keys(value).length === 0));
}
function isRunnerJobVODAudioMergeUpdatePayloadValid(value, type, _files) {
    return type === 'vod-audio-merge-transcoding' &&
        (!value || (typeof value === 'object' && Object.keys(value).length === 0));
}
function isRunnerJobTranscriptionUpdatePayloadValid(value, type, _files) {
    return type === 'video-transcription' &&
        (!value || (typeof value === 'object' && Object.keys(value).length === 0));
}
function isRunnerJobLiveRTMPHLSUpdatePayloadValid(value, type, files) {
    let result = type === 'live-rtmp-hls-transcoding' && !!value && !!files;
    result && (result = isFileValid({ files, field: 'payload[masterPlaylistFile]', mimeTypeRegex: null, maxSize: null, optional: true }));
    result && (result = isFileValid({
        files,
        field: 'payload[resolutionPlaylistFile]',
        mimeTypeRegex: null,
        maxSize: null,
        optional: !value.resolutionPlaylistFilename
    }));
    if (files['payload[resolutionPlaylistFile]']) {
        result && (result = isSafeFilename(value.resolutionPlaylistFilename, 'm3u8'));
    }
    return result &&
        isSafeFilename(value.videoChunkFilename, 'ts') &&
        ((value.type === 'remove-chunk') ||
            (value.type === 'add-chunk' &&
                isFileValid({ files, field: 'payload[videoChunkFile]', mimeTypeRegex: null, maxSize: null })));
}
function isRunnerJobVideoStudioUpdatePayloadValid(value, type, _files) {
    return type === 'video-studio-transcoding' &&
        (!value || (typeof value === 'object' && Object.keys(value).length === 0));
}
//# sourceMappingURL=jobs.js.map