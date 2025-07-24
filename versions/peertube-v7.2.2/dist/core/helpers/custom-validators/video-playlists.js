import { exists } from './misc.js';
import validator from 'validator';
import { CONSTRAINTS_FIELDS, VIDEO_PLAYLIST_PRIVACIES, VIDEO_PLAYLIST_TYPES } from '../../initializers/constants.js';
const PLAYLISTS_CONSTRAINT_FIELDS = CONSTRAINTS_FIELDS.VIDEO_PLAYLISTS;
function isVideoPlaylistNameValid(value) {
    return exists(value) && validator.default.isLength(value, PLAYLISTS_CONSTRAINT_FIELDS.NAME);
}
function isVideoPlaylistDescriptionValid(value) {
    return value === null || (exists(value) && validator.default.isLength(value, PLAYLISTS_CONSTRAINT_FIELDS.DESCRIPTION));
}
function isVideoPlaylistPrivacyValid(value) {
    return validator.default.isInt(value + '') && VIDEO_PLAYLIST_PRIVACIES[value] !== undefined;
}
function isVideoPlaylistTimestampValid(value) {
    return value === null || (exists(value) && validator.default.isInt('' + value, { min: 0 }));
}
function isVideoPlaylistTypeValid(value) {
    return exists(value) && VIDEO_PLAYLIST_TYPES[value] !== undefined;
}
export { isVideoPlaylistNameValid, isVideoPlaylistDescriptionValid, isVideoPlaylistPrivacyValid, isVideoPlaylistTimestampValid, isVideoPlaylistTypeValid };
//# sourceMappingURL=video-playlists.js.map