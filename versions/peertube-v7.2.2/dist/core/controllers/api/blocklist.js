import express from 'express';
import { handleToNameAndHost } from '../../helpers/actors.js';
import { logger } from '../../helpers/logger.js';
import { AccountBlocklistModel } from '../../models/account/account-blocklist.js';
import { getServerActor } from '../../models/application/application.js';
import { ServerBlocklistModel } from '../../models/server/server-blocklist.js';
import { apiRateLimiter, asyncMiddleware, blocklistStatusValidator, optionalAuthenticate } from '../../middlewares/index.js';
const blocklistRouter = express.Router();
blocklistRouter.use(apiRateLimiter);
blocklistRouter.get('/status', optionalAuthenticate, blocklistStatusValidator, asyncMiddleware(getBlocklistStatus));
export { blocklistRouter };
async function getBlocklistStatus(req, res) {
    var _a;
    const hosts = req.query.hosts;
    const accounts = req.query.accounts;
    const user = (_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.User;
    const serverActor = await getServerActor();
    const byAccountIds = [serverActor.Account.id];
    if (user)
        byAccountIds.push(user.Account.id);
    const status = {
        accounts: {},
        hosts: {}
    };
    const baseOptions = {
        byAccountIds,
        user,
        serverActor,
        status
    };
    await Promise.all([
        populateServerBlocklistStatus(Object.assign(Object.assign({}, baseOptions), { hosts })),
        populateAccountBlocklistStatus(Object.assign(Object.assign({}, baseOptions), { accounts }))
    ]);
    return res.json(status);
}
async function populateServerBlocklistStatus(options) {
    const { byAccountIds, user, serverActor, hosts, status } = options;
    if (!hosts || hosts.length === 0)
        return;
    const serverBlocklistStatus = await ServerBlocklistModel.getBlockStatus(byAccountIds, hosts);
    logger.debug('Got server blocklist status.', { serverBlocklistStatus, byAccountIds, hosts });
    for (const host of hosts) {
        const block = serverBlocklistStatus.find(b => b.host === host);
        status.hosts[host] = getStatus(block, serverActor, user);
    }
}
async function populateAccountBlocklistStatus(options) {
    const { byAccountIds, user, serverActor, accounts, status } = options;
    if (!accounts || accounts.length === 0)
        return;
    const accountBlocklistStatus = await AccountBlocklistModel.getBlockStatus(byAccountIds, accounts);
    logger.debug('Got account blocklist status.', { accountBlocklistStatus, byAccountIds, accounts });
    for (const account of accounts) {
        const sanitizedHandle = handleToNameAndHost(account);
        const block = accountBlocklistStatus.find(b => b.name === sanitizedHandle.name && b.host === sanitizedHandle.host);
        status.accounts[sanitizedHandle.handle] = getStatus(block, serverActor, user);
    }
}
function getStatus(block, serverActor, user) {
    return {
        blockedByServer: !!(block && block.accountId === serverActor.Account.id),
        blockedByUser: !!(block && user && block.accountId === user.Account.id)
    };
}
//# sourceMappingURL=blocklist.js.map