import validator from 'validator';
import { isAbuseReasonValid } from '../abuses.js';
import { exists } from '../misc.js';
import { sanitizeAndCheckActorObject } from './actor.js';
import { isCacheFileObjectValid } from './cache-file.js';
import { isActivityPubUrlValid, isBaseActivityValid, isObjectValid } from './misc.js';
import { isPlaylistObjectValid } from './playlist.js';
import { sanitizeAndCheckVideoCommentObject } from './video-comments.js';
import { sanitizeAndCheckVideoTorrentObject } from './videos.js';
import { isWatchActionObjectValid } from './watch-action.js';
export function isRootActivityValid(activity) {
    return isCollection(activity) || isActivity(activity);
}
function isCollection(activity) {
    return (activity.type === 'Collection' || activity.type === 'OrderedCollection') &&
        validator.default.isInt(activity.totalItems, { min: 0 }) &&
        Array.isArray(activity.items);
}
function isActivity(activity) {
    return isActivityPubUrlValid(activity.id) &&
        exists(activity.actor) &&
        (isActivityPubUrlValid(activity.actor) || isActivityPubUrlValid(activity.actor.id));
}
const activityCheckers = {
    Create: isCreateActivityValid,
    Update: isUpdateActivityValid,
    Delete: isDeleteActivityValid,
    Follow: isFollowActivityValid,
    Accept: isAcceptActivityValid,
    Reject: isRejectActivityValid,
    Announce: isAnnounceActivityValid,
    Undo: isUndoActivityValid,
    Like: isLikeActivityValid,
    View: isViewActivityValid,
    Flag: isFlagActivityValid,
    Dislike: isDislikeActivityValid,
    ApproveReply: isApproveReplyActivityValid,
    RejectReply: isRejectReplyActivityValid
};
export function isActivityValid(activity) {
    const checker = activityCheckers[activity.type];
    if (!checker)
        return false;
    return checker(activity);
}
export function isFlagActivityValid(activity) {
    return isBaseActivityValid(activity, 'Flag') &&
        isAbuseReasonValid(activity.content) &&
        isActivityPubUrlValid(activity.object);
}
export function isLikeActivityValid(activity) {
    return isBaseActivityValid(activity, 'Like') &&
        isObjectValid(activity.object);
}
export function isDislikeActivityValid(activity) {
    return isBaseActivityValid(activity, 'Dislike') &&
        isObjectValid(activity.object);
}
export function isAnnounceActivityValid(activity) {
    return isBaseActivityValid(activity, 'Announce') &&
        isObjectValid(activity.object);
}
export function isViewActivityValid(activity) {
    return isBaseActivityValid(activity, 'View') &&
        isActivityPubUrlValid(activity.actor) &&
        isActivityPubUrlValid(activity.object);
}
export function isCreateActivityValid(activity) {
    return isBaseActivityValid(activity, 'Create') &&
        (isViewActivityValid(activity.object) ||
            isDislikeActivityValid(activity.object) ||
            isFlagActivityValid(activity.object) ||
            isPlaylistObjectValid(activity.object) ||
            isWatchActionObjectValid(activity.object) ||
            isCacheFileObjectValid(activity.object) ||
            sanitizeAndCheckVideoCommentObject(activity.object) ||
            sanitizeAndCheckVideoTorrentObject(activity.object));
}
export function isUpdateActivityValid(activity) {
    return isBaseActivityValid(activity, 'Update') &&
        (isCacheFileObjectValid(activity.object) ||
            isPlaylistObjectValid(activity.object) ||
            sanitizeAndCheckVideoTorrentObject(activity.object) ||
            sanitizeAndCheckActorObject(activity.object));
}
export function isDeleteActivityValid(activity) {
    return isBaseActivityValid(activity, 'Delete') &&
        isObjectValid(activity.object);
}
export function isFollowActivityValid(activity) {
    return isBaseActivityValid(activity, 'Follow') &&
        isObjectValid(activity.object);
}
export function isAcceptActivityValid(activity) {
    return isBaseActivityValid(activity, 'Accept');
}
export function isRejectActivityValid(activity) {
    return isBaseActivityValid(activity, 'Reject');
}
export function isUndoActivityValid(activity) {
    return isBaseActivityValid(activity, 'Undo') &&
        (isFollowActivityValid(activity.object) ||
            isLikeActivityValid(activity.object) ||
            isDislikeActivityValid(activity.object) ||
            isAnnounceActivityValid(activity.object) ||
            isCreateActivityValid(activity.object));
}
export function isApproveReplyActivityValid(activity) {
    return isBaseActivityValid(activity, 'ApproveReply') &&
        isActivityPubUrlValid(activity.object) &&
        isActivityPubUrlValid(activity.inReplyTo);
}
export function isRejectReplyActivityValid(activity) {
    return isBaseActivityValid(activity, 'RejectReply') &&
        isActivityPubUrlValid(activity.object) &&
        isActivityPubUrlValid(activity.inReplyTo);
}
//# sourceMappingURL=activity.js.map