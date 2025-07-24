import { VideoPlaylistPrivacy, VideoPrivacy } from '@peertube/peertube-models';
import { AccountModel } from '../../../models/account/account.js';
import { getServerActor } from '../../../models/application/application.js';
import { VideoModel } from '../../../models/video/video.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { VideoCommentModel } from '../../../models/video/video-comment.js';
import { audiencify, getAudience } from '../audience.js';
import { canVideoBeFederated } from '../videos/federate.js';
import { broadcastToActors, broadcastToFollowers, getActorsInvolvedInVideo, getAudienceFromFollowersOf, getVideoCommentAudience, sendVideoActivityToOrigin, sendVideoRelatedActivity, unicastTo } from './shared/index.js';
const lTags = loggerTagsFactory('ap', 'create');
export async function sendCreateVideo(video, transaction) {
    if (!canVideoBeFederated(video))
        return undefined;
    logger.info('Creating job to send video creation of %s.', video.url, lTags(video.uuid));
    const byActor = video.VideoChannel.Account.Actor;
    const videoObject = await video.toActivityPubObject();
    const audience = getAudience(byActor, video.privacy === VideoPrivacy.PUBLIC);
    const createActivity = buildCreateActivity(video.url, byActor, videoObject, audience);
    return broadcastToFollowers({
        data: createActivity,
        byActor,
        toFollowersOf: [byActor],
        transaction,
        contextType: 'Video'
    });
}
export async function sendCreateCacheFile(byActor, video, fileRedundancy) {
    logger.info('Creating job to send file cache of %s.', fileRedundancy.url, lTags(video.uuid));
    return sendVideoRelatedCreateActivity({
        byActor,
        video,
        url: fileRedundancy.url,
        object: fileRedundancy.toActivityPubObject(),
        contextType: 'CacheFile'
    });
}
export async function sendCreateWatchAction(stats, transaction) {
    logger.info('Creating job to send create watch action %s.', stats.url, lTags(stats.uuid));
    const byActor = await getServerActor();
    const activityBuilder = (audience) => {
        return buildCreateActivity(stats.url, byActor, stats.toActivityPubObject(), audience);
    };
    return sendVideoActivityToOrigin(activityBuilder, { byActor, video: stats.Video, transaction, contextType: 'WatchAction' });
}
export async function sendCreateVideoPlaylist(playlist, transaction) {
    if (playlist.privacy === VideoPlaylistPrivacy.PRIVATE)
        return undefined;
    logger.info('Creating job to send create video playlist of %s.', playlist.url, lTags(playlist.uuid));
    const byActor = playlist.OwnerAccount.Actor;
    const audience = getAudience(byActor, playlist.privacy === VideoPlaylistPrivacy.PUBLIC);
    const object = await playlist.toActivityPubObject(null, transaction);
    const createActivity = buildCreateActivity(playlist.url, byActor, object, audience);
    const serverActor = await getServerActor();
    const toFollowersOf = [byActor, serverActor];
    if (playlist.VideoChannel)
        toFollowersOf.push(playlist.VideoChannel.Actor);
    return broadcastToFollowers({
        data: createActivity,
        byActor,
        toFollowersOf,
        transaction,
        contextType: 'Playlist'
    });
}
export async function sendCreateVideoCommentIfNeeded(comment, transaction) {
    const isOrigin = comment.Video.isOwned();
    if (isOrigin) {
        const videoWithBlacklist = await VideoModel.loadWithBlacklist(comment.Video.id);
        if (!canVideoBeFederated(videoWithBlacklist)) {
            logger.debug(`Do not send comment ${comment.url} on a video that cannot be federated`);
            return undefined;
        }
        if (comment.heldForReview) {
            logger.debug(`Do not send comment ${comment.url} that requires approval`);
            return undefined;
        }
    }
    logger.info('Creating job to send comment %s.', comment.url);
    const byActor = comment.Account.Actor;
    const videoAccount = await AccountModel.load(comment.Video.VideoChannel.Account.id, transaction);
    const threadParentComments = await VideoCommentModel.listThreadParentComments({ comment, transaction });
    const commentObject = comment.toActivityPubObject(threadParentComments);
    const actorsInvolvedInComment = await getActorsInvolvedInVideo(comment.Video, transaction);
    actorsInvolvedInComment.push(byActor);
    const parentsCommentActors = threadParentComments.filter(c => !c.isDeleted() && !c.heldForReview)
        .map(c => c.Account.Actor);
    let audience;
    if (isOrigin) {
        audience = getVideoCommentAudience(comment, threadParentComments, actorsInvolvedInComment, isOrigin);
    }
    else {
        audience = getAudienceFromFollowersOf(actorsInvolvedInComment.concat(parentsCommentActors));
    }
    const createActivity = buildCreateActivity(comment.url, byActor, commentObject, audience);
    const actorsException = [byActor];
    await broadcastToActors({
        data: createActivity,
        byActor,
        toActors: parentsCommentActors,
        transaction,
        actorsException,
        contextType: 'Comment'
    });
    await broadcastToFollowers({
        data: createActivity,
        byActor,
        toFollowersOf: [byActor],
        transaction,
        contextType: 'Comment'
    });
    if (isOrigin) {
        return broadcastToFollowers({
            data: createActivity,
            byActor,
            toFollowersOf: actorsInvolvedInComment,
            transaction,
            actorsException,
            contextType: 'Comment'
        });
    }
    return transaction.afterCommit(() => {
        return unicastTo({
            data: createActivity,
            byActor,
            toActorUrl: videoAccount.Actor.getSharedInbox(),
            contextType: 'Comment'
        });
    });
}
export function buildCreateActivity(url, byActor, object, audience) {
    if (!audience)
        audience = getAudience(byActor);
    return audiencify({
        type: 'Create',
        id: url + '/activity',
        actor: byActor.url,
        object: typeof object === 'string'
            ? object
            : audiencify(object, audience)
    }, audience);
}
async function sendVideoRelatedCreateActivity(options) {
    const activityBuilder = (audience) => {
        return buildCreateActivity(options.url, options.byActor, options.object, audience);
    };
    return sendVideoRelatedActivity(activityBuilder, options);
}
//# sourceMappingURL=send-create.js.map