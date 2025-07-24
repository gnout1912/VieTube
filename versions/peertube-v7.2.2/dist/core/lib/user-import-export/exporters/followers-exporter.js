import { AbstractUserExporter } from './abstract-user-exporter.js';
import { ActorFollowModel } from '../../../models/actor/actor-follow.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
export class FollowersExporter extends AbstractUserExporter {
    async export() {
        let followersJSON = this.formatFollowersJSON(await ActorFollowModel.listAcceptedFollowersForExport(this.user.Account.actorId), this.user.Account.Actor.getFullIdentifier());
        const channels = await VideoChannelModel.listAllByAccount(this.user.Account.id);
        for (const channel of channels) {
            followersJSON = followersJSON.concat(this.formatFollowersJSON(await ActorFollowModel.listAcceptedFollowersForExport(channel.Actor.id), channel.Actor.getFullIdentifier()));
        }
        return {
            json: { followers: followersJSON },
            staticFiles: []
        };
    }
    formatFollowersJSON(follows, targetHandle) {
        return follows.map(f => ({
            targetHandle,
            handle: f.followerHandle,
            createdAt: f.createdAt.toISOString()
        }));
    }
}
//# sourceMappingURL=followers-exporter.js.map