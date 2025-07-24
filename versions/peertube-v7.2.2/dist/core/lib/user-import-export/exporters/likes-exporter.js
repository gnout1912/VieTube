import { AbstractUserExporter } from './abstract-user-exporter.js';
import { AccountVideoRateModel } from '../../../models/account/account-video-rate.js';
import { activityPubCollection } from '../../activitypub/collection.js';
import { activityPubContextify } from '../../../helpers/activity-pub-utils.js';
import { getContextFilter } from '../../activitypub/context.js';
export class LikesExporter extends AbstractUserExporter {
    async export() {
        const likes = await AccountVideoRateModel.listRatesOfAccountIdForExport(this.user.Account.id, 'like');
        return {
            json: {
                likes: this.formatLikesJSON(likes)
            },
            activityPub: await this.formatLikesAP(likes),
            staticFiles: []
        };
    }
    getActivityPubFilename() {
        return this.activityPubFilenames.likes;
    }
    formatLikesJSON(likes) {
        return likes.map(o => ({ videoUrl: o.Video.url, createdAt: o.createdAt.toISOString() }));
    }
    formatLikesAP(likes) {
        return activityPubContextify(activityPubCollection(this.getActivityPubFilename(), likes.map(l => l.Video.url)), 'Collection', getContextFilter());
    }
}
//# sourceMappingURL=likes-exporter.js.map