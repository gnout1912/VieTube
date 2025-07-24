import express from 'express';
import { HttpStatusCode } from '@peertube/peertube-models';
import { logger } from '../../../helpers/logger.js';
import { asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, videoUpdateRateValidator } from '../../../middlewares/index.js';
import { userRateVideo } from '../../../lib/rate.js';
const rateVideoRouter = express.Router();
rateVideoRouter.put('/:id/rate', authenticate, asyncMiddleware(videoUpdateRateValidator), asyncRetryTransactionMiddleware(rateVideo));
export { rateVideoRouter };
async function rateVideo(req, res) {
    const user = res.locals.oauth.token.User;
    const video = res.locals.videoAll;
    await userRateVideo({
        account: user.Account,
        rateType: req.body.rating,
        video
    });
    logger.info('Account video rate for video %s of account %s updated.', video.name, user.username);
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
//# sourceMappingURL=rate.js.map