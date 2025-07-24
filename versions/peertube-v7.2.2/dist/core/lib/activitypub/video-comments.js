import { HttpStatusCode, VideoCommentPolicy } from '@peertube/peertube-models';
import Bluebird from 'bluebird';
import { sanitizeAndCheckVideoCommentObject } from '../../helpers/custom-validators/activitypub/video-comments.js';
import { logger } from '../../helpers/logger.js';
import { ACTIVITY_PUB, CRAWL_REQUEST_CONCURRENCY } from '../../initializers/constants.js';
import { VideoCommentModel } from '../../models/video/video-comment.js';
import { AutomaticTagger } from '../automatic-tags/automatic-tagger.js';
import { setAndSaveCommentAutomaticTags } from '../automatic-tags/automatic-tags.js';
import { isRemoteVideoCommentAccepted } from '../moderation.js';
import { Hooks } from '../plugins/hooks.js';
import { shouldCommentBeHeldForReview } from '../video-comment.js';
import { fetchAP } from './activity.js';
import { getOrCreateAPActor } from './actors/index.js';
import { checkUrlsSameHost } from './url.js';
import { canVideoBeFederated, getOrCreateAPVideo } from './videos/index.js';
export async function addVideoComments(commentUrls) {
    return Bluebird.map(commentUrls, async (commentUrl) => {
        try {
            await resolveThread({ url: commentUrl, isVideo: false });
        }
        catch (err) {
            if (err.statusCode === HttpStatusCode.NOT_FOUND_404 || err.statusCode === HttpStatusCode.GONE_410) {
                logger.debug(`Cannot resolve thread ${commentUrl} that does not exist anymore`, { err });
                return;
            }
            logger.info(`Cannot resolve thread ${commentUrl}`, { err });
        }
    }, { concurrency: CRAWL_REQUEST_CONCURRENCY });
}
export async function resolveThread(params) {
    const { url, isVideo } = params;
    if (params.commentCreated === undefined)
        params.commentCreated = false;
    if (params.comments === undefined)
        params.comments = [];
    if (isVideo === false || isVideo === undefined) {
        const result = await resolveCommentFromDB(params);
        if (result)
            return result;
    }
    try {
        if (isVideo === true || isVideo === undefined) {
            return await tryToResolveThreadFromVideo(params);
        }
    }
    catch (err) {
        logger.debug('Cannot resolve thread from video %s, maybe because it was not a video', url, { err });
    }
    return resolveRemoteParentComment(params);
}
async function resolveCommentFromDB(params) {
    const { url, comments, commentCreated } = params;
    const commentFromDatabase = await VideoCommentModel.loadByUrlAndPopulateReplyAndVideoImmutableAndAccount(url);
    if (!commentFromDatabase)
        return undefined;
    let parentComments = comments.concat([commentFromDatabase]);
    if (commentFromDatabase.InReplyToVideoComment) {
        const data = await VideoCommentModel.listThreadParentComments({ comment: commentFromDatabase, order: 'DESC' });
        parentComments = parentComments.concat(data);
    }
    return resolveThread({
        url: commentFromDatabase.Video.url,
        comments: parentComments,
        isVideo: true,
        commentCreated
    });
}
async function tryToResolveThreadFromVideo(params) {
    const { url, comments, commentCreated } = params;
    const syncParam = { rates: true, shares: true, comments: false, refreshVideo: false };
    const { video } = await getOrCreateAPVideo({ videoObject: url, syncParam });
    if (video.isOwned() && !canVideoBeFederated(video)) {
        throw new Error('Cannot resolve thread of video that is not compatible with federation');
    }
    if (video.commentsPolicy === VideoCommentPolicy.DISABLED) {
        return undefined;
    }
    let resultComment;
    if (comments.length !== 0) {
        const firstReply = comments[comments.length - 1];
        firstReply.inReplyToCommentId = null;
        firstReply.originCommentId = null;
        firstReply.videoId = video.id;
        firstReply.changed('updatedAt', true);
        firstReply.Video = video;
        if (await isRemoteCommentAccepted(firstReply) !== true) {
            return undefined;
        }
        const firstReplyAutomaticTags = await getAutomaticTagsAndAssignReview(firstReply, video);
        comments[comments.length - 1] = await firstReply.save();
        await setAndSaveCommentAutomaticTags({ comment: firstReply, automaticTags: firstReplyAutomaticTags });
        for (let i = comments.length - 2; i >= 0; i--) {
            const comment = comments[i];
            comment.originCommentId = firstReply.id;
            comment.inReplyToCommentId = comments[i + 1].id;
            comment.videoId = video.id;
            comment.changed('updatedAt', true);
            comment.Video = video;
            if (await isRemoteCommentAccepted(comment) !== true) {
                return undefined;
            }
            const automaticTags = await getAutomaticTagsAndAssignReview(comment, video);
            comments[i] = await comment.save();
            await setAndSaveCommentAutomaticTags({ comment, automaticTags });
        }
        resultComment = comments[0];
    }
    return { video, comment: resultComment, commentCreated };
}
async function getAutomaticTagsAndAssignReview(comment, video) {
    if (comment.id)
        return [];
    const ownerAccount = video.VideoChannel.Account;
    const automaticTags = await new AutomaticTagger().buildCommentsAutomaticTags({ ownerAccount, text: comment.text });
    if (video.isOwned() || comment.isOwned()) {
        comment.heldForReview = await shouldCommentBeHeldForReview({ user: null, video, automaticTags });
    }
    else {
        comment.heldForReview = false;
    }
    return automaticTags;
}
async function resolveRemoteParentComment(params) {
    const { url, comments } = params;
    if (comments.length > ACTIVITY_PUB.MAX_RECURSION_COMMENTS) {
        throw new Error('Recursion limit reached when resolving a thread');
    }
    const { body } = await fetchAP(url);
    if (sanitizeAndCheckVideoCommentObject(body) === false) {
        throw new Error(`Remote video comment JSON ${url} is not valid:` + JSON.stringify(body));
    }
    const actorUrl = body.attributedTo;
    if (!actorUrl && body.type !== 'Tombstone')
        throw new Error('Miss attributed to in comment');
    if (actorUrl && checkUrlsSameHost(url, actorUrl) !== true) {
        throw new Error(`Actor url ${actorUrl} has not the same host than the comment url ${url}`);
    }
    if (checkUrlsSameHost(body.id, url) !== true) {
        throw new Error(`Comment url ${url} host is different from the AP object id ${body.id}`);
    }
    const actor = actorUrl
        ? await getOrCreateAPActor(actorUrl, 'all')
        : null;
    const comment = new VideoCommentModel({
        url: body.id,
        text: body.content ? body.content : '',
        videoId: null,
        accountId: actor ? actor.Account.id : null,
        inReplyToCommentId: null,
        originCommentId: null,
        createdAt: new Date(body.published),
        updatedAt: new Date(body.updated),
        replyApproval: body.replyApproval,
        deletedAt: body.deleted
            ? new Date(body.deleted)
            : null
    });
    comment.Account = actor ? actor.Account : null;
    logger.debug('Created remote comment %s', comment.url, { comment });
    return resolveThread({
        url: body.inReplyTo,
        comments: comments.concat([comment]),
        commentCreated: true
    });
}
async function isRemoteCommentAccepted(comment) {
    if (comment.id)
        return true;
    const acceptParameters = {
        comment
    };
    const acceptedResult = await Hooks.wrapFun(isRemoteVideoCommentAccepted, acceptParameters, 'filter:activity-pub.remote-video-comment.create.accept.result');
    if (!acceptedResult || acceptedResult.accepted !== true) {
        logger.info('Refused to create a remote comment.', { acceptedResult, acceptParameters });
        return false;
    }
    return true;
}
//# sourceMappingURL=video-comments.js.map