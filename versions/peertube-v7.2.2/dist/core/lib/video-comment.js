import { AutomaticTagPolicy, UserRight, VideoCommentPolicy } from '@peertube/peertube-models';
import { logger } from '../helpers/logger.js';
import { sequelizeTypescript } from '../initializers/database.js';
import { AccountModel } from '../models/account/account.js';
import { AccountAutomaticTagPolicyModel } from '../models/automatic-tag/account-automatic-tag-policy.js';
import cloneDeep from 'lodash-es/cloneDeep.js';
import { VideoCommentModel } from '../models/video/video-comment.js';
import { sendCreateVideoCommentIfNeeded, sendDeleteVideoComment, sendReplyApproval } from './activitypub/send/index.js';
import { getLocalVideoCommentActivityPubUrl } from './activitypub/url.js';
import { AutomaticTagger } from './automatic-tags/automatic-tagger.js';
import { setAndSaveCommentAutomaticTags } from './automatic-tags/automatic-tags.js';
import { Notifier } from './notifier/notifier.js';
import { Hooks } from './plugins/hooks.js';
export async function removeComment(commentArg, req, res) {
    let videoCommentInstanceBefore;
    await sequelizeTypescript.transaction(async (t) => {
        const comment = await VideoCommentModel.loadByUrlAndPopulateAccountAndVideoAndReply(commentArg.url, t);
        videoCommentInstanceBefore = cloneDeep(comment);
        if (comment.isOwned() || comment.Video.isOwned()) {
            await sendDeleteVideoComment(comment, t);
        }
        comment.markAsDeleted();
        await comment.save({ transaction: t });
        logger.info('Video comment %d deleted.', comment.id);
    });
    Hooks.runAction('action:api.video-comment.deleted', { comment: videoCommentInstanceBefore, req, res });
}
export async function approveComment(commentArg) {
    await sequelizeTypescript.transaction(async (t) => {
        const comment = await VideoCommentModel.loadByIdAndPopulateVideoAndAccountAndReply(commentArg.id, t);
        const oldHeldForReview = comment.heldForReview;
        comment.heldForReview = false;
        await comment.save({ transaction: t });
        if (comment.isOwned()) {
            await sendCreateVideoCommentIfNeeded(comment, t);
        }
        else {
            sendReplyApproval(comment, 'ApproveReply');
        }
        if (oldHeldForReview !== comment.heldForReview) {
            Notifier.Instance.notifyOnNewCommentApproval(comment);
        }
        logger.info('Video comment %d approved.', comment.id);
    });
}
export async function createLocalVideoComment(options) {
    const { user, video, text, inReplyToComment } = options;
    let originCommentId = null;
    let inReplyToCommentId = null;
    if (inReplyToComment && inReplyToComment !== null) {
        originCommentId = inReplyToComment.originCommentId || inReplyToComment.id;
        inReplyToCommentId = inReplyToComment.id;
    }
    return sequelizeTypescript.transaction(async (transaction) => {
        const account = await AccountModel.load(user.Account.id, transaction);
        const automaticTags = await new AutomaticTagger().buildCommentsAutomaticTags({
            ownerAccount: video.VideoChannel.Account,
            text,
            transaction
        });
        const heldForReview = await shouldCommentBeHeldForReview({ user, video, automaticTags, transaction });
        const comment = await VideoCommentModel.create({
            text,
            originCommentId,
            inReplyToCommentId,
            videoId: video.id,
            accountId: account.id,
            heldForReview,
            url: new Date().toISOString()
        }, { transaction, validate: false });
        comment.url = getLocalVideoCommentActivityPubUrl(video, comment);
        const savedComment = await comment.save({ transaction });
        await setAndSaveCommentAutomaticTags({ comment: savedComment, automaticTags, transaction });
        savedComment.InReplyToVideoComment = inReplyToComment;
        savedComment.Video = video;
        savedComment.Account = account;
        await sendCreateVideoCommentIfNeeded(savedComment, transaction);
        return savedComment;
    });
}
export function buildFormattedCommentTree(resultList) {
    const comments = resultList.data;
    const comment = comments.shift();
    const thread = {
        comment: comment.toFormattedJSON(),
        children: []
    };
    const idx = {
        [comment.id]: thread
    };
    while (comments.length !== 0) {
        const childComment = comments.shift();
        const childCommentThread = {
            comment: childComment.toFormattedJSON(),
            children: []
        };
        const parentCommentThread = idx[childComment.inReplyToCommentId];
        if (!parentCommentThread)
            continue;
        parentCommentThread.children.push(childCommentThread);
        idx[childComment.id] = childCommentThread;
    }
    return thread;
}
export async function shouldCommentBeHeldForReview(options) {
    const { user, video, transaction, automaticTags } = options;
    if (video.isOwned() && user) {
        if (user.hasRight(UserRight.MANAGE_ANY_VIDEO_COMMENT))
            return false;
        if (user.Account.id === video.VideoChannel.accountId)
            return false;
    }
    if (video.commentsPolicy === VideoCommentPolicy.REQUIRES_APPROVAL)
        return true;
    if (video.isOwned() !== true)
        return false;
    const ownerAccountTags = automaticTags
        .filter(t => t.accountId === video.VideoChannel.accountId)
        .map(t => t.name);
    if (ownerAccountTags.length === 0)
        return false;
    return AccountAutomaticTagPolicyModel.hasPolicyOnTags({
        accountId: video.VideoChannel.accountId,
        policy: AutomaticTagPolicy.REVIEW_COMMENT,
        tags: ownerAccountTags,
        transaction
    });
}
//# sourceMappingURL=video-comment.js.map