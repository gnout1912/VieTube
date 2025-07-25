import { HttpStatusCode, VideoPlaylistPrivacy, VideoPrivacy } from '@peertube/peertube-models';
import { activityPubCollectionPagination } from '../../lib/activitypub/collection.js';
import { getContextFilter } from '../../lib/activitypub/context.js';
import { buildChaptersAPHasPart } from '../../lib/activitypub/video-chapters.js';
import { InternalEventEmitter } from '../../lib/internal-event-emitter.js';
import { getServerActor } from '../../models/application/application.js';
import { VideoChapterModel } from '../../models/video/video-chapter.js';
import cors from 'cors';
import express from 'express';
import { activityPubContextify } from '../../helpers/activity-pub-utils.js';
import { ROUTE_CACHE_LIFETIME, WEBSERVER } from '../../initializers/constants.js';
import { audiencify, getAudience } from '../../lib/activitypub/audience.js';
import { buildAnnounceWithVideoAudience, buildApprovalActivity, buildLikeActivity } from '../../lib/activitypub/send/index.js';
import { buildCreateActivity } from '../../lib/activitypub/send/send-create.js';
import { buildDislikeActivity } from '../../lib/activitypub/send/send-dislike.js';
import { getLocalVideoChaptersActivityPubUrl, getLocalVideoCommentsActivityPubUrl, getLocalVideoDislikesActivityPubUrl, getLocalVideoLikesActivityPubUrl, getLocalVideoSharesActivityPubUrl } from '../../lib/activitypub/url.js';
import { apVideoChaptersSetCacheKey, buildAPVideoChaptersGroupsCache, cacheRoute, cacheRouteFactory } from '../../middlewares/cache/cache.js';
import { activityPubRateLimiter, asyncMiddleware, executeIfActivityPub, videoChannelsHandleValidatorFactory, videosCustomGetValidator, videosShareValidator } from '../../middlewares/index.js';
import { accountHandleGetValidatorFactory, getAccountVideoRateValidatorFactory, getVideoLocalViewerValidator, videoCommentGetValidator } from '../../middlewares/validators/index.js';
import { videoPlaylistRedundancyGetValidator } from '../../middlewares/validators/redundancy.js';
import { videoPlaylistElementAPGetValidator, videoPlaylistsGetValidator } from '../../middlewares/validators/videos/video-playlists.js';
import { AccountVideoRateModel } from '../../models/account/account-video-rate.js';
import { AccountModel } from '../../models/account/account.js';
import { ActorFollowModel } from '../../models/actor/actor-follow.js';
import { VideoCommentModel } from '../../models/video/video-comment.js';
import { VideoPlaylistModel } from '../../models/video/video-playlist.js';
import { VideoShareModel } from '../../models/video/video-share.js';
import { activityPubResponse } from './utils.js';
const activityPubClientRouter = express.Router();
activityPubClientRouter.use(cors());
activityPubClientRouter.get(['/accounts?/:handle', '/accounts?/:handle/video-channels', '/a/:handle', '/a/:handle/video-channels'], executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(accountHandleGetValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(accountController));
activityPubClientRouter.get('/accounts?/:handle/followers', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(accountHandleGetValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(accountFollowersController));
activityPubClientRouter.get('/accounts?/:handle/following', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(accountHandleGetValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(accountFollowingController));
activityPubClientRouter.get('/accounts?/:handle/playlists', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(accountHandleGetValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(accountPlaylistsController));
activityPubClientRouter.get('/accounts?/:accountName/likes/:videoId', executeIfActivityPub, activityPubRateLimiter, cacheRoute(ROUTE_CACHE_LIFETIME.ACTIVITY_PUB.VIDEOS), asyncMiddleware(getAccountVideoRateValidatorFactory('like')), asyncMiddleware(getAccountVideoRateFactory('like')));
activityPubClientRouter.get('/accounts?/:accountName/dislikes/:videoId', executeIfActivityPub, activityPubRateLimiter, cacheRoute(ROUTE_CACHE_LIFETIME.ACTIVITY_PUB.VIDEOS), asyncMiddleware(getAccountVideoRateValidatorFactory('dislike')), asyncMiddleware(getAccountVideoRateFactory('dislike')));
activityPubClientRouter.get('/videos/watch/:id/comments', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videosCustomGetValidator('only-video-and-blacklist')), asyncMiddleware(videoCommentsController));
activityPubClientRouter.get('/videos/watch/:videoId/comments/:commentId/approve-reply', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoCommentGetValidator), asyncMiddleware(videoCommentApprovedController));
activityPubClientRouter.get('/videos/watch/:videoId/comments/:commentId/activity', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoCommentGetValidator), asyncMiddleware(videoCommentController));
activityPubClientRouter.get(['/videos/watch/:videoId/comments/:commentId', '/w/:videoId([^;]+);threadId=:commentId([0-9]+)'], executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoCommentGetValidator), asyncMiddleware(videoCommentController));
activityPubClientRouter.get(['/videos/watch/:id', '/w/:id'], executeIfActivityPub, activityPubRateLimiter, cacheRoute(ROUTE_CACHE_LIFETIME.ACTIVITY_PUB.VIDEOS), asyncMiddleware(videosCustomGetValidator('all')), asyncMiddleware(videoController));
activityPubClientRouter.get('/videos/watch/:id/activity', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videosCustomGetValidator('all')), asyncMiddleware(videoController));
activityPubClientRouter.get('/videos/watch/:id/announces', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videosCustomGetValidator('only-video-and-blacklist')), asyncMiddleware(videoAnnouncesController));
activityPubClientRouter.get('/videos/watch/:id/announces/:actorId', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videosShareValidator), asyncMiddleware(videoAnnounceController));
activityPubClientRouter.get('/videos/watch/:id/likes', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videosCustomGetValidator('only-video-and-blacklist')), asyncMiddleware(videoLikesController));
activityPubClientRouter.get('/videos/watch/:id/dislikes', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videosCustomGetValidator('only-video-and-blacklist')), asyncMiddleware(videoDislikesController));
const { middleware: chaptersCacheRouteMiddleware, instance: chaptersApiCache } = cacheRouteFactory();
InternalEventEmitter.Instance.on('chapters-updated', ({ video }) => {
    if (video.remote)
        return;
    chaptersApiCache.clearGroupSafe(buildAPVideoChaptersGroupsCache({ videoId: video.uuid }));
});
activityPubClientRouter.get('/videos/watch/:id/chapters', executeIfActivityPub, activityPubRateLimiter, apVideoChaptersSetCacheKey, chaptersCacheRouteMiddleware(ROUTE_CACHE_LIFETIME.ACTIVITY_PUB.VIDEOS), asyncMiddleware(videosCustomGetValidator('only-video-and-blacklist')), asyncMiddleware(videoChaptersController));
activityPubClientRouter.get(['/video-channels/:handle', '/video-channels/:handle/videos', '/c/:handle', '/c/:handle/videos'], executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoChannelsHandleValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(videoChannelController));
activityPubClientRouter.get('/video-channels/:handle/followers', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoChannelsHandleValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(videoChannelFollowersController));
activityPubClientRouter.get('/video-channels/:handle/following', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoChannelsHandleValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(videoChannelFollowingController));
activityPubClientRouter.get('/video-channels/:handle/playlists', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoChannelsHandleValidatorFactory({ checkIsLocal: true, checkManage: false })), asyncMiddleware(videoChannelPlaylistsController));
activityPubClientRouter.get('/redundancy/streaming-playlists/:streamingPlaylistType/:videoId', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoPlaylistRedundancyGetValidator), asyncMiddleware(videoRedundancyController));
activityPubClientRouter.get(['/video-playlists/:playlistId', '/videos/watch/playlist/:playlistId', '/w/p/:playlistId'], executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoPlaylistsGetValidator('all')), asyncMiddleware(videoPlaylistController));
activityPubClientRouter.get('/video-playlists/:playlistId/videos/:playlistElementId', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(videoPlaylistElementAPGetValidator), asyncMiddleware(videoPlaylistElementController));
activityPubClientRouter.get('/videos/local-viewer/:localViewerId', executeIfActivityPub, activityPubRateLimiter, asyncMiddleware(getVideoLocalViewerValidator), asyncMiddleware(getVideoLocalViewerController));
export { activityPubClientRouter };
async function accountController(req, res) {
    const account = res.locals.account;
    return activityPubResponse(activityPubContextify(await account.toActivityPubObject(), 'Actor', getContextFilter()), res);
}
async function accountFollowersController(req, res) {
    const account = res.locals.account;
    const activityPubResult = await actorFollowers(req, account.Actor);
    return activityPubResponse(activityPubContextify(activityPubResult, 'Collection', getContextFilter()), res);
}
async function accountFollowingController(req, res) {
    const account = res.locals.account;
    const activityPubResult = await actorFollowing(req, account.Actor);
    return activityPubResponse(activityPubContextify(activityPubResult, 'Collection', getContextFilter()), res);
}
async function accountPlaylistsController(req, res) {
    const account = res.locals.account;
    const activityPubResult = await actorPlaylists(req, { account });
    return activityPubResponse(activityPubContextify(activityPubResult, 'Collection', getContextFilter()), res);
}
async function videoChannelPlaylistsController(req, res) {
    const channel = res.locals.videoChannel;
    const activityPubResult = await actorPlaylists(req, { channel });
    return activityPubResponse(activityPubContextify(activityPubResult, 'Collection', getContextFilter()), res);
}
function getAccountVideoRateFactory(rateType) {
    return (req, res) => {
        const accountVideoRate = res.locals.accountVideoRate;
        const byActor = accountVideoRate.Account.Actor;
        const APObject = rateType === 'like'
            ? buildLikeActivity(accountVideoRate.url, byActor, accountVideoRate.Video)
            : buildDislikeActivity(accountVideoRate.url, byActor, accountVideoRate.Video);
        return activityPubResponse(activityPubContextify(APObject, 'Rate', getContextFilter()), res);
    };
}
async function videoController(req, res) {
    const video = res.locals.videoAll;
    if (redirectIfNotOwned(video.url, res))
        return;
    const videoAP = await video.lightAPToFullAP(undefined);
    const audience = getAudience(videoAP.VideoChannel.Account.Actor, videoAP.privacy === VideoPrivacy.PUBLIC);
    const videoObject = audiencify(await videoAP.toActivityPubObject(), audience);
    if (req.path.endsWith('/activity')) {
        const data = buildCreateActivity(videoAP.url, video.VideoChannel.Account.Actor, videoObject, audience);
        return activityPubResponse(activityPubContextify(data, 'Video', getContextFilter()), res);
    }
    return activityPubResponse(activityPubContextify(videoObject, 'Video', getContextFilter()), res);
}
async function videoAnnounceController(req, res) {
    const share = res.locals.videoShare;
    if (redirectIfNotOwned(share.url, res))
        return;
    const { activity } = await buildAnnounceWithVideoAudience(share.Actor, share, res.locals.videoAll, undefined);
    return activityPubResponse(activityPubContextify(activity, 'Announce', getContextFilter()), res);
}
async function videoAnnouncesController(req, res) {
    const video = res.locals.onlyVideo;
    if (redirectIfNotOwned(video.url, res))
        return;
    const handler = async (start, count) => {
        const result = await VideoShareModel.listAndCountByVideoId(video.id, start, count);
        return {
            total: result.total,
            data: result.data.map(r => r.url)
        };
    };
    const json = await activityPubCollectionPagination(getLocalVideoSharesActivityPubUrl(video), handler, req.query.page);
    return activityPubResponse(activityPubContextify(json, 'Collection', getContextFilter()), res);
}
async function videoLikesController(req, res) {
    const video = res.locals.onlyVideo;
    if (redirectIfNotOwned(video.url, res))
        return;
    const json = await videoRates(req, 'like', video, getLocalVideoLikesActivityPubUrl(video));
    return activityPubResponse(activityPubContextify(json, 'Collection', getContextFilter()), res);
}
async function videoDislikesController(req, res) {
    const video = res.locals.onlyVideo;
    if (redirectIfNotOwned(video.url, res))
        return;
    const json = await videoRates(req, 'dislike', video, getLocalVideoDislikesActivityPubUrl(video));
    return activityPubResponse(activityPubContextify(json, 'Collection', getContextFilter()), res);
}
async function videoCommentsController(req, res) {
    const video = res.locals.onlyVideo;
    if (redirectIfNotOwned(video.url, res))
        return;
    const handler = async (start, count) => {
        const result = await VideoCommentModel.listAndCountByVideoForAP({ video, start, count });
        return {
            total: result.total,
            data: result.data.map(r => r.url)
        };
    };
    const json = await activityPubCollectionPagination(getLocalVideoCommentsActivityPubUrl(video), handler, req.query.page);
    return activityPubResponse(activityPubContextify(json, 'Collection', getContextFilter()), res);
}
async function videoChannelController(req, res) {
    const videoChannel = res.locals.videoChannel;
    return activityPubResponse(activityPubContextify(await videoChannel.toActivityPubObject(), 'Actor', getContextFilter()), res);
}
async function videoChannelFollowersController(req, res) {
    const videoChannel = res.locals.videoChannel;
    const activityPubResult = await actorFollowers(req, videoChannel.Actor);
    return activityPubResponse(activityPubContextify(activityPubResult, 'Collection', getContextFilter()), res);
}
async function videoChannelFollowingController(req, res) {
    const videoChannel = res.locals.videoChannel;
    const activityPubResult = await actorFollowing(req, videoChannel.Actor);
    return activityPubResponse(activityPubContextify(activityPubResult, 'Collection', getContextFilter()), res);
}
async function videoCommentController(req, res) {
    const videoComment = res.locals.videoCommentFull;
    if (redirectIfNotOwned(videoComment.url, res))
        return;
    if (videoComment.Video.isOwned() && videoComment.heldForReview === true)
        return res.sendStatus(HttpStatusCode.NOT_FOUND_404);
    const threadParentComments = await VideoCommentModel.listThreadParentComments({ comment: videoComment });
    const isPublic = true;
    let videoCommentObject = videoComment.toActivityPubObject(threadParentComments);
    if (videoComment.Account) {
        const audience = getAudience(videoComment.Account.Actor, isPublic);
        videoCommentObject = audiencify(videoCommentObject, audience);
        if (req.path.endsWith('/activity')) {
            const data = buildCreateActivity(videoComment.url, videoComment.Account.Actor, videoCommentObject, audience);
            return activityPubResponse(activityPubContextify(data, 'Comment', getContextFilter()), res);
        }
    }
    return activityPubResponse(activityPubContextify(videoCommentObject, 'Comment', getContextFilter()), res);
}
async function videoCommentApprovedController(req, res) {
    const comment = res.locals.videoCommentFull;
    if (!comment.Video.isOwned() || comment.heldForReview === true)
        return res.sendStatus(HttpStatusCode.NOT_FOUND_404);
    const activity = buildApprovalActivity({ comment, type: 'ApproveReply' });
    return activityPubResponse(activityPubContextify(activity, 'ApproveReply', getContextFilter()), res);
}
async function videoChaptersController(req, res) {
    const video = res.locals.onlyVideo;
    if (redirectIfNotOwned(video.url, res))
        return;
    const chapters = await VideoChapterModel.listChaptersOfVideo(video.id);
    const chaptersObject = {
        id: getLocalVideoChaptersActivityPubUrl(video),
        hasPart: buildChaptersAPHasPart(video, chapters)
    };
    return activityPubResponse(activityPubContextify(chaptersObject, 'Chapters', getContextFilter()), res);
}
async function videoRedundancyController(req, res) {
    const videoRedundancy = res.locals.videoRedundancy;
    if (redirectIfNotOwned(videoRedundancy.url, res))
        return;
    const serverActor = await getServerActor();
    const audience = getAudience(serverActor);
    const object = audiencify(videoRedundancy.toActivityPubObject(), audience);
    if (req.path.endsWith('/activity')) {
        const data = buildCreateActivity(videoRedundancy.url, serverActor, object, audience);
        return activityPubResponse(activityPubContextify(data, 'CacheFile', getContextFilter()), res);
    }
    return activityPubResponse(activityPubContextify(object, 'CacheFile', getContextFilter()), res);
}
async function videoPlaylistController(req, res) {
    const playlist = res.locals.videoPlaylistFull;
    if (redirectIfNotOwned(playlist.url, res))
        return;
    playlist.OwnerAccount = await AccountModel.load(playlist.ownerAccountId);
    const json = await playlist.toActivityPubObject(req.query.page, null);
    const audience = getAudience(playlist.OwnerAccount.Actor, playlist.privacy === VideoPlaylistPrivacy.PUBLIC);
    const object = audiencify(json, audience);
    return activityPubResponse(activityPubContextify(object, 'Playlist', getContextFilter()), res);
}
function videoPlaylistElementController(req, res) {
    const videoPlaylistElement = res.locals.videoPlaylistElementAP;
    if (redirectIfNotOwned(videoPlaylistElement.url, res))
        return;
    const json = videoPlaylistElement.toActivityPubObject();
    return activityPubResponse(activityPubContextify(json, 'Playlist', getContextFilter()), res);
}
function getVideoLocalViewerController(req, res) {
    const localViewer = res.locals.localViewerFull;
    return activityPubResponse(activityPubContextify(localViewer.toActivityPubObject(), 'WatchAction', getContextFilter()), res);
}
function actorFollowing(req, actor) {
    const handler = (start, count) => {
        return ActorFollowModel.listAcceptedFollowingUrlsForApi([actor.id], undefined, start, count);
    };
    return activityPubCollectionPagination(WEBSERVER.URL + req.path, handler, req.query.page);
}
function actorFollowers(req, actor) {
    const handler = (start, count) => {
        return ActorFollowModel.listAcceptedFollowerUrlsForAP([actor.id], undefined, start, count);
    };
    return activityPubCollectionPagination(WEBSERVER.URL + req.path, handler, req.query.page);
}
function actorPlaylists(req, options) {
    const handler = (start, count) => {
        return VideoPlaylistModel.listPublicUrlsOfForAP(options, start, count);
    };
    return activityPubCollectionPagination(WEBSERVER.URL + req.path, handler, req.query.page);
}
function videoRates(req, rateType, video, url) {
    const handler = async (start, count) => {
        const result = await AccountVideoRateModel.listAndCountAccountUrlsByVideoId(rateType, video.id, start, count);
        return {
            total: result.total,
            data: result.data.map(r => r.url)
        };
    };
    return activityPubCollectionPagination(url, handler, req.query.page);
}
function redirectIfNotOwned(url, res) {
    if (url.startsWith(WEBSERVER.URL) === false) {
        res.redirect(url);
        return true;
    }
    return false;
}
//# sourceMappingURL=client.js.map