import { hasAPPublic } from '../../activity-pub-utils.js';
import validator from 'validator';
import { exists, isDateValid } from '../misc.js';
import { isActivityPubUrlValid } from './misc.js';
function sanitizeAndCheckVideoCommentObject(comment) {
    if (!comment)
        return false;
    if (!isCommentTypeValid(comment))
        return false;
    normalizeComment(comment);
    if (comment.type === 'Tombstone') {
        return isActivityPubUrlValid(comment.id) &&
            isDateValid(comment.published) &&
            isDateValid(comment.deleted) &&
            isActivityPubUrlValid(comment.url);
    }
    return isActivityPubUrlValid(comment.id) &&
        isCommentContentValid(comment.content) &&
        isActivityPubUrlValid(comment.inReplyTo) &&
        isDateValid(comment.published) &&
        isActivityPubUrlValid(comment.url) &&
        (!exists(comment.replyApproval) || isActivityPubUrlValid(comment.replyApproval)) &&
        (hasAPPublic(comment.to) || hasAPPublic(comment.cc));
}
export { sanitizeAndCheckVideoCommentObject };
function isCommentContentValid(content) {
    return exists(content) && validator.default.isLength('' + content, { min: 1 });
}
function normalizeComment(comment) {
    if (!comment)
        return;
    if (typeof comment.url !== 'string') {
        if (typeof comment.url === 'object')
            comment.url = comment.url.href || comment.url.url;
        else
            comment.url = comment.id;
    }
}
function isCommentTypeValid(comment) {
    if (comment.type === 'Note')
        return true;
    if (comment.type === 'Tombstone' && comment.formerType === 'Note')
        return true;
    return false;
}
//# sourceMappingURL=video-comments.js.map