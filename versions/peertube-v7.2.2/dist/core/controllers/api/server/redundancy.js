import express from 'express';
import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { JobQueue } from '../../../lib/job-queue/index.js';
import { VideoRedundancyModel } from '../../../models/redundancy/video-redundancy.js';
import { logger } from '../../../helpers/logger.js';
import { removeRedundanciesOfServer, removeVideoRedundancy } from '../../../lib/redundancy.js';
import { asyncMiddleware, authenticate, ensureUserHasRight, paginationValidator, setDefaultPagination, setDefaultVideoRedundanciesSort, videoRedundanciesSortValidator } from '../../../middlewares/index.js';
import { addVideoRedundancyValidator, listVideoRedundanciesValidator, removeVideoRedundancyValidator, updateServerRedundancyValidator } from '../../../middlewares/validators/redundancy.js';
const serverRedundancyRouter = express.Router();
serverRedundancyRouter.put('/redundancy/:host', authenticate, ensureUserHasRight(UserRight.MANAGE_SERVER_FOLLOW), asyncMiddleware(updateServerRedundancyValidator), asyncMiddleware(updateRedundancy));
serverRedundancyRouter.get('/redundancy/videos', authenticate, ensureUserHasRight(UserRight.MANAGE_VIDEOS_REDUNDANCIES), listVideoRedundanciesValidator, paginationValidator, videoRedundanciesSortValidator, setDefaultVideoRedundanciesSort, setDefaultPagination, asyncMiddleware(listVideoRedundancies));
serverRedundancyRouter.post('/redundancy/videos', authenticate, ensureUserHasRight(UserRight.MANAGE_VIDEOS_REDUNDANCIES), addVideoRedundancyValidator, asyncMiddleware(addVideoRedundancy));
serverRedundancyRouter.delete('/redundancy/videos/:redundancyId', authenticate, ensureUserHasRight(UserRight.MANAGE_VIDEOS_REDUNDANCIES), removeVideoRedundancyValidator, asyncMiddleware(removeVideoRedundancyController));
export { serverRedundancyRouter };
async function listVideoRedundancies(req, res) {
    const resultList = await VideoRedundancyModel.listForApi({
        start: req.query.start,
        count: req.query.count,
        sort: req.query.sort,
        target: req.query.target,
        strategy: req.query.strategy
    });
    const result = {
        total: resultList.total,
        data: resultList.data.map(r => VideoRedundancyModel.toFormattedJSONStatic(r))
    };
    return res.json(result);
}
async function addVideoRedundancy(req, res) {
    const payload = {
        videoId: res.locals.onlyVideo.id
    };
    await JobQueue.Instance.createJob({
        type: 'video-redundancy',
        payload
    });
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function removeVideoRedundancyController(req, res) {
    await removeVideoRedundancy(res.locals.videoRedundancy);
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function updateRedundancy(req, res) {
    const server = res.locals.server;
    server.redundancyAllowed = req.body.redundancyAllowed;
    await server.save();
    if (server.redundancyAllowed !== true) {
        removeRedundanciesOfServer(server.id)
            .catch(err => logger.error('Cannot remove redundancy of %s.', server.host, { err }));
    }
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
//# sourceMappingURL=redundancy.js.map