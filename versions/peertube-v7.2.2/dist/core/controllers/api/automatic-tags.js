import { AutomaticTagPolicy, HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { AutomaticTagger } from '../../lib/automatic-tags/automatic-tagger.js';
import { setAccountAutomaticTagsPolicy } from '../../lib/automatic-tags/automatic-tags.js';
import { manageAccountAutomaticTagsValidator, updateAutomaticTagPoliciesValidator } from '../../middlewares/validators/automatic-tags.js';
import { getServerActor } from '../../models/application/application.js';
import express from 'express';
import { apiRateLimiter, asyncMiddleware, authenticate, ensureUserHasRight } from '../../middlewares/index.js';
const automaticTagRouter = express.Router();
automaticTagRouter.use(apiRateLimiter);
automaticTagRouter.get('/policies/accounts/:accountName/comments', authenticate, asyncMiddleware(manageAccountAutomaticTagsValidator), asyncMiddleware(getAutomaticTagPolicies));
automaticTagRouter.put('/policies/accounts/:accountName/comments', authenticate, asyncMiddleware(manageAccountAutomaticTagsValidator), asyncMiddleware(updateAutomaticTagPoliciesValidator), asyncMiddleware(updateAutomaticTagPolicies));
automaticTagRouter.get('/accounts/:accountName/available', authenticate, asyncMiddleware(manageAccountAutomaticTagsValidator), asyncMiddleware(getAccountAutomaticTagAvailable));
automaticTagRouter.get('/server/available', authenticate, ensureUserHasRight(UserRight.MANAGE_INSTANCE_AUTO_TAGS), asyncMiddleware(getServerAutomaticTagAvailable));
export { automaticTagRouter };
async function getAutomaticTagPolicies(req, res) {
    const result = await AutomaticTagger.getAutomaticTagPolicies(res.locals.account);
    return res.json(result);
}
async function updateAutomaticTagPolicies(req, res) {
    await setAccountAutomaticTagsPolicy({
        account: res.locals.account,
        policy: AutomaticTagPolicy.REVIEW_COMMENT,
        tags: req.body.review
    });
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
async function getAccountAutomaticTagAvailable(req, res) {
    const result = await AutomaticTagger.getAutomaticTagAvailable(res.locals.account);
    return res.json(result);
}
async function getServerAutomaticTagAvailable(req, res) {
    const result = await AutomaticTagger.getAutomaticTagAvailable((await getServerActor()).Account);
    return res.json(result);
}
//# sourceMappingURL=automatic-tags.js.map