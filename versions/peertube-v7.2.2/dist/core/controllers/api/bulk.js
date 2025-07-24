import express from 'express';
import { HttpStatusCode } from '@peertube/peertube-models';
import { removeComment } from '../../lib/video-comment.js';
import { bulkRemoveCommentsOfValidator } from '../../middlewares/validators/bulk.js';
import { VideoCommentModel } from '../../models/video/video-comment.js';
import { apiRateLimiter, asyncMiddleware, authenticate } from '../../middlewares/index.js';
const bulkRouter = express.Router();
bulkRouter.use(apiRateLimiter);
bulkRouter.post('/remove-comments-of', authenticate, asyncMiddleware(bulkRemoveCommentsOfValidator), asyncMiddleware(bulkRemoveCommentsOf));
export { bulkRouter };
async function bulkRemoveCommentsOf(req, res) {
    const account = res.locals.account;
    const body = req.body;
    const user = res.locals.oauth.token.User;
    const filter = body.scope === 'my-videos'
        ? { onVideosOfAccount: user.Account }
        : {};
    const comments = await VideoCommentModel.listForBulkDelete(account, filter);
    res.status(HttpStatusCode.NO_CONTENT_204).end();
    for (const comment of comments) {
        await removeComment(comment, req, res);
    }
}
//# sourceMappingURL=bulk.js.map