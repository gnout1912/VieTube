import { logger } from '../../../../helpers/logger.js';
import { getAbuseIdentifier } from '../../../activitypub/url.js';
import { UserModel } from '../../../../models/user/user.js';
import { UserRight } from '@peertube/peertube-models';
import { AbstractNewAbuseMessage } from './abstract-new-abuse-message.js';
export class NewAbuseMessageForModerators extends AbstractNewAbuseMessage {
    async prepare() {
        this.moderators = await UserModel.listWithRight(UserRight.MANAGE_ABUSES);
        this.moderators = this.moderators.filter(m => m.Account.id !== this.message.accountId);
        if (this.moderators.length === 0)
            return;
        await this.loadMessageAccount();
    }
    log() {
        logger.info('Notifying moderators of new abuse message on %s.', getAbuseIdentifier(this.abuse));
    }
    getTargetUsers() {
        return this.moderators;
    }
    createEmail(to) {
        return this.createEmailFor(to, 'moderator');
    }
}
//# sourceMappingURL=new-abuse-message-for-moderators.js.map