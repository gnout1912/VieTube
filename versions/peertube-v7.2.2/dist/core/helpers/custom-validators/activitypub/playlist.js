import validator from 'validator';
import { exists, isDateValid, isUUIDValid } from '../misc.js';
import { isVideoPlaylistNameValid } from '../video-playlists.js';
import { isActivityPubUrlValid } from './misc.js';
export function isPlaylistObjectValid(object) {
    if (!object || object.type !== 'Playlist')
        return false;
    if (!object.uuid && object['identifier'])
        object.uuid = object['identifier'];
    return validator.default.isInt(object.totalItems + '') &&
        isVideoPlaylistNameValid(object.name) &&
        isUUIDValid(object.uuid) &&
        isDateValid(object.published) &&
        isDateValid(object.updated);
}
export function isPlaylistElementObjectValid(object) {
    return exists(object) &&
        object.type === 'PlaylistElement' &&
        validator.default.isInt(object.position + '') &&
        isActivityPubUrlValid(object.url);
}
//# sourceMappingURL=playlist.js.map