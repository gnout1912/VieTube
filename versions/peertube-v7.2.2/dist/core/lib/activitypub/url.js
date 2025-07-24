import { REMOTE_SCHEME, WEBSERVER } from '../../initializers/constants.js';
export function getLocalVideoActivityPubUrl(video) {
    return WEBSERVER.URL + '/videos/watch/' + video.uuid;
}
export function getLocalVideoPlaylistActivityPubUrl(videoPlaylist) {
    return WEBSERVER.URL + '/video-playlists/' + videoPlaylist.uuid;
}
export function getLocalVideoPlaylistElementActivityPubUrl(playlist, element) {
    return WEBSERVER.URL + '/video-playlists/' + playlist.uuid + '/videos/' + element.id;
}
export function getLocalVideoCacheStreamingPlaylistActivityPubUrl(video, playlist) {
    return `${WEBSERVER.URL}/redundancy/streaming-playlists/${playlist.getStringType()}/${video.uuid}`;
}
export function getLocalVideoCommentActivityPubUrl(video, videoComment) {
    return WEBSERVER.URL + '/videos/watch/' + video.uuid + '/comments/' + videoComment.id;
}
export function getLocalVideoChannelActivityPubUrl(videoChannelName) {
    return WEBSERVER.URL + '/video-channels/' + videoChannelName;
}
export function getLocalAccountActivityPubUrl(accountName) {
    return WEBSERVER.URL + '/accounts/' + accountName;
}
export function getLocalAbuseActivityPubUrl(abuse) {
    return WEBSERVER.URL + '/admin/abuses/' + abuse.id;
}
export function getLocalVideoViewActivityPubUrl(byActor, video, viewerIdentifier) {
    return byActor.url + '/views/videos/' + video.id + '/' + viewerIdentifier;
}
export function getLocalVideoViewerActivityPubUrl(stats) {
    return WEBSERVER.URL + '/videos/local-viewer/' + stats.uuid;
}
export function getVideoLikeActivityPubUrlByLocalActor(byActor, video) {
    return byActor.url + '/likes/' + video.id;
}
export function getVideoDislikeActivityPubUrlByLocalActor(byActor, video) {
    return byActor.url + '/dislikes/' + video.id;
}
export function getLocalVideoSharesActivityPubUrl(video) {
    return video.url + '/announces';
}
export function getLocalVideoCommentsActivityPubUrl(video) {
    return video.url + '/comments';
}
export function getLocalVideoChaptersActivityPubUrl(video) {
    return video.url + '/chapters';
}
export function getLocalVideoLikesActivityPubUrl(video) {
    return video.url + '/likes';
}
export function getLocalVideoDislikesActivityPubUrl(video) {
    return video.url + '/dislikes';
}
export function getLocalActorFollowActivityPubUrl(follower, following) {
    return follower.url + '/follows/' + following.id;
}
export function getLocalActorFollowAcceptActivityPubUrl(actorFollow) {
    return WEBSERVER.URL + '/accepts/follows/' + actorFollow.id;
}
export function getLocalActorFollowRejectActivityPubUrl() {
    return WEBSERVER.URL + '/rejects/follows/' + new Date().toISOString();
}
export function getLocalVideoAnnounceActivityPubUrl(byActor, video) {
    return video.url + '/announces/' + byActor.id;
}
export function getDeleteActivityPubUrl(originalUrl) {
    return originalUrl + '/delete';
}
export function getUpdateActivityPubUrl(originalUrl, updatedAt) {
    return originalUrl + '/updates/' + updatedAt;
}
export function getUndoActivityPubUrl(originalUrl) {
    return originalUrl + '/undo';
}
export function getLocalApproveReplyActivityPubUrl(video, comment) {
    return getLocalVideoCommentActivityPubUrl(video, comment) + '/approve-reply';
}
export function getAbuseIdentifier(abuse) {
    var _a, _b, _c, _d, _e, _f;
    return ((_b = (_a = abuse.VideoAbuse) === null || _a === void 0 ? void 0 : _a.Video) === null || _b === void 0 ? void 0 : _b.url) ||
        ((_d = (_c = abuse.VideoCommentAbuse) === null || _c === void 0 ? void 0 : _c.VideoComment) === null || _d === void 0 ? void 0 : _d.url) ||
        ((_f = (_e = abuse.FlaggedAccount) === null || _e === void 0 ? void 0 : _e.Actor) === null || _f === void 0 ? void 0 : _f.url) ||
        abuse.id + '';
}
export function buildRemoteUrl(video, path, scheme) {
    if (!scheme)
        scheme = REMOTE_SCHEME.HTTP;
    const host = video.VideoChannel.Actor.Server.host;
    return scheme + '://' + host + path;
}
export function checkUrlsSameHost(url1, url2) {
    const idHost = new URL(url1).host;
    const actorHost = new URL(url2).host;
    return idHost && actorHost && idHost.toLowerCase() === actorHost.toLowerCase();
}
//# sourceMappingURL=url.js.map