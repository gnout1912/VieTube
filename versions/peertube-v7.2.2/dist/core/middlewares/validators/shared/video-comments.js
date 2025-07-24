import { VideoCommentModel } from '../../../models/video/video-comment.js';
import { forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode, ServerErrorCode } from '@peertube/peertube-models';
async function doesVideoCommentThreadExist(idArg, video, res) {
    const id = forceNumber(idArg);
    const videoComment = await VideoCommentModel.loadById(id);
    if (!videoComment) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video comment thread not found'
        });
        return false;
    }
    if (videoComment.videoId !== video.id) {
        res.fail({
            type: ServerErrorCode.COMMENT_NOT_ASSOCIATED_TO_VIDEO,
            message: 'Video comment is not associated to this video.'
        });
        return false;
    }
    if (videoComment.inReplyToCommentId !== null) {
        res.fail({ message: 'Video comment is not a thread.' });
        return false;
    }
    res.locals.videoCommentThread = videoComment;
    return true;
}
async function doesVideoCommentExist(idArg, video, res) {
    const id = forceNumber(idArg);
    const videoComment = await VideoCommentModel.loadByIdAndPopulateVideoAndAccountAndReply(id);
    if (!videoComment) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video comment thread not found'
        });
        return false;
    }
    if (videoComment.videoId !== video.id) {
        res.fail({
            type: ServerErrorCode.COMMENT_NOT_ASSOCIATED_TO_VIDEO,
            message: 'Video comment is not associated to this video.'
        });
        return false;
    }
    res.locals.videoCommentFull = videoComment;
    return true;
}
async function doesCommentIdExist(idArg, res) {
    const id = forceNumber(idArg);
    const videoComment = await VideoCommentModel.loadByIdAndPopulateVideoAndAccountAndReply(id);
    if (!videoComment) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video comment thread not found'
        });
        return false;
    }
    res.locals.videoCommentFull = videoComment;
    return true;
}
export { doesVideoCommentThreadExist, doesVideoCommentExist, doesCommentIdExist };
//# sourceMappingURL=video-comments.js.map