import { sendLike, sendUndoDislike, sendUndoLike } from './send/index.js';
import { sendDislike } from './send/send-dislike.js';
import { getVideoDislikeActivityPubUrlByLocalActor, getVideoLikeActivityPubUrlByLocalActor } from './url.js';
import { federateVideoIfNeeded } from './videos/index.js';
async function sendVideoRateChange(account, video, likes, dislikes, t) {
    if (video.isOwned())
        return federateVideoIfNeeded(video, false, t);
    return sendVideoRateChangeToOrigin(account, video, likes, dislikes, t);
}
function getLocalRateUrl(rateType, actor, video) {
    return rateType === 'like'
        ? getVideoLikeActivityPubUrlByLocalActor(actor, video)
        : getVideoDislikeActivityPubUrlByLocalActor(actor, video);
}
export { getLocalRateUrl, sendVideoRateChange };
async function sendVideoRateChangeToOrigin(account, video, likes, dislikes, t) {
    if (video.isOwned())
        return;
    const actor = account.Actor;
    if (likes < 0)
        await sendUndoLike(actor, video, t);
    if (dislikes < 0)
        await sendUndoDislike(actor, video, t);
    if (likes > 0)
        await sendLike(actor, video, t);
    if (dislikes > 0)
        await sendDislike(actor, video, t);
}
//# sourceMappingURL=video-rates.js.map