import { AbstractUserExporter } from './abstract-user-exporter.js';
import { ActorFollowModel } from '../../../models/actor/actor-follow.js';
import { activityPubCollection } from '../../activitypub/collection.js';
import { activityPubContextify } from '../../../helpers/activity-pub-utils.js';
import { getContextFilter } from '../../activitypub/context.js';
export class FollowingExporter extends AbstractUserExporter {
    async export() {
        const following = await ActorFollowModel.listAcceptedFollowingForExport(this.user.Account.actorId);
        const followingJSON = this.formatFollowingJSON(following, this.user.Account.Actor.getFullIdentifier());
        return {
            json: { following: followingJSON },
            staticFiles: [],
            activityPub: await this.formatFollowingAP(following)
        };
    }
    getActivityPubFilename() {
        return this.activityPubFilenames.following;
    }
    formatFollowingJSON(follows, handle) {
        return follows.map(f => ({
            handle,
            targetHandle: f.followingHandle,
            createdAt: f.createdAt.toISOString()
        }));
    }
    formatFollowingAP(follows) {
        return activityPubContextify(activityPubCollection(this.getActivityPubFilename(), follows.map(f => f.followingUrl)), 'Collection', getContextFilter());
    }
}
//# sourceMappingURL=following-exporter.js.map