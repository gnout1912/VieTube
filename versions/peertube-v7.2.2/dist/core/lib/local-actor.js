import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { ActorImageType } from '@peertube/peertube-models';
import { ActorModel } from '../models/actor/actor.js';
import { buildUUID, getLowercaseExtension } from '@peertube/peertube-node-utils';
import { retryTransactionWrapper } from '../helpers/database-utils.js';
import { CONFIG } from '../initializers/config.js';
import { ACTOR_IMAGES_SIZE, WEBSERVER } from '../initializers/constants.js';
import { sequelizeTypescript } from '../initializers/database.js';
import { deleteActorImages, updateActorImages } from './activitypub/actors/index.js';
import { sendUpdateActor } from './activitypub/send/index.js';
import { processImageFromWorker } from './worker/parent-process.js';
export function buildActorInstance(type, url, preferredUsername) {
    return new ActorModel({
        type,
        url,
        preferredUsername,
        publicKey: null,
        privateKey: null,
        followersCount: 0,
        followingCount: 0,
        inboxUrl: url + '/inbox',
        outboxUrl: url + '/outbox',
        sharedInboxUrl: WEBSERVER.URL + '/inbox',
        followersUrl: url + '/followers',
        followingUrl: url + '/following'
    });
}
export async function updateLocalActorImageFiles(options) {
    const { accountOrChannel, imagePhysicalFile, type, sendActorUpdate } = options;
    const processImageSize = async (imageSize) => {
        const extension = getLowercaseExtension(imagePhysicalFile.path);
        const imageName = buildUUID() + extension;
        const destination = join(CONFIG.STORAGE.ACTOR_IMAGES_DIR, imageName);
        await processImageFromWorker({ path: imagePhysicalFile.path, destination, newSize: imageSize, keepOriginal: true });
        return {
            imageName,
            imageSize
        };
    };
    const processedImages = await Promise.all(ACTOR_IMAGES_SIZE[type].map(processImageSize));
    await remove(imagePhysicalFile.path);
    return retryTransactionWrapper(() => sequelizeTypescript.transaction(async (t) => {
        const actorImagesInfo = processedImages.map(({ imageName, imageSize }) => ({
            name: imageName,
            fileUrl: null,
            height: imageSize.height,
            width: imageSize.width,
            onDisk: true
        }));
        const updatedActor = await updateActorImages(accountOrChannel.Actor, type, actorImagesInfo, t);
        await updatedActor.save({ transaction: t });
        if (sendActorUpdate) {
            await sendUpdateActor(accountOrChannel, t);
        }
        return type === ActorImageType.AVATAR
            ? updatedActor.Avatars
            : updatedActor.Banners;
    }));
}
export async function deleteLocalActorImageFile(accountOrChannel, type) {
    return retryTransactionWrapper(() => {
        return sequelizeTypescript.transaction(async (t) => {
            const updatedActor = await deleteActorImages(accountOrChannel.Actor, type, t);
            await updatedActor.save({ transaction: t });
            await sendUpdateActor(accountOrChannel, t);
            return updatedActor.Avatars;
        });
    });
}
export async function findAvailableLocalActorName(baseActorName, transaction) {
    let actor = await ActorModel.loadLocalByName(baseActorName, transaction);
    if (!actor)
        return baseActorName;
    for (let i = 1; i < 30; i++) {
        const name = `${baseActorName}-${i}`;
        actor = await ActorModel.loadLocalByName(name, transaction);
        if (!actor)
            return name;
    }
    throw new Error('Cannot find available actor local name (too much iterations).');
}
//# sourceMappingURL=local-actor.js.map