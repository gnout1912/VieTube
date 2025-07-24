import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { AbstractUserImporter } from './abstract-user-importer.js';
import { addAccountInBlocklist, addServerInBlocklist } from '../../blocklist.js';
import { ServerModel } from '../../../models/server/server.js';
import { AccountModel } from '../../../models/account/account.js';
import { isValidActorHandle } from '../../../helpers/custom-validators/activitypub/actor.js';
import { isHostValid } from '../../../helpers/custom-validators/servers.js';
import { pick } from '@peertube/peertube-core-utils';
const lTags = loggerTagsFactory('user-import');
export class BlocklistImporter extends AbstractUserImporter {
    getImportObjects(json) {
        return [
            ...json.actors.map(o => ({ handle: o.handle, host: null })),
            ...json.instances.map(o => ({ handle: null, host: o.host }))
        ];
    }
    sanitize(blocklistImportData) {
        if (!isValidActorHandle(blocklistImportData.handle) && !isHostValid(blocklistImportData.host))
            return undefined;
        return pick(blocklistImportData, ['handle', 'host']);
    }
    async importObject(blocklistImportData) {
        if (blocklistImportData.handle) {
            await this.importAccountBlock(blocklistImportData.handle);
        }
        else {
            await this.importServerBlock(blocklistImportData.host);
        }
        return { duplicate: false };
    }
    async importAccountBlock(handle) {
        const accountToBlock = await AccountModel.loadByHandle(handle);
        if (!accountToBlock) {
            logger.info('Account %s was not blocked on user import because it cannot be found in the database.', handle, lTags());
            return;
        }
        await addAccountInBlocklist({
            byAccountId: this.user.Account.id,
            targetAccountId: accountToBlock.id,
            removeNotificationOfUserId: this.user.id
        });
        logger.info('Account %s blocked on user import.', handle, lTags());
    }
    async importServerBlock(hostToBlock) {
        const serverToBlock = await ServerModel.loadOrCreateByHost(hostToBlock);
        await addServerInBlocklist({
            byAccountId: this.user.Account.id,
            targetServerId: serverToBlock.id,
            removeNotificationOfUserId: this.user.id
        });
        logger.info('Server %s blocked on user import.', hostToBlock, lTags());
    }
}
//# sourceMappingURL=account-blocklist-importer.js.map