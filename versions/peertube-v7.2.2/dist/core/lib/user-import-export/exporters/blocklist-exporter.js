import { AbstractUserExporter } from './abstract-user-exporter.js';
import { ServerBlocklistModel } from '../../../models/server/server-blocklist.js';
import { AccountBlocklistModel } from '../../../models/account/account-blocklist.js';
export class BlocklistExporter extends AbstractUserExporter {
    async export() {
        const [instancesBlocklist, accountsBlocklist] = await Promise.all([
            ServerBlocklistModel.listHostsBlockedBy([this.user.Account.id]),
            AccountBlocklistModel.listHandlesBlockedBy([this.user.Account.id])
        ]);
        return {
            json: {
                instances: instancesBlocklist.map(b => ({ host: b })),
                actors: accountsBlocklist.map(h => ({ handle: h }))
            },
            staticFiles: []
        };
    }
}
//# sourceMappingURL=blocklist-exporter.js.map