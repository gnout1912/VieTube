import { getAllPrivacies, pick } from '@peertube/peertube-core-utils';
import { ActorImageType, HttpStatusCode, VideoInclude } from '@peertube/peertube-models';
import { UserAuditView, auditLoggerFactory, getAuditIdFromRes } from '../../../helpers/audit-logger.js';
import { pickCommonVideoQuery } from '../../../helpers/query.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { guessAdditionalAttributesFromQuery } from '../../../models/video/formatter/video-api-format.js';
import { VideoCommentModel } from '../../../models/video/video-comment.js';
import express from 'express';
import 'multer';
import { createReqFiles, getCountVideos } from '../../../helpers/express-utils.js';
import { getFormattedObjects } from '../../../helpers/utils.js';
import { CONFIG } from '../../../initializers/config.js';
import { MIMETYPES } from '../../../initializers/constants.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { sendUpdateActor } from '../../../lib/activitypub/send/index.js';
import { deleteLocalActorImageFile, updateLocalActorImageFiles } from '../../../lib/local-actor.js';
import { getOriginalVideoFileTotalDailyFromUser, getOriginalVideoFileTotalFromUser, sendVerifyUserChangeEmail } from '../../../lib/user.js';
import { asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, paginationValidator, setDefaultPagination, setDefaultSort, setDefaultVideosSort, usersUpdateMeValidator, usersVideoRatingValidator } from '../../../middlewares/index.js';
import { updateAvatarValidator } from '../../../middlewares/validators/actor-image.js';
import { commonVideosFiltersValidator, deleteMeValidator, getMyVideoImportsValidator, listCommentsOnUserVideosValidator, usersVideosValidator, videoImportsSortValidator, videosSortValidator } from '../../../middlewares/validators/index.js';
import { AccountVideoRateModel } from '../../../models/account/account-video-rate.js';
import { AccountModel } from '../../../models/account/account.js';
import { UserModel } from '../../../models/user/user.js';
import { VideoImportModel } from '../../../models/video/video-import.js';
import { VideoModel } from '../../../models/video/video.js';
const auditLogger = auditLoggerFactory('users');
const reqAvatarFile = createReqFiles(['avatarfile'], MIMETYPES.IMAGE.MIMETYPE_EXT);
const meRouter = express.Router();
meRouter.get('/me', authenticate, asyncMiddleware(getUserInformation));
meRouter.delete('/me', authenticate, deleteMeValidator, asyncMiddleware(deleteMe));
meRouter.get('/me/video-quota-used', authenticate, asyncMiddleware(getUserVideoQuotaUsed));
meRouter.get('/me/videos/imports', authenticate, paginationValidator, videoImportsSortValidator, setDefaultSort, setDefaultPagination, getMyVideoImportsValidator, asyncMiddleware(getUserVideoImports));
meRouter.get('/me/videos/comments', authenticate, paginationValidator, videosSortValidator, setDefaultVideosSort, setDefaultPagination, asyncMiddleware(listCommentsOnUserVideosValidator), asyncMiddleware(listCommentsOnUserVideos));
meRouter.get('/me/videos', authenticate, paginationValidator, videosSortValidator, setDefaultVideosSort, setDefaultPagination, commonVideosFiltersValidator, asyncMiddleware(usersVideosValidator), asyncMiddleware(listUserVideos));
meRouter.get('/me/videos/:videoId/rating', authenticate, asyncMiddleware(usersVideoRatingValidator), asyncMiddleware(getUserVideoRating));
meRouter.put('/me', authenticate, asyncMiddleware(usersUpdateMeValidator), asyncRetryTransactionMiddleware(updateMe));
meRouter.post('/me/avatar/pick', authenticate, reqAvatarFile, updateAvatarValidator, asyncRetryTransactionMiddleware(updateMyAvatar));
meRouter.delete('/me/avatar', authenticate, asyncRetryTransactionMiddleware(deleteMyAvatar));
export { meRouter };
async function listUserVideos(req, res) {
    var _a;
    const user = res.locals.oauth.token.User;
    const countVideos = getCountVideos(req);
    const query = pickCommonVideoQuery(req.query);
    const include = (query.include || VideoInclude.NONE) | VideoInclude.BLACKLISTED | VideoInclude.NOT_PUBLISHED_STATE;
    const apiOptions = await Hooks.wrapObject(Object.assign(Object.assign({ privacyOneOf: getAllPrivacies() }, query), { nsfw: null, user, accountId: user.Account.id, displayOnlyForFollower: null, videoChannelId: (_a = res.locals.videoChannel) === null || _a === void 0 ? void 0 : _a.id, channelNameOneOf: req.query.channelNameOneOf, countVideos,
        include }), 'filter:api.user.me.videos.list.params');
    const resultList = await Hooks.wrapPromiseFun(VideoModel.listForApi.bind(VideoModel), apiOptions, 'filter:api.user.me.videos.list.result');
    return res.json(getFormattedObjects(resultList.data, resultList.total, guessAdditionalAttributesFromQuery({ include })));
}
async function listCommentsOnUserVideos(req, res) {
    var _a, _b;
    const userAccount = res.locals.oauth.token.User.Account;
    const options = Object.assign(Object.assign({}, pick(req.query, [
        'start',
        'count',
        'sort',
        'search',
        'searchAccount',
        'searchVideo',
        'autoTagOneOf'
    ])), { autoTagOfAccountId: userAccount.id, videoAccountOwnerId: userAccount.id, heldForReview: req.query.isHeldForReview, videoChannelOwnerId: (_a = res.locals.videoChannel) === null || _a === void 0 ? void 0 : _a.id, videoId: (_b = res.locals.videoAll) === null || _b === void 0 ? void 0 : _b.id });
    const resultList = await VideoCommentModel.listCommentsForApi(options);
    return res.json({
        total: resultList.total,
        data: resultList.data.map(c => c.toFormattedForAdminOrUserJSON())
    });
}
async function getUserVideoImports(req, res) {
    const user = res.locals.oauth.token.User;
    const resultList = await VideoImportModel.listUserVideoImportsForApi(Object.assign({ userId: user.id }, pick(req.query, ['targetUrl', 'start', 'count', 'sort', 'search', 'videoChannelSyncId'])));
    return res.json(getFormattedObjects(resultList.data, resultList.total));
}
async function getUserInformation(req, res) {
    const user = await UserModel.loadForMeAPI(res.locals.oauth.token.user.id);
    const result = await Hooks.wrapObject(user.toMeFormattedJSON(), 'filter:api.user.me.get.result', { user });
    return res.json(result);
}
async function getUserVideoQuotaUsed(req, res) {
    const user = res.locals.oauth.token.user;
    const videoQuotaUsed = await getOriginalVideoFileTotalFromUser(user);
    const videoQuotaUsedDaily = await getOriginalVideoFileTotalDailyFromUser(user);
    const data = {
        videoQuotaUsed,
        videoQuotaUsedDaily
    };
    return res.json(data);
}
async function getUserVideoRating(req, res) {
    const videoId = res.locals.videoId.id;
    const accountId = +res.locals.oauth.token.User.Account.id;
    const ratingObj = await AccountVideoRateModel.load(accountId, videoId, null);
    const rating = ratingObj ? ratingObj.type : 'none';
    const json = {
        videoId,
        rating
    };
    return res.json(json);
}
async function deleteMe(req, res) {
    const user = await UserModel.loadByIdWithChannels(res.locals.oauth.token.User.id);
    auditLogger.delete(getAuditIdFromRes(res), new UserAuditView(user.toFormattedJSON()));
    await user.destroy();
    Hooks.runAction('action:api.user.deleted', { user, req, res });
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function updateMe(req, res) {
    const body = req.body;
    let sendVerificationEmail = false;
    const user = res.locals.oauth.token.user;
    const keysToUpdate = [
        'password',
        'nsfwPolicy',
        'nsfwFlagsDisplayed',
        'nsfwFlagsHidden',
        'nsfwFlagsWarned',
        'nsfwFlagsBlurred',
        'p2pEnabled',
        'autoPlayVideo',
        'autoPlayNextVideo',
        'autoPlayNextVideoPlaylist',
        'videosHistoryEnabled',
        'videoLanguages',
        'theme',
        'noInstanceConfigWarningModal',
        'noAccountSetupWarningModal',
        'noWelcomeModal',
        'emailPublic',
        'p2pEnabled'
    ];
    for (const key of keysToUpdate) {
        if (body[key] !== undefined)
            user.set(key, body[key]);
    }
    if (body.email !== undefined) {
        if (CONFIG.SIGNUP.REQUIRES_EMAIL_VERIFICATION) {
            user.pendingEmail = body.email;
            sendVerificationEmail = true;
        }
        else {
            user.email = body.email;
        }
    }
    await sequelizeTypescript.transaction(async (t) => {
        await user.save({ transaction: t });
        if (body.displayName === undefined && body.description === undefined)
            return;
        const userAccount = await AccountModel.load(user.Account.id, t);
        if (body.displayName !== undefined)
            userAccount.name = body.displayName;
        if (body.description !== undefined)
            userAccount.description = body.description;
        await userAccount.save({ transaction: t });
        await sendUpdateActor(userAccount, t);
    });
    if (sendVerificationEmail === true) {
        await sendVerifyUserChangeEmail(user);
    }
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function updateMyAvatar(req, res) {
    const avatarPhysicalFile = req.files['avatarfile'][0];
    const user = res.locals.oauth.token.user;
    const userAccount = await AccountModel.load(user.Account.id);
    const avatars = await updateLocalActorImageFiles({
        accountOrChannel: userAccount,
        imagePhysicalFile: avatarPhysicalFile,
        type: ActorImageType.AVATAR,
        sendActorUpdate: true
    });
    return res.json({
        avatars: avatars.map(avatar => avatar.toFormattedJSON())
    });
}
async function deleteMyAvatar(req, res) {
    const user = res.locals.oauth.token.user;
    const userAccount = await AccountModel.load(user.Account.id);
    await deleteLocalActorImageFile(userAccount, ActorImageType.AVATAR);
    return res.json({ avatars: [] });
}
//# sourceMappingURL=me.js.map