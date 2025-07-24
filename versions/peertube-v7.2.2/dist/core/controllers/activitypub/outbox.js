import { VideoPrivacy } from '@peertube/peertube-models';
import { activityPubContextify } from '../../helpers/activity-pub-utils.js';
import { activityPubCollectionPagination } from '../../lib/activitypub/collection.js';
import { getContextFilter } from '../../lib/activitypub/context.js';
import express from 'express';
import { logger } from '../../helpers/logger.js';
import { buildAudience } from '../../lib/activitypub/audience.js';
import { buildAnnounceActivity, buildCreateActivity } from '../../lib/activitypub/send/index.js';
import { accountHandleGetValidatorFactory, activityPubRateLimiter, asyncMiddleware, videoChannelsHandleValidatorFactory } from '../../middlewares/index.js';
import { apPaginationValidator } from '../../middlewares/validators/activitypub/index.js';
import { VideoModel } from '../../models/video/video.js';
import { activityPubResponse } from './utils.js';
const outboxRouter = express.Router();
outboxRouter.get('/accounts/:handle/outbox', activityPubRateLimiter, apPaginationValidator, accountHandleGetValidatorFactory({ checkIsLocal: true, checkManage: false }), asyncMiddleware(outboxController));
outboxRouter.get('/video-channels/:handle/outbox', activityPubRateLimiter, apPaginationValidator, asyncMiddleware(videoChannelsHandleValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(outboxController));
export { outboxRouter };
async function outboxController(req, res) {
    const accountOrVideoChannel = res.locals.account || res.locals.videoChannel;
    const actor = accountOrVideoChannel.Actor;
    const actorOutboxUrl = actor.url + '/outbox';
    logger.info('Receiving outbox request for %s.', actorOutboxUrl);
    const handler = (start, count) => buildActivities(actor, start, count);
    const json = await activityPubCollectionPagination(actorOutboxUrl, handler, req.query.page, req.query.size);
    return activityPubResponse(activityPubContextify(json, 'Collection', getContextFilter()), res);
}
async function buildActivities(actor, start, count) {
    const data = await VideoModel.listAllAndSharedByActorForOutbox(actor.id, start, count);
    const activities = [];
    for (const video of data.data) {
        const byActor = video.VideoChannel.Account.Actor;
        const createActivityAudience = buildAudience([byActor.followersUrl], video.privacy === VideoPrivacy.PUBLIC);
        if (video.VideoShares !== undefined && video.VideoShares.length !== 0) {
            const videoShare = video.VideoShares[0];
            const announceActivity = buildAnnounceActivity(videoShare.url, actor, video.url, createActivityAudience);
            activities.push(announceActivity);
        }
        else {
            const videoObject = await video.toActivityPubObject();
            const createActivity = buildCreateActivity(video.url, byActor, videoObject, createActivityAudience);
            activities.push(createActivity);
        }
    }
    return {
        data: activities,
        total: data.total
    };
}
//# sourceMappingURL=outbox.js.map