import { STATIC_PATHS, WEBSERVER } from '../initializers/constants.js';
export function generateHLSRedundancyUrl(video, playlist) {
    return WEBSERVER.URL + STATIC_PATHS.REDUNDANCY + playlist.getStringType() + '/' + video.uuid;
}
export function getLocalVideoFileMetadataUrl(video, videoFile) {
    const path = '/api/v1/videos/';
    return WEBSERVER.URL + path + video.uuid + '/metadata/' + videoFile.id;
}
//# sourceMappingURL=video-urls.js.map