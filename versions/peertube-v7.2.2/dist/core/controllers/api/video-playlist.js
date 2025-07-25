import { forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode, VideoPlaylistPrivacy } from '@peertube/peertube-models';
import { uuidToShort } from '@peertube/peertube-node-utils';
import { scheduleRefreshIfNeeded } from '../../lib/activitypub/playlists/index.js';
import { Hooks } from '../../lib/plugins/hooks.js';
import { generateThumbnailForPlaylist } from '../../lib/video-playlist.js';
import { getServerActor } from '../../models/application/application.js';
import express from 'express';
import { resetSequelizeInstance, retryTransactionWrapper } from '../../helpers/database-utils.js';
import { createReqFiles } from '../../helpers/express-utils.js';
import { logger } from '../../helpers/logger.js';
import { getFormattedObjects } from '../../helpers/utils.js';
import { MIMETYPES, VIDEO_PLAYLIST_PRIVACIES } from '../../initializers/constants.js';
import { sequelizeTypescript } from '../../initializers/database.js';
import { sendCreateVideoPlaylist, sendDeleteVideoPlaylist, sendUpdateVideoPlaylist } from '../../lib/activitypub/send/index.js';
import { getLocalVideoPlaylistActivityPubUrl, getLocalVideoPlaylistElementActivityPubUrl } from '../../lib/activitypub/url.js';
import { updateLocalPlaylistMiniatureFromExisting } from '../../lib/thumbnail.js';
import { apiRateLimiter, asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, optionalAuthenticate, paginationValidator, setDefaultPagination, setDefaultSort } from '../../middlewares/index.js';
import { videoPlaylistsSortValidator } from '../../middlewares/validators/index.js';
import { commonVideoPlaylistFiltersValidator, videoPlaylistsAddValidator, videoPlaylistsAddVideoValidator, videoPlaylistsDeleteValidator, videoPlaylistsGetValidator, videoPlaylistsReorderVideosValidator, videoPlaylistsUpdateOrRemoveVideoValidator, videoPlaylistsUpdateValidator } from '../../middlewares/validators/videos/video-playlists.js';
import { AccountModel } from '../../models/account/account.js';
import { VideoPlaylistElementModel } from '../../models/video/video-playlist-element.js';
import { VideoPlaylistModel } from '../../models/video/video-playlist.js';
const reqThumbnailFile = createReqFiles(['thumbnailfile'], MIMETYPES.IMAGE.MIMETYPE_EXT);
const videoPlaylistRouter = express.Router();
videoPlaylistRouter.use(apiRateLimiter);
videoPlaylistRouter.get('/privacies', listVideoPlaylistPrivacies);
videoPlaylistRouter.get('/', paginationValidator, videoPlaylistsSortValidator, setDefaultSort, setDefaultPagination, commonVideoPlaylistFiltersValidator, asyncMiddleware(listVideoPlaylists));
videoPlaylistRouter.get('/:playlistId', asyncMiddleware(videoPlaylistsGetValidator('summary')), getVideoPlaylist);
videoPlaylistRouter.post('/', authenticate, reqThumbnailFile, asyncMiddleware(videoPlaylistsAddValidator), asyncMiddleware(createVideoPlaylist));
videoPlaylistRouter.put('/:playlistId', authenticate, reqThumbnailFile, asyncMiddleware(videoPlaylistsUpdateValidator), asyncRetryTransactionMiddleware(updateVideoPlaylist));
videoPlaylistRouter.delete('/:playlistId', authenticate, asyncMiddleware(videoPlaylistsDeleteValidator), asyncRetryTransactionMiddleware(removeVideoPlaylist));
videoPlaylistRouter.get('/:playlistId/videos', asyncMiddleware(videoPlaylistsGetValidator('summary')), paginationValidator, setDefaultPagination, optionalAuthenticate, asyncMiddleware(getVideoPlaylistVideos));
videoPlaylistRouter.post('/:playlistId/videos', authenticate, asyncMiddleware(videoPlaylistsAddVideoValidator), asyncRetryTransactionMiddleware(addVideoInPlaylist));
videoPlaylistRouter.post('/:playlistId/videos/reorder', authenticate, asyncMiddleware(videoPlaylistsReorderVideosValidator), asyncRetryTransactionMiddleware(reorderVideosPlaylist));
videoPlaylistRouter.put('/:playlistId/videos/:playlistElementId', authenticate, asyncMiddleware(videoPlaylistsUpdateOrRemoveVideoValidator), asyncRetryTransactionMiddleware(updateVideoPlaylistElement));
videoPlaylistRouter.delete('/:playlistId/videos/:playlistElementId', authenticate, asyncMiddleware(videoPlaylistsUpdateOrRemoveVideoValidator), asyncRetryTransactionMiddleware(removeVideoFromPlaylist));
export { videoPlaylistRouter };
function listVideoPlaylistPrivacies(req, res) {
    res.json(VIDEO_PLAYLIST_PRIVACIES);
}
async function listVideoPlaylists(req, res) {
    const serverActor = await getServerActor();
    const resultList = await VideoPlaylistModel.listForApi({
        followerActorId: serverActor.id,
        start: req.query.start,
        count: req.query.count,
        sort: req.query.sort,
        type: req.query.playlistType
    });
    return res.json(getFormattedObjects(resultList.data, resultList.total));
}
function getVideoPlaylist(req, res) {
    const videoPlaylist = res.locals.videoPlaylistSummary;
    scheduleRefreshIfNeeded(videoPlaylist);
    return res.json(videoPlaylist.toFormattedJSON());
}
async function createVideoPlaylist(req, res) {
    var _a;
    const videoPlaylistInfo = req.body;
    const user = res.locals.oauth.token.User;
    const videoPlaylist = new VideoPlaylistModel({
        name: videoPlaylistInfo.displayName,
        description: videoPlaylistInfo.description,
        privacy: videoPlaylistInfo.privacy || VideoPlaylistPrivacy.PRIVATE,
        ownerAccountId: user.Account.id
    });
    videoPlaylist.url = getLocalVideoPlaylistActivityPubUrl(videoPlaylist);
    if (videoPlaylistInfo.videoChannelId) {
        const videoChannel = res.locals.videoChannel;
        videoPlaylist.videoChannelId = videoChannel.id;
        videoPlaylist.VideoChannel = videoChannel;
    }
    const thumbnailField = (_a = req.files) === null || _a === void 0 ? void 0 : _a['thumbnailfile'];
    const thumbnailModel = thumbnailField
        ? await updateLocalPlaylistMiniatureFromExisting({
            inputPath: thumbnailField[0].path,
            playlist: videoPlaylist,
            automaticallyGenerated: false
        })
        : undefined;
    const videoPlaylistCreated = await retryTransactionWrapper(() => {
        return sequelizeTypescript.transaction(async (t) => {
            const videoPlaylistCreated = await videoPlaylist.save({ transaction: t });
            if (thumbnailModel) {
                await videoPlaylistCreated.setAndSaveThumbnail(thumbnailModel, t);
            }
            videoPlaylistCreated.OwnerAccount = await AccountModel.load(user.Account.id, t);
            await sendCreateVideoPlaylist(videoPlaylistCreated, t);
            return videoPlaylistCreated;
        });
    });
    logger.info('Video playlist with uuid %s created.', videoPlaylist.uuid);
    return res.json({
        videoPlaylist: {
            id: videoPlaylistCreated.id,
            shortUUID: uuidToShort(videoPlaylistCreated.uuid),
            uuid: videoPlaylistCreated.uuid
        }
    });
}
async function updateVideoPlaylist(req, res) {
    var _a;
    const videoPlaylistInstance = res.locals.videoPlaylistFull;
    const videoPlaylistInfoToUpdate = req.body;
    const wasPrivatePlaylist = videoPlaylistInstance.privacy === VideoPlaylistPrivacy.PRIVATE;
    const wasNotPrivatePlaylist = videoPlaylistInstance.privacy !== VideoPlaylistPrivacy.PRIVATE;
    const thumbnailField = (_a = req.files) === null || _a === void 0 ? void 0 : _a['thumbnailfile'];
    const thumbnailModel = thumbnailField
        ? await updateLocalPlaylistMiniatureFromExisting({
            inputPath: thumbnailField[0].path,
            playlist: videoPlaylistInstance,
            automaticallyGenerated: false
        })
        : undefined;
    try {
        await sequelizeTypescript.transaction(async (t) => {
            const sequelizeOptions = {
                transaction: t
            };
            if (videoPlaylistInfoToUpdate.videoChannelId !== undefined) {
                if (videoPlaylistInfoToUpdate.videoChannelId === null) {
                    videoPlaylistInstance.videoChannelId = null;
                }
                else {
                    const videoChannel = res.locals.videoChannel;
                    videoPlaylistInstance.videoChannelId = videoChannel.id;
                    videoPlaylistInstance.VideoChannel = videoChannel;
                }
            }
            if (videoPlaylistInfoToUpdate.displayName !== undefined)
                videoPlaylistInstance.name = videoPlaylistInfoToUpdate.displayName;
            if (videoPlaylistInfoToUpdate.description !== undefined)
                videoPlaylistInstance.description = videoPlaylistInfoToUpdate.description;
            if (videoPlaylistInfoToUpdate.privacy !== undefined) {
                videoPlaylistInstance.privacy = forceNumber(videoPlaylistInfoToUpdate.privacy);
                if (wasNotPrivatePlaylist === true && videoPlaylistInstance.privacy === VideoPlaylistPrivacy.PRIVATE) {
                    await sendDeleteVideoPlaylist(videoPlaylistInstance, t);
                }
            }
            const playlistUpdated = await videoPlaylistInstance.save(sequelizeOptions);
            if (thumbnailModel) {
                thumbnailModel.automaticallyGenerated = false;
                await playlistUpdated.setAndSaveThumbnail(thumbnailModel, t);
            }
            const isNewPlaylist = wasPrivatePlaylist && playlistUpdated.privacy !== VideoPlaylistPrivacy.PRIVATE;
            if (isNewPlaylist) {
                await sendCreateVideoPlaylist(playlistUpdated, t);
            }
            else {
                await sendUpdateVideoPlaylist(playlistUpdated, t);
            }
            logger.info('Video playlist %s updated.', videoPlaylistInstance.uuid);
            return playlistUpdated;
        });
    }
    catch (err) {
        logger.debug('Cannot update the video playlist.', { err });
        await resetSequelizeInstance(videoPlaylistInstance);
        throw err;
    }
    return res.type('json').status(HttpStatusCode.NO_CONTENT_204).end();
}
async function removeVideoPlaylist(req, res) {
    const videoPlaylistInstance = res.locals.videoPlaylistSummary;
    await sequelizeTypescript.transaction(async (t) => {
        await videoPlaylistInstance.destroy({ transaction: t });
        await sendDeleteVideoPlaylist(videoPlaylistInstance, t);
        logger.info('Video playlist %s deleted.', videoPlaylistInstance.uuid);
    });
    return res.type('json').status(HttpStatusCode.NO_CONTENT_204).end();
}
async function addVideoInPlaylist(req, res) {
    const body = req.body;
    const videoPlaylist = res.locals.videoPlaylistFull;
    const video = res.locals.onlyVideo;
    const playlistElement = await sequelizeTypescript.transaction(async (t) => {
        const position = await VideoPlaylistElementModel.getNextPositionOf(videoPlaylist.id, t);
        const playlistElement = await VideoPlaylistElementModel.create({
            position,
            startTimestamp: body.startTimestamp || null,
            stopTimestamp: body.stopTimestamp || null,
            videoPlaylistId: videoPlaylist.id,
            videoId: video.id
        }, { transaction: t });
        playlistElement.url = getLocalVideoPlaylistElementActivityPubUrl(videoPlaylist, playlistElement);
        await playlistElement.save({ transaction: t });
        videoPlaylist.changed('updatedAt', true);
        await videoPlaylist.save({ transaction: t });
        return playlistElement;
    });
    if (videoPlaylist.shouldGenerateThumbnailWithNewElement(playlistElement)) {
        await generateThumbnailForPlaylist(videoPlaylist, video);
    }
    sendUpdateVideoPlaylist(videoPlaylist, undefined)
        .catch(err => logger.error('Cannot send video playlist update.', { err }));
    logger.info('Video added in playlist %s at position %d.', videoPlaylist.uuid, playlistElement.position);
    Hooks.runAction('action:api.video-playlist-element.created', { playlistElement, req, res });
    return res.json({
        videoPlaylistElement: {
            id: playlistElement.id
        }
    });
}
async function updateVideoPlaylistElement(req, res) {
    const body = req.body;
    const videoPlaylist = res.locals.videoPlaylistFull;
    const videoPlaylistElement = res.locals.videoPlaylistElement;
    const playlistElement = await sequelizeTypescript.transaction(async (t) => {
        if (body.startTimestamp !== undefined)
            videoPlaylistElement.startTimestamp = body.startTimestamp;
        if (body.stopTimestamp !== undefined)
            videoPlaylistElement.stopTimestamp = body.stopTimestamp;
        const element = await videoPlaylistElement.save({ transaction: t });
        videoPlaylist.changed('updatedAt', true);
        await videoPlaylist.save({ transaction: t });
        await sendUpdateVideoPlaylist(videoPlaylist, t);
        return element;
    });
    logger.info('Element of position %d of playlist %s updated.', playlistElement.position, videoPlaylist.uuid);
    return res.type('json').status(HttpStatusCode.NO_CONTENT_204).end();
}
async function removeVideoFromPlaylist(req, res) {
    const videoPlaylistElement = res.locals.videoPlaylistElement;
    const videoPlaylist = res.locals.videoPlaylistFull;
    const positionToDelete = videoPlaylistElement.position;
    await sequelizeTypescript.transaction(async (t) => {
        await videoPlaylistElement.destroy({ transaction: t });
        await VideoPlaylistElementModel.increasePositionOf(videoPlaylist.id, positionToDelete, -1, t);
        videoPlaylist.changed('updatedAt', true);
        await videoPlaylist.save({ transaction: t });
        logger.info('Video playlist element %d of playlist %s deleted.', videoPlaylistElement.position, videoPlaylist.uuid);
    });
    if (positionToDelete === 1 && videoPlaylist.hasGeneratedThumbnail()) {
        await regeneratePlaylistThumbnail(videoPlaylist);
    }
    sendUpdateVideoPlaylist(videoPlaylist, undefined)
        .catch(err => logger.error('Cannot send video playlist update.', { err }));
    return res.type('json').status(HttpStatusCode.NO_CONTENT_204).end();
}
async function reorderVideosPlaylist(req, res) {
    const videoPlaylist = res.locals.videoPlaylistFull;
    const body = req.body;
    const start = body.startPosition;
    const insertAfter = body.insertAfterPosition;
    const reorderLength = body.reorderLength || 1;
    if (start === insertAfter) {
        return res.status(HttpStatusCode.NO_CONTENT_204).end();
    }
    await sequelizeTypescript.transaction(async (t) => {
        const newPosition = insertAfter + 1;
        await VideoPlaylistElementModel.increasePositionOf(videoPlaylist.id, newPosition, reorderLength, t);
        let oldPosition = start;
        if (start >= newPosition)
            oldPosition += reorderLength;
        const endOldPosition = oldPosition + reorderLength - 1;
        await VideoPlaylistElementModel.reassignPositionOf({
            videoPlaylistId: videoPlaylist.id,
            firstPosition: oldPosition,
            endPosition: endOldPosition,
            newPosition,
            transaction: t
        });
        await VideoPlaylistElementModel.increasePositionOf(videoPlaylist.id, oldPosition, -reorderLength, t);
        videoPlaylist.changed('updatedAt', true);
        await videoPlaylist.save({ transaction: t });
        await sendUpdateVideoPlaylist(videoPlaylist, t);
    });
    if ((start === 1 || insertAfter === 0) && videoPlaylist.hasGeneratedThumbnail()) {
        await regeneratePlaylistThumbnail(videoPlaylist);
    }
    logger.info('Reordered playlist %s (inserted after position %d elements %d - %d).', videoPlaylist.uuid, insertAfter, start, start + reorderLength - 1);
    return res.type('json').status(HttpStatusCode.NO_CONTENT_204).end();
}
async function getVideoPlaylistVideos(req, res) {
    var _a;
    const videoPlaylistInstance = res.locals.videoPlaylistSummary;
    const user = res.locals.oauth ? res.locals.oauth.token.User : undefined;
    const server = await getServerActor();
    const apiOptions = await Hooks.wrapObject({
        start: req.query.start,
        count: req.query.count,
        videoPlaylistId: videoPlaylistInstance.id,
        serverAccount: server.Account,
        user
    }, 'filter:api.video-playlist.videos.list.params');
    const resultList = await Hooks.wrapPromiseFun(VideoPlaylistElementModel.listForApi.bind(VideoPlaylistElementModel), apiOptions, 'filter:api.video-playlist.videos.list.result');
    const options = { accountId: (_a = user === null || user === void 0 ? void 0 : user.Account) === null || _a === void 0 ? void 0 : _a.id };
    return res.json(getFormattedObjects(resultList.data, resultList.total, options));
}
async function regeneratePlaylistThumbnail(videoPlaylist) {
    await videoPlaylist.Thumbnail.destroy();
    videoPlaylist.Thumbnail = null;
    const firstElement = await VideoPlaylistElementModel.loadFirstElementWithVideoThumbnail(videoPlaylist.id);
    if (firstElement)
        await generateThumbnailForPlaylist(videoPlaylist, firstElement.Video);
}
//# sourceMappingURL=video-playlist.js.map