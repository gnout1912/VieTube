import { pick } from '@peertube/peertube-core-utils';
import { HttpStatusCode, UserRight, VideoCommentPolicy } from '@peertube/peertube-models';
import { getServerActor } from '../../../models/application/application.js';
import express from 'express';
import { CommentAuditView, auditLoggerFactory, getAuditIdFromRes } from '../../../helpers/audit-logger.js';
import { getFormattedObjects } from '../../../helpers/utils.js';
import { Notifier } from '../../../lib/notifier/index.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { approveComment, buildFormattedCommentTree, createLocalVideoComment, removeComment } from '../../../lib/video-comment.js';
import { asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, ensureUserHasRight, optionalAuthenticate, paginationValidator, setDefaultPagination, setDefaultSort } from '../../../middlewares/index.js';
import { addVideoCommentReplyValidator, addVideoCommentThreadValidator, approveVideoCommentValidator, listAllVideoCommentsForAdminValidator, listVideoCommentThreadsValidator, listVideoThreadCommentsValidator, removeVideoCommentValidator, videoCommentThreadsSortValidator, videoCommentsValidator } from '../../../middlewares/validators/index.js';
import { VideoCommentModel } from '../../../models/video/video-comment.js';
const auditLogger = auditLoggerFactory('comments');
const videoCommentRouter = express.Router();
videoCommentRouter.get('/:videoId/comment-threads', paginationValidator, videoCommentThreadsSortValidator, setDefaultSort, setDefaultPagination, asyncMiddleware(listVideoCommentThreadsValidator), optionalAuthenticate, asyncMiddleware(listVideoThreads));
videoCommentRouter.get('/:videoId/comment-threads/:threadId', asyncMiddleware(listVideoThreadCommentsValidator), optionalAuthenticate, asyncMiddleware(listVideoThreadComments));
videoCommentRouter.post('/:videoId/comment-threads', authenticate, asyncMiddleware(addVideoCommentThreadValidator), asyncRetryTransactionMiddleware(addVideoCommentThread));
videoCommentRouter.post('/:videoId/comments/:commentId', authenticate, asyncMiddleware(addVideoCommentReplyValidator), asyncRetryTransactionMiddleware(addVideoCommentReply));
videoCommentRouter.delete('/:videoId/comments/:commentId', authenticate, asyncMiddleware(removeVideoCommentValidator), asyncRetryTransactionMiddleware(removeVideoComment));
videoCommentRouter.post('/:videoId/comments/:commentId/approve', authenticate, asyncMiddleware(approveVideoCommentValidator), asyncMiddleware(approveVideoComment));
videoCommentRouter.get('/comments', authenticate, ensureUserHasRight(UserRight.SEE_ALL_COMMENTS), paginationValidator, videoCommentsValidator, setDefaultSort, setDefaultPagination, asyncMiddleware(listAllVideoCommentsForAdminValidator), asyncMiddleware(listComments));
export { videoCommentRouter };
async function listComments(req, res) {
    var _a, _b;
    const options = Object.assign(Object.assign({}, pick(req.query, [
        'start',
        'count',
        'sort',
        'isLocal',
        'onLocalVideo',
        'search',
        'searchAccount',
        'searchVideo',
        'autoTagOneOf'
    ])), { videoId: (_a = res.locals.onlyImmutableVideo) === null || _a === void 0 ? void 0 : _a.id, videoChannelOwnerId: (_b = res.locals.videoChannel) === null || _b === void 0 ? void 0 : _b.id, autoTagOfAccountId: (await getServerActor()).Account.id, heldForReview: undefined });
    const resultList = await VideoCommentModel.listCommentsForApi(options);
    return res.json({
        total: resultList.total,
        data: resultList.data.map(c => c.toFormattedForAdminOrUserJSON())
    });
}
async function listVideoThreads(req, res) {
    const video = res.locals.onlyVideo;
    const user = res.locals.oauth ? res.locals.oauth.token.User : undefined;
    let resultList;
    if (video.commentsPolicy !== VideoCommentPolicy.DISABLED) {
        const apiOptions = await Hooks.wrapObject({
            video,
            start: req.query.start,
            count: req.query.count,
            sort: req.query.sort,
            user
        }, 'filter:api.video-threads.list.params');
        resultList = await Hooks.wrapPromiseFun(VideoCommentModel.listThreadsForApi.bind(VideoCommentModel), apiOptions, 'filter:api.video-threads.list.result');
    }
    else {
        resultList = {
            total: 0,
            totalNotDeletedComments: 0,
            data: []
        };
    }
    return res.json(Object.assign(Object.assign({}, getFormattedObjects(resultList.data, resultList.total)), { totalNotDeletedComments: resultList.totalNotDeletedComments }));
}
async function listVideoThreadComments(req, res) {
    const video = res.locals.onlyVideo;
    const user = res.locals.oauth ? res.locals.oauth.token.User : undefined;
    let resultList;
    if (video.commentsPolicy !== VideoCommentPolicy.DISABLED) {
        const apiOptions = await Hooks.wrapObject({
            video,
            threadId: res.locals.videoCommentThread.id,
            user
        }, 'filter:api.video-thread-comments.list.params');
        resultList = await Hooks.wrapPromiseFun(VideoCommentModel.listThreadCommentsForApi.bind(VideoCommentModel), apiOptions, 'filter:api.video-thread-comments.list.result');
    }
    else {
        resultList = {
            total: 0,
            data: []
        };
    }
    if (resultList.data.length === 0) {
        return res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'No comments were found'
        });
    }
    return res.json(buildFormattedCommentTree(resultList));
}
async function addVideoCommentThread(req, res) {
    const videoCommentInfo = req.body;
    const comment = await createLocalVideoComment({
        text: videoCommentInfo.text,
        inReplyToComment: null,
        video: res.locals.videoAll,
        user: res.locals.oauth.token.User
    });
    Notifier.Instance.notifyOnNewComment(comment);
    auditLogger.create(getAuditIdFromRes(res), new CommentAuditView(comment.toFormattedJSON()));
    Hooks.runAction('action:api.video-thread.created', { comment, req, res });
    return res.json({ comment: comment.toFormattedJSON() });
}
async function addVideoCommentReply(req, res) {
    const videoCommentInfo = req.body;
    const comment = await createLocalVideoComment({
        text: videoCommentInfo.text,
        inReplyToComment: res.locals.videoCommentFull,
        video: res.locals.videoAll,
        user: res.locals.oauth.token.User
    });
    Notifier.Instance.notifyOnNewComment(comment);
    auditLogger.create(getAuditIdFromRes(res), new CommentAuditView(comment.toFormattedJSON()));
    Hooks.runAction('action:api.video-comment-reply.created', { comment, req, res });
    return res.json({ comment: comment.toFormattedJSON() });
}
async function removeVideoComment(req, res) {
    const comment = res.locals.videoCommentFull;
    await removeComment(comment, req, res);
    auditLogger.delete(getAuditIdFromRes(res), new CommentAuditView(comment.toFormattedJSON()));
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
async function approveVideoComment(req, res) {
    await approveComment(res.locals.videoCommentFull);
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
//# sourceMappingURL=comment.js.map