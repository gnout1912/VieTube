import { pick } from '@peertube/peertube-core-utils';
import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { tokensRouter } from './token.js';
import { Hooks } from '../../../lib/plugins/hooks.js';
import { OAuthTokenModel } from '../../../models/oauth/oauth-token.js';
import express from 'express';
import { auditLoggerFactory, getAuditIdFromRes, UserAuditView } from '../../../helpers/audit-logger.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { generateRandomString, getFormattedObjects } from '../../../helpers/utils.js';
import { WEBSERVER } from '../../../initializers/constants.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { Emailer } from '../../../lib/emailer.js';
import { Redis } from '../../../lib/redis.js';
import { buildUser, createUserAccountAndChannelAndPlaylist } from '../../../lib/user.js';
import { adminUsersSortValidator, apiRateLimiter, asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, ensureUserHasRight, paginationValidator, setDefaultPagination, setDefaultSort, userAutocompleteValidator, usersAddValidator, usersGetValidator, usersListValidator, usersRemoveValidator, usersUpdateValidator } from '../../../middlewares/index.js';
import { usersAskResetPasswordValidator, usersBlockToggleValidator, usersResetPasswordValidator } from '../../../middlewares/validators/index.js';
import { UserModel } from '../../../models/user/user.js';
import { emailVerificationRouter } from './email-verification.js';
import { meRouter } from './me.js';
import { myAbusesRouter } from './my-abuses.js';
import { myBlocklistRouter } from './my-blocklist.js';
import { myVideosHistoryRouter } from './my-history.js';
import { myNotificationsRouter } from './my-notifications.js';
import { mySubscriptionsRouter } from './my-subscriptions.js';
import { myVideoPlaylistsRouter } from './my-video-playlists.js';
import { registrationsRouter } from './registrations.js';
import { twoFactorRouter } from './two-factor.js';
import { userExportsRouter } from './user-exports.js';
import { userImportRouter } from './user-imports.js';
const auditLogger = auditLoggerFactory('users');
const lTags = loggerTagsFactory('api', 'users');
const usersRouter = express.Router();
usersRouter.use(apiRateLimiter);
usersRouter.use('/', emailVerificationRouter);
usersRouter.use('/', userExportsRouter);
usersRouter.use('/', userImportRouter);
usersRouter.use('/', registrationsRouter);
usersRouter.use('/', twoFactorRouter);
usersRouter.use('/', tokensRouter);
usersRouter.use('/', myNotificationsRouter);
usersRouter.use('/', mySubscriptionsRouter);
usersRouter.use('/', myBlocklistRouter);
usersRouter.use('/', myVideosHistoryRouter);
usersRouter.use('/', myVideoPlaylistsRouter);
usersRouter.use('/', myAbusesRouter);
usersRouter.use('/', meRouter);
usersRouter.get('/autocomplete', userAutocompleteValidator, asyncMiddleware(autocompleteUsers));
usersRouter.get('/', authenticate, ensureUserHasRight(UserRight.MANAGE_USERS), paginationValidator, adminUsersSortValidator, setDefaultSort, setDefaultPagination, usersListValidator, asyncMiddleware(listUsers));
usersRouter.post('/:id/block', authenticate, ensureUserHasRight(UserRight.MANAGE_USERS), asyncMiddleware(usersBlockToggleValidator), asyncMiddleware(blockUser));
usersRouter.post('/:id/unblock', authenticate, ensureUserHasRight(UserRight.MANAGE_USERS), asyncMiddleware(usersBlockToggleValidator), asyncMiddleware(unblockUser));
usersRouter.get('/:id', authenticate, ensureUserHasRight(UserRight.MANAGE_USERS), asyncMiddleware(usersGetValidator), getUser);
usersRouter.post('/', authenticate, ensureUserHasRight(UserRight.MANAGE_USERS), asyncMiddleware(usersAddValidator), asyncRetryTransactionMiddleware(createUser));
usersRouter.put('/:id', authenticate, ensureUserHasRight(UserRight.MANAGE_USERS), asyncMiddleware(usersUpdateValidator), asyncMiddleware(updateUser));
usersRouter.delete('/:id', authenticate, ensureUserHasRight(UserRight.MANAGE_USERS), asyncMiddleware(usersRemoveValidator), asyncMiddleware(removeUser));
usersRouter.post('/ask-reset-password', asyncMiddleware(usersAskResetPasswordValidator), asyncMiddleware(askResetUserPassword));
usersRouter.post('/:id/reset-password', asyncMiddleware(usersResetPasswordValidator), asyncMiddleware(resetUserPassword));
export { usersRouter };
async function createUser(req, res) {
    const body = req.body;
    const userToCreate = buildUser(Object.assign(Object.assign({}, pick(body, ['username', 'password', 'email', 'role', 'videoQuota', 'videoQuotaDaily', 'adminFlags'])), { emailVerified: null }));
    const createPassword = userToCreate.password === '';
    if (createPassword) {
        userToCreate.password = await generateRandomString(20);
    }
    const { user, account, videoChannel } = await createUserAccountAndChannelAndPlaylist({
        userToCreate,
        channelNames: body.channelName && { name: body.channelName, displayName: body.channelName }
    });
    auditLogger.create(getAuditIdFromRes(res), new UserAuditView(user.toFormattedJSON()));
    logger.info('User %s with its channel and account created.', body.username, lTags(user.username));
    if (createPassword) {
        logger.info('Sending to user %s a create password email', body.username, lTags(user.username));
        const verificationString = await Redis.Instance.setCreatePasswordVerificationString(user.id);
        const url = WEBSERVER.URL + '/reset-password?userId=' + user.id + '&verificationString=' + verificationString;
        Emailer.Instance.addPasswordCreateEmailJob(userToCreate.username, user.email, url);
    }
    Hooks.runAction('action:api.user.created', { body, user, account, videoChannel, req, res });
    return res.json({
        user: {
            id: user.id,
            account: {
                id: account.id
            }
        }
    });
}
async function unblockUser(req, res) {
    const user = res.locals.user;
    const byUser = res.locals.oauth.token.User;
    await changeUserBlock(res, user, false);
    logger.info(`Unblocked user ${user.username} by moderator ${byUser.username}.`, lTags(user.username, byUser.username));
    Hooks.runAction('action:api.user.unblocked', { user, req, res });
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function blockUser(req, res) {
    const user = res.locals.user;
    const byUser = res.locals.oauth.token.User;
    const reason = req.body.reason;
    await changeUserBlock(res, user, true, reason);
    logger.info(`Blocked user ${user.username} by moderator ${byUser.username}.`, lTags(user.username, byUser.username));
    Hooks.runAction('action:api.user.blocked', { user, req, res });
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
function getUser(req, res) {
    return res.json(res.locals.user.toFormattedJSON({ withAdminFlags: true }));
}
async function autocompleteUsers(req, res) {
    const resultList = await UserModel.autoComplete(req.query.search);
    return res.json(resultList);
}
async function listUsers(req, res) {
    const resultList = await UserModel.listForAdminApi({
        start: req.query.start,
        count: req.query.count,
        sort: req.query.sort,
        search: req.query.search,
        blocked: req.query.blocked
    });
    return res.json(getFormattedObjects(resultList.data, resultList.total, { withAdminFlags: true }));
}
async function removeUser(req, res) {
    const user = res.locals.user;
    const byUser = res.locals.oauth.token.User;
    auditLogger.delete(getAuditIdFromRes(res), new UserAuditView(user.toFormattedJSON()));
    await sequelizeTypescript.transaction(async (t) => {
        await user.destroy({ transaction: t });
    });
    logger.info(`Removed user ${user.username} by moderator ${byUser.username}.`, lTags(user.username, byUser.username));
    Hooks.runAction('action:api.user.deleted', { user, req, res });
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function updateUser(req, res) {
    const body = req.body;
    const userToUpdate = res.locals.user;
    const byUser = res.locals.oauth.token.User;
    const oldUserAuditView = new UserAuditView(userToUpdate.toFormattedJSON());
    const roleChanged = body.role !== undefined && body.role !== userToUpdate.role;
    const keysToUpdate = [
        'password',
        'email',
        'emailVerified',
        'videoQuota',
        'videoQuotaDaily',
        'role',
        'adminFlags',
        'pluginAuth'
    ];
    for (const key of keysToUpdate) {
        if (body[key] !== undefined)
            userToUpdate.set(key, body[key]);
    }
    const user = await userToUpdate.save();
    if (roleChanged || body.password !== undefined)
        await OAuthTokenModel.deleteUserToken(userToUpdate.id);
    auditLogger.update(getAuditIdFromRes(res), new UserAuditView(user.toFormattedJSON()), oldUserAuditView);
    logger.info(`Updated user ${user.username} by moderator ${byUser.username}.`, lTags(user.username, byUser.username));
    Hooks.runAction('action:api.user.updated', { user, req, res });
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function askResetUserPassword(req, res) {
    const user = res.locals.user;
    const verificationString = await Redis.Instance.setResetPasswordVerificationString(user.id);
    const url = WEBSERVER.URL + '/reset-password?userId=' + user.id + '&verificationString=' + verificationString;
    Emailer.Instance.addPasswordResetEmailJob(user.username, user.email, url);
    logger.info(`User ${user.username} asked password reset.`, lTags(user.username));
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function resetUserPassword(req, res) {
    const user = res.locals.user;
    user.password = req.body.password;
    await user.save();
    await Redis.Instance.removePasswordVerificationString(user.id);
    logger.info(`User ${user.username} reset its password.`, lTags(user.username));
    return res.status(HttpStatusCode.NO_CONTENT_204).end();
}
async function changeUserBlock(res, user, block, reason) {
    const oldUserAuditView = new UserAuditView(user.toFormattedJSON());
    user.blocked = block;
    user.blockedReason = reason || null;
    await sequelizeTypescript.transaction(async (t) => {
        await OAuthTokenModel.deleteUserToken(user.id, t);
        await user.save({ transaction: t });
    });
    Emailer.Instance.addUserBlockJob(user, block, reason);
    auditLogger.update(getAuditIdFromRes(res), new UserAuditView(user.toFormattedJSON()), oldUserAuditView);
}
//# sourceMappingURL=index.js.map