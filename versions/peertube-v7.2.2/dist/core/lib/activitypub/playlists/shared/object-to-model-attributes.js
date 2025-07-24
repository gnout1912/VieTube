import { VideoPlaylistPrivacy } from '@peertube/peertube-models';
import { hasAPPublic } from '../../../../helpers/activity-pub-utils.js';
export function playlistObjectToDBAttributes(playlistObject, to) {
    const privacy = hasAPPublic(to)
        ? VideoPlaylistPrivacy.PUBLIC
        : VideoPlaylistPrivacy.UNLISTED;
    return {
        name: playlistObject.name,
        description: playlistObject.content,
        privacy,
        url: playlistObject.id,
        uuid: playlistObject.uuid,
        videoChannelId: null,
        ownerAccountId: null,
        createdAt: new Date(playlistObject.published),
        updatedAt: new Date(playlistObject.updated)
    };
}
export function playlistElementObjectToDBAttributes(elementObject, videoPlaylist, video) {
    return {
        position: elementObject.position,
        url: elementObject.id,
        startTimestamp: elementObject.startTimestamp || null,
        stopTimestamp: elementObject.stopTimestamp || null,
        videoPlaylistId: videoPlaylist.id,
        videoId: video.id
    };
}
//# sourceMappingURL=object-to-model-attributes.js.map