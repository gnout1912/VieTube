import { secondsToTime } from './date.js';
function addQueryParams(url, params) {
    const objUrl = new URL(url);
    for (const key of Object.keys(params)) {
        objUrl.searchParams.append(key, params[key]);
    }
    return objUrl.toString();
}
function removeQueryParams(url) {
    const objUrl = new URL(url);
    objUrl.searchParams.forEach((_v, k) => objUrl.searchParams.delete(k));
    return objUrl.toString();
}
function queryParamsToObject(entries) {
    const result = {};
    for (const [key, value] of entries) {
        result[key] = value;
    }
    return result;
}
function buildDownloadFilesUrl(options) {
    const { baseUrl, videoFiles, videoUUID, videoFileToken, extension = '' } = options;
    let url = `${baseUrl}/download/videos/generate/${videoUUID}${extension}?`;
    url += videoFiles.map(f => 'videoFileIds=' + f).join('&');
    if (videoFileToken)
        url += `&videoFileToken=${videoFileToken}`;
    return url;
}
function buildPlaylistLink(playlist, base) {
    return (base !== null && base !== void 0 ? base : window.location.origin) + buildPlaylistWatchPath(playlist);
}
function buildPlaylistWatchPath(playlist) {
    return '/w/p/' + playlist.shortUUID;
}
function buildVideoWatchPath(video) {
    return '/w/' + video.shortUUID;
}
function buildVideoLink(video, base) {
    return (base !== null && base !== void 0 ? base : window.location.origin) + buildVideoWatchPath(video);
}
function buildPlaylistEmbedPath(playlist) {
    return '/video-playlists/embed/' + (playlist.shortUUID || playlist.uuid);
}
function buildPlaylistEmbedLink(playlist, base) {
    return (base !== null && base !== void 0 ? base : window.location.origin) + buildPlaylistEmbedPath(playlist);
}
function buildVideoEmbedPath(video) {
    return '/videos/embed/' + (video.shortUUID || video.uuid);
}
function buildVideoEmbedLink(video, base) {
    return (base !== null && base !== void 0 ? base : window.location.origin) + buildVideoEmbedPath(video);
}
function decorateVideoLink(options) {
    const { url } = options;
    const params = new URLSearchParams();
    if (options.startTime !== undefined && options.startTime !== null) {
        const startTimeInt = Math.floor(options.startTime);
        params.set('start', secondsToTime(startTimeInt));
    }
    if (options.stopTime) {
        const stopTimeInt = Math.floor(options.stopTime);
        params.set('stop', secondsToTime(stopTimeInt));
    }
    if (options.subtitle)
        params.set('subtitle', options.subtitle);
    if (options.loop === true)
        params.set('loop', '1');
    if (options.autoplay === true)
        params.set('autoplay', '1');
    if (options.muted === true)
        params.set('muted', '1');
    if (options.title === false)
        params.set('title', '0');
    if (options.warningTitle === false)
        params.set('warningTitle', '0');
    if (options.controls === false)
        params.set('controls', '0');
    if (options.controlBar === false)
        params.set('controlBar', '0');
    if (options.peertubeLink === false)
        params.set('peertubeLink', '0');
    if (options.p2p !== undefined)
        params.set('p2p', options.p2p ? '1' : '0');
    if (options.api !== undefined)
        params.set('api', options.api ? '1' : '0');
    if (options.version !== undefined)
        params.set('v', options.version + '');
    return buildUrl(url, params);
}
function decoratePlaylistLink(options) {
    const { url } = options;
    const params = new URLSearchParams();
    if (options.playlistPosition)
        params.set('playlistPosition', '' + options.playlistPosition);
    return buildUrl(url, params);
}
export { addQueryParams, removeQueryParams, queryParamsToObject, buildDownloadFilesUrl, buildPlaylistLink, buildVideoLink, buildVideoWatchPath, buildPlaylistWatchPath, buildPlaylistEmbedPath, buildVideoEmbedPath, buildPlaylistEmbedLink, buildVideoEmbedLink, decorateVideoLink, decoratePlaylistLink };
function buildUrl(url, params) {
    let hasParams = false;
    params.forEach(() => { hasParams = true; });
    if (hasParams)
        return url + '?' + params.toString();
    return url;
}
//# sourceMappingURL=url.js.map