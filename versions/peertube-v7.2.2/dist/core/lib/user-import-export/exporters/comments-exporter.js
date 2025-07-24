import { AbstractUserExporter } from './abstract-user-exporter.js';
import { VideoCommentModel } from '../../../models/video/video-comment.js';
import Bluebird from 'bluebird';
import { audiencify, getAudience } from '../../activitypub/audience.js';
import { buildCreateActivity } from '../../activitypub/send/send-create.js';
export class CommentsExporter extends AbstractUserExporter {
    async export() {
        const comments = await VideoCommentModel.listForExport(this.user.Account.id);
        return {
            json: {
                comments: this.formatCommentsJSON(comments)
            },
            activityPubOutbox: await this.formatCommentsAP(comments),
            staticFiles: []
        };
    }
    formatCommentsJSON(comments) {
        return comments.map(c => {
            var _a;
            return ({
                url: c.url,
                text: c.text,
                createdAt: c.createdAt.toISOString(),
                videoUrl: c.Video.url,
                inReplyToCommentUrl: (_a = c === null || c === void 0 ? void 0 : c.InReplyToVideoComment) === null || _a === void 0 ? void 0 : _a.url
            });
        });
    }
    formatCommentsAP(comments) {
        return Bluebird.mapSeries(comments, async ({ url }) => {
            const comment = await VideoCommentModel.loadByUrlAndPopulateReplyAndVideoImmutableAndAccount(url);
            const threadParentComments = await VideoCommentModel.listThreadParentComments({ comment });
            let commentObject = comment.toActivityPubObject(threadParentComments);
            const isPublic = true;
            const audience = getAudience(comment.Account.Actor, isPublic);
            commentObject = audiencify(commentObject, audience);
            return buildCreateActivity(comment.url, comment.Account.Actor, commentObject, audience);
        });
    }
}
//# sourceMappingURL=comments-exporter.js.map