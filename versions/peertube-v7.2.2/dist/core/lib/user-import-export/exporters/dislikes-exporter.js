import { AbstractUserExporter } from './abstract-user-exporter.js';
import { AccountVideoRateModel } from '../../../models/account/account-video-rate.js';
import { activityPubCollection } from '../../activitypub/collection.js';
import { getContextFilter } from '../../activitypub/context.js';
import { activityPubContextify } from '../../../helpers/activity-pub-utils.js';
export class DislikesExporter extends AbstractUserExporter {
    async export() {
        const dislikes = await AccountVideoRateModel.listRatesOfAccountIdForExport(this.user.Account.id, 'dislike');
        return {
            json: {
                dislikes: this.formatDislikesJSON(dislikes)
            },
            activityPub: await this.formatDislikesAP(dislikes),
            staticFiles: []
        };
    }
    getActivityPubFilename() {
        return this.activityPubFilenames.dislikes;
    }
    formatDislikesJSON(dislikes) {
        return dislikes.map(o => ({ videoUrl: o.Video.url, createdAt: o.createdAt.toISOString() }));
    }
    formatDislikesAP(dislikes) {
        return activityPubContextify(activityPubCollection(this.getActivityPubFilename(), dislikes.map(l => l.Video.url)), 'Rate', getContextFilter());
    }
}
//# sourceMappingURL=dislikes-exporter.js.map