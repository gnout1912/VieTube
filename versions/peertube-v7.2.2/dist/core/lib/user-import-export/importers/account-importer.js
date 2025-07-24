import { ActorImageType } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { AbstractUserImporter } from './abstract-user-importer.js';
import { updateLocalActorImageFiles } from '../../local-actor.js';
import { saveInTransactionWithRetries } from '../../../helpers/database-utils.js';
import { CONSTRAINTS_FIELDS } from '../../../initializers/constants.js';
import { isUserDescriptionValid, isUserDisplayNameValid } from '../../../helpers/custom-validators/users.js';
import { pick } from '@peertube/peertube-core-utils';
const lTags = loggerTagsFactory('user-import');
export class AccountImporter extends AbstractUserImporter {
    getImportObjects(json) {
        return [json];
    }
    sanitize(blocklistImportData) {
        if (!isUserDisplayNameValid(blocklistImportData.displayName))
            return undefined;
        if (!isUserDescriptionValid(blocklistImportData.description))
            blocklistImportData.description = null;
        return pick(blocklistImportData, ['displayName', 'description', 'archiveFiles']);
    }
    async importObject(accountImportData) {
        const account = this.user.Account;
        account.name = accountImportData.displayName;
        account.description = accountImportData.description;
        await saveInTransactionWithRetries(account);
        await this.importAvatar(account, accountImportData);
        logger.info('Account %s imported.', account.name, lTags());
        return { duplicate: false };
    }
    async importAvatar(account, accountImportData) {
        const avatarPath = this.getSafeArchivePathOrThrow(accountImportData.archiveFiles.avatar);
        if (!avatarPath)
            return undefined;
        if (!await this.isFileValidOrLog(avatarPath, CONSTRAINTS_FIELDS.ACTORS.IMAGE.FILE_SIZE.max))
            return undefined;
        await updateLocalActorImageFiles({
            accountOrChannel: account,
            imagePhysicalFile: { path: avatarPath },
            type: ActorImageType.AVATAR,
            sendActorUpdate: false
        });
    }
}
//# sourceMappingURL=account-importer.js.map