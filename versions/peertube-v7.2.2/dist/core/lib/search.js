import { CONFIG } from '../initializers/config.js';
import { AccountBlocklistModel } from '../models/account/account-blocklist.js';
import { getServerActor } from '../models/application/application.js';
import { ServerBlocklistModel } from '../models/server/server-blocklist.js';
function isSearchIndexSearch(query) {
    if (query.searchTarget === 'search-index')
        return true;
    const searchIndexConfig = CONFIG.SEARCH.SEARCH_INDEX;
    if (searchIndexConfig.ENABLED !== true)
        return false;
    if (searchIndexConfig.IS_DEFAULT_SEARCH && !query.searchTarget)
        return true;
    return false;
}
async function buildMutedForSearchIndex(res) {
    const serverActor = await getServerActor();
    const accountIds = [serverActor.Account.id];
    if (res.locals.oauth) {
        accountIds.push(res.locals.oauth.token.User.Account.id);
    }
    const [blockedHosts, blockedAccounts] = await Promise.all([
        ServerBlocklistModel.listHostsBlockedBy(accountIds),
        AccountBlocklistModel.listHandlesBlockedBy(accountIds)
    ]);
    return {
        blockedHosts,
        blockedAccounts
    };
}
function isURISearch(search) {
    if (!search)
        return false;
    return search.startsWith('http://') || search.startsWith('https://');
}
export { isSearchIndexSearch, buildMutedForSearchIndex, isURISearch };
//# sourceMappingURL=search.js.map