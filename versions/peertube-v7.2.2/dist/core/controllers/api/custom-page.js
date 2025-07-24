import express from 'express';
import { ServerConfigManager } from '../../lib/server-config-manager.js';
import { ActorCustomPageModel } from '../../models/account/actor-custom-page.js';
import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { apiRateLimiter, asyncMiddleware, authenticate, ensureUserHasRight } from '../../middlewares/index.js';
const customPageRouter = express.Router();
customPageRouter.use(apiRateLimiter);
customPageRouter.get('/homepage/instance', asyncMiddleware(getInstanceHomepage));
customPageRouter.put('/homepage/instance', authenticate, ensureUserHasRight(UserRight.MANAGE_INSTANCE_CUSTOM_PAGE), asyncMiddleware(updateInstanceHomepage));
export { customPageRouter };
async function getInstanceHomepage(req, res) {
    const page = await ActorCustomPageModel.loadInstanceHomepage();
    if (!page) {
        return res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Instance homepage could not be found'
        });
    }
    return res.json(page.toFormattedJSON());
}
async function updateInstanceHomepage(req, res) {
    const content = req.body.content;
    await ActorCustomPageModel.updateInstanceHomepage(content);
    ServerConfigManager.Instance.updateHomepageState(content);
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
//# sourceMappingURL=custom-page.js.map