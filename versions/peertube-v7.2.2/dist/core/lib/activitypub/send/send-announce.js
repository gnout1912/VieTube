import { logger } from '../../../helpers/logger.js';
import { audiencify, getAudience } from '../audience.js';
import { getActorsInvolvedInVideo, getAudienceFromFollowersOf } from './shared/index.js';
import { broadcastToFollowers } from './shared/send-utils.js';
async function buildAnnounceWithVideoAudience(byActor, videoShare, video, t) {
    const announcedObject = video.url;
    const actorsInvolvedInVideo = await getActorsInvolvedInVideo(video, t);
    const audience = getAudienceFromFollowersOf(actorsInvolvedInVideo);
    const activity = buildAnnounceActivity(videoShare.url, byActor, announcedObject, audience);
    return { activity, actorsInvolvedInVideo };
}
async function sendVideoAnnounce(byActor, videoShare, video, transaction) {
    const { activity, actorsInvolvedInVideo } = await buildAnnounceWithVideoAudience(byActor, videoShare, video, transaction);
    logger.info('Creating job to send announce %s.', videoShare.url);
    return broadcastToFollowers({
        data: activity,
        byActor,
        toFollowersOf: actorsInvolvedInVideo,
        transaction,
        actorsException: [byActor],
        contextType: 'Announce'
    });
}
function buildAnnounceActivity(url, byActor, object, audience) {
    if (!audience)
        audience = getAudience(byActor);
    return audiencify({
        type: 'Announce',
        id: url,
        actor: byActor.url,
        object
    }, audience);
}
export { sendVideoAnnounce, buildAnnounceActivity, buildAnnounceWithVideoAudience };
//# sourceMappingURL=send-announce.js.map