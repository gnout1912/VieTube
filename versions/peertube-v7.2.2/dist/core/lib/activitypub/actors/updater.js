import { ActorImageType } from '@peertube/peertube-models';
import { resetSequelizeInstance, runInReadCommittedTransaction } from '../../../helpers/database-utils.js';
import { logger } from '../../../helpers/logger.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { getOrCreateAPOwner } from './get.js';
import { updateActorImages } from './image.js';
import { fetchActorFollowsCount } from './shared/index.js';
import { getImagesInfoFromObject } from './shared/object-to-model-attributes.js';
export class APActorUpdater {
    constructor(actorObject, actor) {
        this.actorObject = actorObject;
        this.actor = actor;
        if (this.actorObject.type === 'Group')
            this.accountOrChannel = this.actor.VideoChannel;
        else
            this.accountOrChannel = this.actor.Account;
    }
    async update() {
        const avatarsInfo = getImagesInfoFromObject(this.actorObject, ActorImageType.AVATAR);
        const bannersInfo = getImagesInfoFromObject(this.actorObject, ActorImageType.BANNER);
        try {
            await this.updateActorInstance(this.actor, this.actorObject);
            this.accountOrChannel.name = this.actorObject.name || this.actorObject.preferredUsername;
            this.accountOrChannel.description = this.actorObject.summary;
            if (this.accountOrChannel instanceof VideoChannelModel) {
                const owner = await getOrCreateAPOwner(this.actorObject, this.actorObject.id);
                this.accountOrChannel.accountId = owner.Account.id;
                this.accountOrChannel.Account = owner.Account;
                this.accountOrChannel.support = this.actorObject.support;
            }
            await runInReadCommittedTransaction(async (t) => {
                await updateActorImages(this.actor, ActorImageType.BANNER, bannersInfo, t);
                await updateActorImages(this.actor, ActorImageType.AVATAR, avatarsInfo, t);
            });
            await runInReadCommittedTransaction(async (t) => {
                await this.actor.save({ transaction: t });
                await this.accountOrChannel.save({ transaction: t });
            });
            logger.info(`Remote account ${this.actorObject.id} updated`);
        }
        catch (err) {
            if (this.actor !== undefined) {
                await resetSequelizeInstance(this.actor);
            }
            if (this.accountOrChannel !== undefined) {
                await resetSequelizeInstance(this.accountOrChannel);
            }
            logger.debug('Cannot update the remote account.', { err });
            throw err;
        }
    }
    async updateActorInstance(actorInstance, actorObject) {
        var _a;
        const { followersCount, followingCount } = await fetchActorFollowsCount(actorObject);
        actorInstance.type = actorObject.type;
        actorInstance.preferredUsername = actorObject.preferredUsername;
        actorInstance.url = actorObject.id;
        actorInstance.publicKey = actorObject.publicKey.publicKeyPem;
        actorInstance.followersCount = followersCount;
        actorInstance.followingCount = followingCount;
        actorInstance.inboxUrl = actorObject.inbox;
        actorInstance.outboxUrl = actorObject.outbox;
        actorInstance.followersUrl = actorObject.followers;
        actorInstance.followingUrl = actorObject.following;
        if (actorObject.published)
            actorInstance.remoteCreatedAt = new Date(actorObject.published);
        if ((_a = actorObject.endpoints) === null || _a === void 0 ? void 0 : _a.sharedInbox) {
            actorInstance.sharedInboxUrl = actorObject.endpoints.sharedInbox;
        }
        actorInstance.changed('updatedAt', true);
    }
}
//# sourceMappingURL=updater.js.map