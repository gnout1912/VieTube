import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { CachePromiseFactory } from '../../../helpers/promise-cache.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { fetchRemoteActor } from './shared/index.js';
import { APActorUpdater } from './updater.js';
import { getUrlFromWebfinger } from './webfinger.js';
const promiseCache = new CachePromiseFactory(doRefresh, (options) => options.actor.url);
function refreshActorIfNeeded(options) {
    const actorArg = options.actor;
    if (!actorArg.isOutdated())
        return Promise.resolve({ actor: actorArg, refreshed: false });
    return promiseCache.run(options);
}
export { refreshActorIfNeeded };
async function doRefresh(options) {
    const { actor: actorArg, fetchedType } = options;
    const actor = fetchedType === 'all'
        ? actorArg
        : await ActorModel.loadByUrlAndPopulateAccountAndChannel(actorArg.url);
    const lTags = loggerTagsFactory('ap', 'actor', 'refresh', actor.url);
    logger.info('Refreshing actor %s.', actor.url, lTags());
    try {
        const actorUrl = await getActorUrl(actor);
        const { actorObject } = await fetchRemoteActor(actorUrl);
        if (actorObject === undefined) {
            logger.info('Cannot fetch remote actor %s in refresh actor.', actorUrl);
            return { actor, refreshed: false };
        }
        const updater = new APActorUpdater(actorObject, actor);
        await updater.update();
        return { refreshed: true, actor };
    }
    catch (err) {
        const statusCode = err.statusCode;
        if (statusCode === HttpStatusCode.NOT_FOUND_404 || statusCode === HttpStatusCode.GONE_410) {
            logger.info('Deleting actor %s because there is a 404/410 in refresh actor.', actor.url, lTags());
            actor.Account
                ? await actor.Account.destroy()
                : await actor.VideoChannel.destroy();
            return { actor: undefined, refreshed: false };
        }
        logger.info('Cannot refresh actor %s.', actor.url, Object.assign({ err }, lTags()));
        return { actor, refreshed: false };
    }
}
function getActorUrl(actor) {
    return getUrlFromWebfinger(actor.preferredUsername + '@' + actor.getHost())
        .catch(err => {
        logger.info('Cannot get actor URL from webfinger, keeping the old one.', { err });
        return actor.url;
    });
}
//# sourceMappingURL=refresh.js.map