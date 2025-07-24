import { OBJECT_STORAGE_PROXY_PATHS, WEBSERVER } from '../../initializers/constants.js';
import { buildKey, getEndpointParsed } from './shared/index.js';
export function getInternalUrl(config, keyWithoutPrefix) {
    return getBaseUrl(config) + buildKey(keyWithoutPrefix, config);
}
export function getObjectStoragePublicFileUrl(fileUrl, objectStorageConfig) {
    const baseUrl = objectStorageConfig.BASE_URL;
    if (!baseUrl)
        return fileUrl;
    return replaceByBaseUrl(fileUrl, baseUrl);
}
export function getHLSPrivateFileUrl(video, filename) {
    return WEBSERVER.URL + OBJECT_STORAGE_PROXY_PATHS.STREAMING_PLAYLISTS.PRIVATE_HLS + video.uuid + `/${filename}`;
}
export function getWebVideoPrivateFileUrl(filename) {
    return WEBSERVER.URL + OBJECT_STORAGE_PROXY_PATHS.PRIVATE_WEB_VIDEOS + filename;
}
function getBaseUrl(bucketInfo, baseUrl) {
    if (baseUrl)
        return baseUrl;
    return `${getEndpointParsed().protocol}//${bucketInfo.BUCKET_NAME}.${getEndpointParsed().host}/`;
}
const regex = new RegExp('https?://[^/]+');
function replaceByBaseUrl(fileUrl, baseUrl) {
    if (!fileUrl)
        return fileUrl;
    return fileUrl.replace(regex, baseUrl);
}
//# sourceMappingURL=urls.js.map