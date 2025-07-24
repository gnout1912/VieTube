import { AccountAutomaticTagPolicyModel } from '../../models/automatic-tag/account-automatic-tag-policy.js';
import { AutomaticTagModel } from '../../models/automatic-tag/automatic-tag.js';
import { CommentAutomaticTagModel } from '../../models/automatic-tag/comment-automatic-tag.js';
import { VideoAutomaticTagModel } from '../../models/automatic-tag/video-automatic-tag.js';
export async function setAndSaveCommentAutomaticTags(options) {
    const { comment, automaticTags, transaction } = options;
    if (automaticTags.length === 0)
        return;
    const commentAutomaticTags = [];
    const accountIds = new Set(automaticTags.map(t => t.accountId));
    for (const accountId of accountIds) {
        await CommentAutomaticTagModel.deleteAllOfAccountAndComment({ accountId, commentId: comment.id, transaction });
    }
    for (const tag of automaticTags) {
        const automaticTagInstance = await AutomaticTagModel.findOrCreateAutomaticTag({ tag: tag.name, transaction });
        const [commentAutomaticTag] = await CommentAutomaticTagModel.upsert({
            accountId: tag.accountId,
            automaticTagId: automaticTagInstance.id,
            commentId: comment.id
        }, { transaction });
        commentAutomaticTag.AutomaticTag = automaticTagInstance;
        commentAutomaticTags.push(commentAutomaticTag);
    }
    comment.CommentAutomaticTags = commentAutomaticTags;
}
export async function setAndSaveVideoAutomaticTags(options) {
    const { video, automaticTags, transaction } = options;
    if (automaticTags.length === 0)
        return;
    const accountIds = new Set(automaticTags.map(t => t.accountId));
    for (const accountId of accountIds) {
        await VideoAutomaticTagModel.deleteAllOfAccountAndVideo({ accountId, videoId: video.id, transaction });
    }
    const videoAutomaticTags = [];
    for (const tag of automaticTags) {
        const automaticTagInstance = await AutomaticTagModel.findOrCreateAutomaticTag({ tag: tag.name, transaction });
        const [videoAutomaticTag] = await VideoAutomaticTagModel.upsert({
            accountId: tag.accountId,
            automaticTagId: automaticTagInstance.id,
            videoId: video.id
        }, { transaction });
        videoAutomaticTag.AutomaticTag = automaticTagInstance;
        videoAutomaticTags.push(videoAutomaticTag);
    }
}
export async function setAccountAutomaticTagsPolicy(options) {
    const { account, policy, tags, transaction } = options;
    await AccountAutomaticTagPolicyModel.deleteOfAccount({ account, policy, transaction });
    for (const tag of tags) {
        const automaticTagInstance = await AutomaticTagModel.findOrCreateAutomaticTag({ tag, transaction });
        await AccountAutomaticTagPolicyModel.create({
            policy,
            accountId: account.id,
            automaticTagId: automaticTagInstance.id
        }, { transaction });
    }
}
//# sourceMappingURL=automatic-tags.js.map