import { forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode, UserRight, VideoPlaylistPrivacy, VideoPlaylistType } from '@peertube/peertube-models';
import { body, param, query } from 'express-validator';
import { isArrayOf, isIdOrUUIDValid, isIdValid, isUUIDValid, toCompleteUUID, toIntArray, toIntOrNull, toValueOrNull } from '../../../helpers/custom-validators/misc.js';
import { isVideoPlaylistDescriptionValid, isVideoPlaylistNameValid, isVideoPlaylistPrivacyValid, isVideoPlaylistTimestampValid, isVideoPlaylistTypeValid } from '../../../helpers/custom-validators/video-playlists.js';
import { isVideoImageValid } from '../../../helpers/custom-validators/videos.js';
import { cleanUpReqFiles } from '../../../helpers/express-utils.js';
import { CONSTRAINTS_FIELDS } from '../../../initializers/constants.js';
import { VideoPlaylistElementModel } from '../../../models/video/video-playlist-element.js';
import { authenticatePromise } from '../../auth.js';
import { areValidationErrors, doesVideoChannelOfAccountExist, doesVideoExist, doesVideoPlaylistExist, isValidPlaylistIdParam } from '../shared/index.js';
const videoPlaylistsAddValidator = getCommonPlaylistEditAttributes().concat([
    body('displayName')
        .custom(isVideoPlaylistNameValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return cleanUpReqFiles(req);
        const body = req.body;
        if (body.videoChannelId && !await doesVideoChannelOfAccountExist(body.videoChannelId, res.locals.oauth.token.User, res)) {
            return cleanUpReqFiles(req);
        }
        if (!body.videoChannelId &&
            (body.privacy === VideoPlaylistPrivacy.PUBLIC || body.privacy === VideoPlaylistPrivacy.UNLISTED)) {
            cleanUpReqFiles(req);
            return res.fail({ message: 'Cannot set "public" or "unlisted" a playlist that is not assigned to a channel.' });
        }
        return next();
    }
]);
const videoPlaylistsUpdateValidator = getCommonPlaylistEditAttributes().concat([
    isValidPlaylistIdParam('playlistId'),
    body('displayName')
        .optional()
        .custom(isVideoPlaylistNameValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return cleanUpReqFiles(req);
        if (!await doesVideoPlaylistExist(req.params.playlistId, res, 'all'))
            return cleanUpReqFiles(req);
        const videoPlaylist = getPlaylist(res);
        if (!checkUserCanManageVideoPlaylist(res.locals.oauth.token.User, videoPlaylist, UserRight.REMOVE_ANY_VIDEO_PLAYLIST, res)) {
            return cleanUpReqFiles(req);
        }
        const body = req.body;
        const newPrivacy = body.privacy || videoPlaylist.privacy;
        if (newPrivacy === VideoPlaylistPrivacy.PUBLIC &&
            ((!videoPlaylist.videoChannelId && !body.videoChannelId) ||
                body.videoChannelId === null)) {
            cleanUpReqFiles(req);
            return res.fail({ message: 'Cannot set "public" a playlist that is not assigned to a channel.' });
        }
        if (videoPlaylist.type === VideoPlaylistType.WATCH_LATER) {
            cleanUpReqFiles(req);
            return res.fail({ message: 'Cannot update a watch later playlist.' });
        }
        if (body.videoChannelId && !await doesVideoChannelOfAccountExist(body.videoChannelId, res.locals.oauth.token.User, res)) {
            return cleanUpReqFiles(req);
        }
        return next();
    }
]);
const videoPlaylistsDeleteValidator = [
    isValidPlaylistIdParam('playlistId'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoPlaylistExist(req.params.playlistId, res))
            return;
        const videoPlaylist = getPlaylist(res);
        if (videoPlaylist.type === VideoPlaylistType.WATCH_LATER) {
            return res.fail({ message: 'Cannot delete a watch later playlist.' });
        }
        if (!checkUserCanManageVideoPlaylist(res.locals.oauth.token.User, videoPlaylist, UserRight.REMOVE_ANY_VIDEO_PLAYLIST, res)) {
            return;
        }
        return next();
    }
];
const videoPlaylistsGetValidator = (fetchType) => {
    return [
        isValidPlaylistIdParam('playlistId'),
        async (req, res, next) => {
            if (areValidationErrors(req, res))
                return;
            if (!await doesVideoPlaylistExist(req.params.playlistId, res, fetchType))
                return;
            const videoPlaylist = res.locals.videoPlaylistFull || res.locals.videoPlaylistSummary;
            if (videoPlaylist.privacy === VideoPlaylistPrivacy.UNLISTED) {
                if (isUUIDValid(req.params.playlistId))
                    return next();
                return res.fail({
                    status: HttpStatusCode.NOT_FOUND_404,
                    message: 'Playlist not found'
                });
            }
            if (videoPlaylist.privacy === VideoPlaylistPrivacy.PRIVATE) {
                await authenticatePromise({ req, res });
                const user = res.locals.oauth ? res.locals.oauth.token.User : null;
                if (!user ||
                    (videoPlaylist.OwnerAccount.id !== user.Account.id && !user.hasRight(UserRight.UPDATE_ANY_VIDEO_PLAYLIST))) {
                    return res.fail({
                        status: HttpStatusCode.FORBIDDEN_403,
                        message: 'Cannot get this private video playlist.'
                    });
                }
                return next();
            }
            return next();
        }
    ];
};
const videoPlaylistsSearchValidator = [
    query('search')
        .optional()
        .not().isEmpty(),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
const videoPlaylistsAddVideoValidator = [
    isValidPlaylistIdParam('playlistId'),
    body('videoId')
        .customSanitizer(toCompleteUUID)
        .custom(isIdOrUUIDValid).withMessage('Should have a valid video id/uuid/short uuid'),
    body('startTimestamp')
        .optional()
        .custom(isVideoPlaylistTimestampValid),
    body('stopTimestamp')
        .optional()
        .custom(isVideoPlaylistTimestampValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoPlaylistExist(req.params.playlistId, res, 'all'))
            return;
        if (!await doesVideoExist(req.body.videoId, res, 'only-video-and-blacklist'))
            return;
        const videoPlaylist = getPlaylist(res);
        if (!checkUserCanManageVideoPlaylist(res.locals.oauth.token.User, videoPlaylist, UserRight.UPDATE_ANY_VIDEO_PLAYLIST, res)) {
            return;
        }
        return next();
    }
];
const videoPlaylistsUpdateOrRemoveVideoValidator = [
    isValidPlaylistIdParam('playlistId'),
    param('playlistElementId')
        .customSanitizer(toCompleteUUID)
        .custom(isIdValid).withMessage('Should have an element id/uuid/short uuid'),
    body('startTimestamp')
        .optional()
        .custom(isVideoPlaylistTimestampValid),
    body('stopTimestamp')
        .optional()
        .custom(isVideoPlaylistTimestampValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoPlaylistExist(req.params.playlistId, res, 'all'))
            return;
        const videoPlaylist = getPlaylist(res);
        const videoPlaylistElement = await VideoPlaylistElementModel.loadById(req.params.playlistElementId);
        if (!videoPlaylistElement) {
            res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Video playlist element not found'
            });
            return;
        }
        res.locals.videoPlaylistElement = videoPlaylistElement;
        if (!checkUserCanManageVideoPlaylist(res.locals.oauth.token.User, videoPlaylist, UserRight.UPDATE_ANY_VIDEO_PLAYLIST, res))
            return;
        return next();
    }
];
const videoPlaylistElementAPGetValidator = [
    isValidPlaylistIdParam('playlistId'),
    param('playlistElementId')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const playlistElementId = forceNumber(req.params.playlistElementId);
        const playlistId = req.params.playlistId;
        const videoPlaylistElement = await VideoPlaylistElementModel.loadByPlaylistAndElementIdForAP(playlistId, playlistElementId);
        if (!videoPlaylistElement) {
            res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Video playlist element not found'
            });
            return;
        }
        if (videoPlaylistElement.VideoPlaylist.privacy === VideoPlaylistPrivacy.PRIVATE) {
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message: 'Cannot get this private video playlist.'
            });
        }
        res.locals.videoPlaylistElementAP = videoPlaylistElement;
        return next();
    }
];
const videoPlaylistsReorderVideosValidator = [
    isValidPlaylistIdParam('playlistId'),
    body('startPosition')
        .isInt({ min: 1 }),
    body('insertAfterPosition')
        .isInt({ min: 0 }),
    body('reorderLength')
        .optional()
        .isInt({ min: 1 }),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoPlaylistExist(req.params.playlistId, res, 'all'))
            return;
        const videoPlaylist = getPlaylist(res);
        if (!checkUserCanManageVideoPlaylist(res.locals.oauth.token.User, videoPlaylist, UserRight.UPDATE_ANY_VIDEO_PLAYLIST, res))
            return;
        const nextPosition = await VideoPlaylistElementModel.getNextPositionOf(videoPlaylist.id);
        const startPosition = req.body.startPosition;
        const insertAfterPosition = req.body.insertAfterPosition;
        const reorderLength = req.body.reorderLength;
        if (startPosition >= nextPosition || insertAfterPosition >= nextPosition) {
            res.fail({ message: `Start position or insert after position exceed the playlist limits (max: ${nextPosition - 1})` });
            return;
        }
        if (reorderLength && reorderLength + startPosition > nextPosition) {
            res.fail({ message: `Reorder length with this start position exceeds the playlist limits (max: ${nextPosition - startPosition})` });
            return;
        }
        return next();
    }
];
const commonVideoPlaylistFiltersValidator = [
    query('playlistType')
        .optional()
        .custom(isVideoPlaylistTypeValid),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
const doVideosInPlaylistExistValidator = [
    query('videoIds')
        .customSanitizer(toIntArray)
        .custom(v => isArrayOf(v, isIdValid)).withMessage('Should have a valid video ids array'),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
export { commonVideoPlaylistFiltersValidator, doVideosInPlaylistExistValidator, videoPlaylistElementAPGetValidator, videoPlaylistsAddValidator, videoPlaylistsAddVideoValidator, videoPlaylistsDeleteValidator, videoPlaylistsGetValidator, videoPlaylistsReorderVideosValidator, videoPlaylistsSearchValidator, videoPlaylistsUpdateOrRemoveVideoValidator, videoPlaylistsUpdateValidator };
function getCommonPlaylistEditAttributes() {
    return [
        body('thumbnailfile')
            .custom((value, { req }) => isVideoImageValid(req.files, 'thumbnailfile'))
            .withMessage('This thumbnail file is not supported or too large. Please, make sure it is of the following type: ' +
            CONSTRAINTS_FIELDS.VIDEO_PLAYLISTS.IMAGE.EXTNAME.join(', ')),
        body('description')
            .optional()
            .customSanitizer(toValueOrNull)
            .custom(isVideoPlaylistDescriptionValid),
        body('privacy')
            .optional()
            .customSanitizer(toIntOrNull)
            .custom(isVideoPlaylistPrivacyValid),
        body('videoChannelId')
            .optional()
            .customSanitizer(toIntOrNull)
    ];
}
function checkUserCanManageVideoPlaylist(user, videoPlaylist, right, res) {
    if (videoPlaylist.isOwned() === false) {
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'Cannot manage video playlist of another server.'
        });
        return false;
    }
    if (user.hasRight(right) === false && videoPlaylist.ownerAccountId !== user.Account.id) {
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'Cannot manage video playlist of another user'
        });
        return false;
    }
    return true;
}
function getPlaylist(res) {
    return res.locals.videoPlaylistFull || res.locals.videoPlaylistSummary;
}
//# sourceMappingURL=video-playlists.js.map