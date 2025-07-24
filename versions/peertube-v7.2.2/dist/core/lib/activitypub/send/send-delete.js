import { getServerActor } from '../../../models/application/application.js';
import { logger } from '../../../helpers/logger.js';
import { VideoCommentModel } from '../../../models/video/video-comment.js';
import { VideoShareModel } from '../../../models/video/video-share.js';
import { audiencify } from '../audience.js';
import { getDeleteActivityPubUrl } from '../url.js';
import { getActorsInvolvedInVideo, getVideoCommentAudience } from './shared/index.js';
import { broadcastToActors, broadcastToFollowers, sendVideoRelatedActivity, unicastTo } from './shared/send-utils.js';
import { AccountModel } from '../../../models/account/account.js';
async function sendDeleteVideo(video, transaction) {
    logger.info('Creating job to broadcast delete of video %s.', video.url);
    const byActor = video.VideoChannel.Account.Actor;
    const activityBuilder = (audience) => {
        const url = getDeleteActivityPubUrl(video.url);
        return buildDeleteActivity(url, video.url, byActor, audience);
    };
    return sendVideoRelatedActivity(activityBuilder, { byActor, video, contextType: 'Delete', transaction });
}
async function sendDeleteActor(byActor, transaction) {
    logger.info('Creating job to broadcast delete of actor %s.', byActor.url);
    const url = getDeleteActivityPubUrl(byActor.url);
    const activity = buildDeleteActivity(url, byActor.url, byActor);
    const actorsInvolved = await VideoShareModel.loadActorsWhoSharedVideosOf(byActor.id, transaction);
    const serverActor = await getServerActor();
    actorsInvolved.push(serverActor);
    actorsInvolved.push(byActor);
    return broadcastToFollowers({
        data: activity,
        byActor,
        toFollowersOf: actorsInvolved,
        contextType: 'Delete',
        transaction
    });
}
async function sendDeleteVideoComment(videoComment, transaction) {
    logger.info('Creating job to send delete of comment %s.', videoComment.url);
    const isVideoOrigin = videoComment.Video.isOwned();
    const url = getDeleteActivityPubUrl(videoComment.url);
    const videoAccount = await AccountModel.load(videoComment.Video.VideoChannel.Account.id, transaction);
    const byActor = videoComment.isOwned()
        ? videoComment.Account.Actor
        : videoAccount.Actor;
    const threadParentComments = await VideoCommentModel.listThreadParentComments({ comment: videoComment, transaction });
    const threadParentCommentsFiltered = threadParentComments.filter(c => !c.isDeleted() && !c.heldForReview);
    const actorsInvolvedInComment = await getActorsInvolvedInVideo(videoComment.Video, transaction);
    actorsInvolvedInComment.push(byActor);
    const audience = getVideoCommentAudience(videoComment, threadParentCommentsFiltered, actorsInvolvedInComment, isVideoOrigin);
    const activity = buildDeleteActivity(url, videoComment.url, byActor, audience);
    const actorsException = [byActor];
    await broadcastToActors({
        data: activity,
        byActor,
        toActors: threadParentCommentsFiltered.map(c => c.Account.Actor),
        transaction,
        contextType: 'Delete',
        actorsException
    });
    await broadcastToFollowers({
        data: activity,
        byActor,
        toFollowersOf: [byActor],
        contextType: 'Delete',
        transaction
    });
    if (isVideoOrigin) {
        return broadcastToFollowers({
            data: activity,
            byActor,
            toFollowersOf: actorsInvolvedInComment,
            transaction,
            contextType: 'Delete',
            actorsException
        });
    }
    return transaction.afterCommit(() => {
        return unicastTo({
            data: activity,
            byActor,
            toActorUrl: videoAccount.Actor.getSharedInbox(),
            contextType: 'Delete'
        });
    });
}
async function sendDeleteVideoPlaylist(videoPlaylist, transaction) {
    logger.info('Creating job to send delete of playlist %s.', videoPlaylist.url);
    const byActor = videoPlaylist.OwnerAccount.Actor;
    const url = getDeleteActivityPubUrl(videoPlaylist.url);
    const activity = buildDeleteActivity(url, videoPlaylist.url, byActor);
    const serverActor = await getServerActor();
    const toFollowersOf = [byActor, serverActor];
    if (videoPlaylist.VideoChannel)
        toFollowersOf.push(videoPlaylist.VideoChannel.Actor);
    return broadcastToFollowers({
        data: activity,
        byActor,
        toFollowersOf,
        contextType: 'Delete',
        transaction
    });
}
export { sendDeleteVideo, sendDeleteActor, sendDeleteVideoComment, sendDeleteVideoPlaylist };
function buildDeleteActivity(url, object, byActor, audience) {
    const activity = {
        type: 'Delete',
        id: url,
        actor: byActor.url,
        object
    };
    if (audience)
        return audiencify(activity, audience);
    return activity;
}
//# sourceMappingURL=send-delete.js.map