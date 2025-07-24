import { logger } from '../../../helpers/logger.js';
import { getLocalApproveReplyActivityPubUrl } from '../url.js';
import { unicastTo } from './shared/send-utils.js';
export function sendReplyApproval(comment, type) {
    logger.info('Creating job to approve reply %s.', comment.url);
    const data = buildApprovalActivity({ comment, type });
    return unicastTo({
        data,
        byActor: comment.Video.VideoChannel.Account.Actor,
        toActorUrl: comment.Account.Actor.inboxUrl,
        contextType: type
    });
}
export function buildApprovalActivity(options) {
    var _a, _b;
    const { comment, type } = options;
    return {
        type,
        id: type === 'ApproveReply'
            ? getLocalApproveReplyActivityPubUrl(comment.Video, comment)
            : undefined,
        actor: comment.Video.VideoChannel.Account.Actor.url,
        inReplyTo: (_b = (_a = comment.InReplyToVideoComment) === null || _a === void 0 ? void 0 : _a.url) !== null && _b !== void 0 ? _b : comment.Video.url,
        object: comment.url
    };
}
//# sourceMappingURL=send-reply-approval.js.map