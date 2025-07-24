import { logger, loggerTagsFactory } from '../helpers/logger.js';
import { CONFIG } from '../initializers/config.js';
import { ActorFollowModel } from '../models/actor/actor-follow.js';
import { getServerActor } from '../models/application/application.js';
import { VideoRedundancyModel } from '../models/redundancy/video-redundancy.js';
import { sendUndoCacheFile } from './activitypub/send/index.js';
const lTags = loggerTagsFactory('redundancy');
async function removeVideoRedundancy(videoRedundancy, t) {
    const serverActor = await getServerActor();
    if (videoRedundancy.actorId === serverActor.id)
        await sendUndoCacheFile(serverActor, videoRedundancy, t);
    await videoRedundancy.destroy({ transaction: t });
}
async function removeRedundanciesOfServer(serverId) {
    const redundancies = await VideoRedundancyModel.listLocalOfServer(serverId);
    for (const redundancy of redundancies) {
        await removeVideoRedundancy(redundancy);
    }
}
async function isRedundancyAccepted(activity, byActor) {
    const configAcceptFrom = CONFIG.REMOTE_REDUNDANCY.VIDEOS.ACCEPT_FROM;
    if (configAcceptFrom === 'nobody') {
        logger.info('Do not accept remote redundancy %s due instance accept policy.', activity.id, lTags());
        return false;
    }
    if (configAcceptFrom === 'followings') {
        const serverActor = await getServerActor();
        const allowed = await ActorFollowModel.isFollowedBy(byActor.id, serverActor.id);
        if (allowed !== true) {
            logger.info('Do not accept remote redundancy %s because actor %s is not followed by our instance.', activity.id, byActor.url, lTags());
            return false;
        }
    }
    return true;
}
export { isRedundancyAccepted, removeRedundanciesOfServer, removeVideoRedundancy };
//# sourceMappingURL=redundancy.js.map