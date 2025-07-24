import { getAPPublicValue } from '../../../../helpers/activity-pub-utils.js';
import { ActorModel } from '../../../../models/actor/actor.js';
import { VideoShareModel } from '../../../../models/video/video-share.js';
export function getOriginVideoAudience(accountActor, actorsInvolvedInVideo = []) {
    return {
        to: [accountActor.url],
        cc: actorsInvolvedInVideo.map(a => a.followersUrl)
    };
}
export function getVideoCommentAudience(videoComment, threadParentComments, actorsInvolvedInVideo, isOrigin = false) {
    const to = [getAPPublicValue()];
    const cc = [];
    if (isOrigin === false) {
        cc.push(videoComment.Video.VideoChannel.Account.Actor.url);
    }
    cc.push(videoComment.Account.Actor.followersUrl);
    for (const parentComment of threadParentComments) {
        if (parentComment.isDeleted())
            continue;
        cc.push(parentComment.Account.Actor.url);
    }
    return {
        to,
        cc: cc.concat(actorsInvolvedInVideo.map(a => a.followersUrl))
    };
}
export function getAudienceFromFollowersOf(actorsInvolvedInObject) {
    return {
        to: [getAPPublicValue()].concat(actorsInvolvedInObject.map(a => a.followersUrl)),
        cc: []
    };
}
export async function getActorsInvolvedInVideo(video, t) {
    var _a, _b;
    const actors = await VideoShareModel.listActorIdsAndFollowerUrlsByShare(video.id, t);
    const alreadyLoadedActor = (_b = (_a = video.VideoChannel) === null || _a === void 0 ? void 0 : _a.Account) === null || _b === void 0 ? void 0 : _b.Actor;
    const videoActor = (alreadyLoadedActor === null || alreadyLoadedActor === void 0 ? void 0 : alreadyLoadedActor.url) && (alreadyLoadedActor === null || alreadyLoadedActor === void 0 ? void 0 : alreadyLoadedActor.followersUrl)
        ? alreadyLoadedActor
        : await ActorModel.loadAccountActorFollowerUrlByVideoId(video.id, t);
    if (videoActor)
        actors.push(videoActor);
    return actors;
}
//# sourceMappingURL=audience-utils.js.map