import { isPlaylistElementObjectValid, isPlaylistObjectValid } from '../../../../helpers/custom-validators/activitypub/playlist.js';
import { isArray } from '../../../../helpers/custom-validators/misc.js';
import { logger, loggerTagsFactory } from '../../../../helpers/logger.js';
import { fetchAP } from '../../activity.js';
import { checkUrlsSameHost } from '../../url.js';
async function fetchRemoteVideoPlaylist(playlistUrl) {
    const lTags = loggerTagsFactory('ap', 'video-playlist', playlistUrl);
    logger.info('Fetching remote playlist %s.', playlistUrl, lTags());
    const { body, statusCode } = await fetchAP(playlistUrl);
    if (isPlaylistObjectValid(body) === false || checkUrlsSameHost(body.id, playlistUrl) !== true) {
        logger.debug('Remote video playlist JSON is not valid.', Object.assign({ body }, lTags()));
        return { statusCode, playlistObject: undefined };
    }
    if (!isArray(body.to)) {
        logger.debug('Remote video playlist JSON does not have a valid audience.', Object.assign({ body }, lTags()));
        return { statusCode, playlistObject: undefined };
    }
    return { statusCode, playlistObject: body };
}
async function fetchRemotePlaylistElement(elementUrl) {
    const lTags = loggerTagsFactory('ap', 'video-playlist', 'element', elementUrl);
    logger.debug('Fetching remote playlist element %s.', elementUrl, lTags());
    const { body, statusCode } = await fetchAP(elementUrl);
    if (!isPlaylistElementObjectValid(body))
        throw new Error(`Invalid body in fetch playlist element ${elementUrl}`);
    if (checkUrlsSameHost(body.id, elementUrl) !== true) {
        throw new Error(`Playlist element url ${elementUrl} host is different from the AP object id ${body.id}`);
    }
    return { statusCode, elementObject: body };
}
export { fetchRemoteVideoPlaylist, fetchRemotePlaylistElement };
//# sourceMappingURL=url-to-object.js.map