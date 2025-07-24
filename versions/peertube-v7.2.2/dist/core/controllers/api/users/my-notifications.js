import { HttpStatusCode } from '@peertube/peertube-models';
import { getFormattedObjects } from '../../../helpers/utils.js';
import { UserNotificationModel } from '../../../models/user/user-notification.js';
import express from 'express';
import 'multer';
import { asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, paginationValidator, setDefaultPagination, setDefaultSort, userNotificationsSortValidator } from '../../../middlewares/index.js';
import { listUserNotificationsValidator, markAsReadUserNotificationsValidator, updateNotificationSettingsValidator } from '../../../middlewares/validators/users/user-notifications.js';
import { UserNotificationSettingModel } from '../../../models/user/user-notification-setting.js';
import { meRouter } from './me.js';
const myNotificationsRouter = express.Router();
meRouter.put('/me/notification-settings', authenticate, updateNotificationSettingsValidator, asyncRetryTransactionMiddleware(updateNotificationSettings));
myNotificationsRouter.get('/me/notifications', authenticate, paginationValidator, userNotificationsSortValidator, setDefaultSort, setDefaultPagination, listUserNotificationsValidator, asyncMiddleware(listUserNotifications));
myNotificationsRouter.post('/me/notifications/read', authenticate, markAsReadUserNotificationsValidator, asyncMiddleware(markAsReadUserNotifications));
myNotificationsRouter.post('/me/notifications/read-all', authenticate, asyncMiddleware(markAsReadAllUserNotifications));
export { myNotificationsRouter };
async function updateNotificationSettings(req, res) {
    const user = res.locals.oauth.token.User;
    const body = req.body;
    const values = {
        newVideoFromSubscription: body.newVideoFromSubscription,
        newCommentOnMyVideo: body.newCommentOnMyVideo,
        abuseAsModerator: body.abuseAsModerator,
        videoAutoBlacklistAsModerator: body.videoAutoBlacklistAsModerator,
        blacklistOnMyVideo: body.blacklistOnMyVideo,
        myVideoPublished: body.myVideoPublished,
        myVideoImportFinished: body.myVideoImportFinished,
        newFollow: body.newFollow,
        newUserRegistration: body.newUserRegistration,
        commentMention: body.commentMention,
        newInstanceFollower: body.newInstanceFollower,
        autoInstanceFollowing: body.autoInstanceFollowing,
        abuseNewMessage: body.abuseNewMessage,
        abuseStateChange: body.abuseStateChange,
        newPeerTubeVersion: body.newPeerTubeVersion,
        newPluginVersion: body.newPluginVersion,
        myVideoTranscriptionGenerated: body.myVideoTranscriptionGenerated,
        myVideoStudioEditionFinished: body.myVideoStudioEditionFinished
    };
    await UserNotificationSettingModel.updateUserSettings(values, user.id);
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
async function listUserNotifications(req, res) {
    const user = res.locals.oauth.token.User;
    const query = req.query;
    const resultList = await UserNotificationModel.listForApi({
        userId: user.id,
        start: query.start,
        count: query.count,
        sort: query.sort,
        unread: query.unread,
        typeOneOf: query.typeOneOf
    });
    return res.json(getFormattedObjects(resultList.data, resultList.total));
}
async function markAsReadUserNotifications(req, res) {
    const user = res.locals.oauth.token.User;
    await UserNotificationModel.markAsRead(user.id, req.body.ids);
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
async function markAsReadAllUserNotifications(req, res) {
    const user = res.locals.oauth.token.User;
    await UserNotificationModel.markAllAsRead(user.id);
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
//# sourceMappingURL=my-notifications.js.map