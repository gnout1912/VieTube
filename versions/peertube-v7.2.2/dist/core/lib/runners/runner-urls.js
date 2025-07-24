import { WEBSERVER } from '../../initializers/constants.js';
export function generateRunnerTranscodingVideoInputFileUrl(jobUUID, videoUUID) {
    return WEBSERVER.URL + '/api/v1/runners/jobs/' + jobUUID + '/files/videos/' + videoUUID + '/max-quality';
}
export function generateRunnerTranscodingAudioInputFileUrl(jobUUID, videoUUID) {
    return WEBSERVER.URL + '/api/v1/runners/jobs/' + jobUUID + '/files/videos/' + videoUUID + '/max-quality/audio';
}
export function generateRunnerTranscodingVideoPreviewFileUrl(jobUUID, videoUUID) {
    return WEBSERVER.URL + '/api/v1/runners/jobs/' + jobUUID + '/files/videos/' + videoUUID + '/previews/max-quality';
}
export function generateRunnerEditionTranscodingVideoInputFileUrl(jobUUID, videoUUID, filename) {
    return WEBSERVER.URL + '/api/v1/runners/jobs/' + jobUUID + '/files/videos/' + videoUUID + '/studio/task-files/' + filename;
}
//# sourceMappingURL=runner-urls.js.map