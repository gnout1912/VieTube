import { sequelizeTypescript } from '../initializers/database.js';
import { getServerActor } from '../models/application/application.js';
import { AccountBlocklistModel } from '../models/account/account-blocklist.js';
import { ServerBlocklistModel } from '../models/server/server-blocklist.js';
import { UserNotificationModel } from '../models/user/user-notification.js';
import { logger } from '../helpers/logger.js';
async function addAccountInBlocklist(options) {
    const { byAccountId, targetAccountId, removeNotificationOfUserId } = options;
    await sequelizeTypescript.transaction(async (t) => {
        return AccountBlocklistModel.upsert({
            accountId: byAccountId,
            targetAccountId
        }, { transaction: t });
    });
    UserNotificationModel.removeNotificationsOf({
        id: targetAccountId,
        type: 'account',
        forUserId: removeNotificationOfUserId
    }).catch(err => logger.error('Cannot remove notifications after an account mute.', { err }));
}
async function addServerInBlocklist(options) {
    const { byAccountId, targetServerId, removeNotificationOfUserId } = options;
    await sequelizeTypescript.transaction(async (t) => {
        return ServerBlocklistModel.upsert({
            accountId: byAccountId,
            targetServerId
        }, { transaction: t });
    });
    UserNotificationModel.removeNotificationsOf({
        id: targetServerId,
        type: 'server',
        forUserId: removeNotificationOfUserId
    }).catch(err => logger.error('Cannot remove notifications after a server mute.', { err }));
}
function removeAccountFromBlocklist(accountBlock) {
    return sequelizeTypescript.transaction(async (t) => {
        return accountBlock.destroy({ transaction: t });
    });
}
function removeServerFromBlocklist(serverBlock) {
    return sequelizeTypescript.transaction(async (t) => {
        return serverBlock.destroy({ transaction: t });
    });
}
async function isBlockedByServerOrAccount(targetAccount, userAccount) {
    const serverAccountId = (await getServerActor()).Account.id;
    const sourceAccounts = [serverAccountId];
    if (userAccount)
        sourceAccounts.push(userAccount.id);
    const accountMutedHash = await AccountBlocklistModel.isAccountMutedByAccounts(sourceAccounts, targetAccount.id);
    if (accountMutedHash[serverAccountId] || (userAccount && accountMutedHash[userAccount.id])) {
        return true;
    }
    const instanceMutedHash = await ServerBlocklistModel.isServerMutedByAccounts(sourceAccounts, targetAccount.Actor.serverId);
    if (instanceMutedHash[serverAccountId] || (userAccount && instanceMutedHash[userAccount.id])) {
        return true;
    }
    return false;
}
export { addAccountInBlocklist, addServerInBlocklist, removeAccountFromBlocklist, removeServerFromBlocklist, isBlockedByServerOrAccount };
//# sourceMappingURL=blocklist.js.map