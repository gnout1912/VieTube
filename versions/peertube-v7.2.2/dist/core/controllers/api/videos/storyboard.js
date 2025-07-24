import express from 'express';
import { getVideoWithAttributes } from '../../../helpers/video.js';
import { StoryboardModel } from '../../../models/video/storyboard.js';
import { asyncMiddleware, videosGetValidator } from '../../../middlewares/index.js';
const storyboardRouter = express.Router();
storyboardRouter.get('/:id/storyboards', asyncMiddleware(videosGetValidator), asyncMiddleware(listStoryboards));
export { storyboardRouter };
async function listStoryboards(req, res) {
    const video = getVideoWithAttributes(res);
    const storyboards = await StoryboardModel.listStoryboardsOf(video);
    return res.json({
        storyboards: storyboards.map(s => s.toFormattedJSON())
    });
}
//# sourceMappingURL=storyboard.js.map