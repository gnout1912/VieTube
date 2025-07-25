import { query } from 'express-validator';
import { HttpStatusCode } from '@peertube/peertube-models';
import { isWebfingerLocalResourceValid } from '../../helpers/custom-validators/webfinger.js';
import { getHostWithPort } from '../../helpers/express-utils.js';
import { ActorModel } from '../../models/actor/actor.js';
import { areValidationErrors } from './shared/index.js';
const webfingerValidator = [
    query('resource')
        .custom(isWebfingerLocalResourceValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const handle = getHostWithPort(req.query.resource.substr(5));
        const [name] = handle.split('@');
        const actor = await ActorModel.loadLocalUrlByName(name);
        if (!actor) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Actor not found'
            });
        }
        res.locals.actorUrl = actor;
        return next();
    }
];
export { webfingerValidator };
//# sourceMappingURL=webfinger.js.map