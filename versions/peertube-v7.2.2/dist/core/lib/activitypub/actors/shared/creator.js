import { Op } from 'sequelize';
import { ActorImageType } from '@peertube/peertube-models';
import { sequelizeTypescript } from '../../../../initializers/database.js';
import { AccountModel } from '../../../../models/account/account.js';
import { ActorModel } from '../../../../models/actor/actor.js';
import { ServerModel } from '../../../../models/server/server.js';
import { VideoChannelModel } from '../../../../models/video/video-channel.js';
import { updateActorImages } from '../image.js';
import { getActorAttributesFromObject, getActorDisplayNameFromObject, getImagesInfoFromObject } from './object-to-model-attributes.js';
import { fetchActorFollowsCount } from './url-to-object.js';
import { isAccountActor, isChannelActor } from '../../../../helpers/actors.js';
export class APActorCreator {
    constructor(actorObject, ownerActor) {
        this.actorObject = actorObject;
        this.ownerActor = ownerActor;
    }
    async create() {
        const { followersCount, followingCount } = await fetchActorFollowsCount(this.actorObject);
        const actorInstance = new ActorModel(getActorAttributesFromObject(this.actorObject, followersCount, followingCount));
        return sequelizeTypescript.transaction(async (t) => {
            const server = await this.setServer(actorInstance, t);
            const { actorCreated, created } = await this.saveActor(actorInstance, t);
            await this.setImageIfNeeded(actorCreated, ActorImageType.AVATAR, t);
            await this.setImageIfNeeded(actorCreated, ActorImageType.BANNER, t);
            await this.tryToFixActorUrlIfNeeded(actorCreated, actorInstance, created, t);
            if (isAccountActor(actorCreated.type)) {
                actorCreated.Account = await this.saveAccount(actorCreated, t);
                actorCreated.Account.Actor = actorCreated;
            }
            if (isChannelActor(actorCreated.type)) {
                const channel = await this.saveVideoChannel(actorCreated, t);
                actorCreated.VideoChannel = Object.assign(channel, { Actor: actorCreated, Account: this.ownerActor.Account });
            }
            actorCreated.Server = server;
            return actorCreated;
        });
    }
    async setServer(actor, t) {
        const actorHost = new URL(actor.url).host;
        const serverOptions = {
            where: {
                host: actorHost
            },
            defaults: {
                host: actorHost
            },
            transaction: t
        };
        const [server] = await ServerModel.findOrCreate(serverOptions);
        actor.serverId = server.id;
        return server;
    }
    async setImageIfNeeded(actor, type, t) {
        const imagesInfo = getImagesInfoFromObject(this.actorObject, type);
        if (imagesInfo.length === 0)
            return;
        return updateActorImages(actor, type, imagesInfo, t);
    }
    async saveActor(actor, t) {
        const [actorCreated, created] = await ActorModel.findOrCreate({
            defaults: actor.toJSON(),
            where: {
                [Op.or]: [
                    {
                        url: actor.url
                    },
                    {
                        serverId: actor.serverId,
                        preferredUsername: actor.preferredUsername
                    }
                ]
            },
            transaction: t
        });
        return { actorCreated, created };
    }
    async tryToFixActorUrlIfNeeded(actorCreated, newActor, created, t) {
        if (created !== true && actorCreated.url !== newActor.url) {
            if (actorCreated.url.replace(/^http:\/\//, '') !== newActor.url.replace(/^https:\/\//, '')) {
                throw new Error(`Actor from DB with URL ${actorCreated.url} does not correspond to actor ${newActor.url}`);
            }
            actorCreated.url = newActor.url;
            await actorCreated.save({ transaction: t });
        }
    }
    async saveAccount(actor, t) {
        const [accountCreated] = await AccountModel.findOrCreate({
            defaults: {
                name: getActorDisplayNameFromObject(this.actorObject),
                description: this.actorObject.summary,
                actorId: actor.id
            },
            where: {
                actorId: actor.id
            },
            transaction: t
        });
        return accountCreated;
    }
    async saveVideoChannel(actor, t) {
        const [videoChannelCreated] = await VideoChannelModel.findOrCreate({
            defaults: {
                name: getActorDisplayNameFromObject(this.actorObject),
                description: this.actorObject.summary,
                support: this.actorObject.support,
                actorId: actor.id,
                accountId: this.ownerActor.Account.id
            },
            where: {
                actorId: actor.id
            },
            transaction: t
        });
        return videoChannelCreated;
    }
}
//# sourceMappingURL=creator.js.map