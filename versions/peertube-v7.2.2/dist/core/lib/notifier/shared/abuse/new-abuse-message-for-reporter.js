import { logger } from '../../../../helpers/logger.js';
import { getAbuseIdentifier } from '../../../activitypub/url.js';
import { UserModel } from '../../../../models/user/user.js';
import { AbstractNewAbuseMessage } from './abstract-new-abuse-message.js';
export class NewAbuseMessageForReporter extends AbstractNewAbuseMessage {
    async prepare() {
        if (this.abuse.ReporterAccount.isOwned() !== true)
            return;
        await this.loadMessageAccount();
        const reporter = await UserModel.loadByAccountActorId(this.abuse.ReporterAccount.actorId);
        if (reporter.Account.id === this.message.accountId)
            return;
        this.reporter = reporter;
    }
    log() {
        logger.info('Notifying reporter of new abuse message on %s.', getAbuseIdentifier(this.abuse));
    }
    getTargetUsers() {
        if (!this.reporter)
            return [];
        return [this.reporter];
    }
    createEmail(to) {
        return this.createEmailFor(to, 'reporter');
    }
}
//# sourceMappingURL=new-abuse-message-for-reporter.js.map