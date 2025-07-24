import { ActorImageType } from '@peertube/peertube-models';
import { ActorExporter } from './actor-exporter.js';
import { AccountModel } from '../../../models/account/account.js';
import { getContextFilter } from '../../activitypub/context.js';
import { activityPubContextify } from '../../../helpers/activity-pub-utils.js';
import { join } from 'path';
export class AccountExporter extends ActorExporter {
    async export() {
        const account = await AccountModel.loadLocalByName(this.user.username);
        const { staticFiles, relativePathsFromJSON } = this.exportActorFiles(account.Actor);
        return {
            json: this.exportAccountJSON(account, relativePathsFromJSON),
            staticFiles,
            activityPub: await this.exportAccountAP(account)
        };
    }
    getActivityPubFilename() {
        return this.activityPubFilenames.account;
    }
    exportAccountJSON(account, archiveFiles) {
        return Object.assign(Object.assign({}, this.exportActorJSON(account.Actor)), { displayName: account.getDisplayName(), description: account.description, updatedAt: account.updatedAt.toISOString(), createdAt: account.createdAt.toISOString(), archiveFiles });
    }
    async exportAccountAP(account) {
        const avatar = account.Actor.getMaxQualityImage(ActorImageType.AVATAR);
        return activityPubContextify(Object.assign(Object.assign({}, await account.toActivityPubObject()), { likes: this.activityPubFilenames.likes, dislikes: this.activityPubFilenames.dislikes, outbox: this.activityPubFilenames.outbox, following: this.activityPubFilenames.following, icon: avatar
                ? [
                    Object.assign(Object.assign({}, avatar.toActivityPubObject()), { url: join(this.relativeStaticDirPath, this.getAvatarPath(account.Actor, avatar.filename)) })
                ]
                : [] }), 'Actor', getContextFilter());
    }
}
//# sourceMappingURL=account-exporter.js.map