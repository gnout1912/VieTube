import express from 'express';
import { asyncMiddleware, asyncRetryTransactionMiddleware, authenticate } from '../../../middlewares/index.js';
import { updateVideoChaptersValidator, videosCustomGetValidator } from '../../../middlewares/validators/index.js';
import { VideoChapterModel } from '../../../models/video/video-chapter.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { federateVideoIfNeeded } from '../../../lib/activitypub/videos/federate.js';
import { replaceChapters } from '../../../lib/video-chapters.js';
const videoChaptersRouter = express.Router();
videoChaptersRouter.get('/:id/chapters', asyncMiddleware(videosCustomGetValidator('only-video-and-blacklist')), asyncMiddleware(listVideoChapters));
videoChaptersRouter.put('/:videoId/chapters', authenticate, asyncMiddleware(updateVideoChaptersValidator), asyncRetryTransactionMiddleware(replaceVideoChapters));
export { videoChaptersRouter };
async function listVideoChapters(req, res) {
    const chapters = await VideoChapterModel.listChaptersOfVideo(res.locals.onlyVideo.id);
    return res.json({ chapters: chapters.map(c => c.toFormattedJSON()) });
}
async function replaceVideoChapters(req, res) {
    const body = req.body;
    const video = res.locals.videoAll;
    await retryTransactionWrapper(() => {
        return sequelizeTypescript.transaction(async (t) => {
            await replaceChapters({ video, chapters: body.chapters, transaction: t });
            await federateVideoIfNeeded(video, false, t);
        });
    });
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
//# sourceMappingURL=chapters.js.map