import { ActorImageType } from '@peertube/peertube-models';
import { logger } from '../../../helpers/logger.js';
import { ActorImageModel } from '../../../models/actor/actor-image.js';
async function updateActorImages(actor, type, imagesInfo, t) {
    var _a;
    const getAvatarsOrBanners = () => {
        const result = type === ActorImageType.AVATAR
            ? actor.Avatars
            : actor.Banners;
        return result || [];
    };
    if (imagesInfo.length === 0) {
        await deleteActorImages(actor, type, t);
    }
    for (const oldImageModel of getAvatarsOrBanners()) {
        if (oldImageModel.width)
            continue;
        await safeDeleteActorImage(actor, oldImageModel, type, t);
    }
    for (const imageInfo of imagesInfo) {
        const oldImageModel = getAvatarsOrBanners().find(i => imageInfo.width && i.width === imageInfo.width);
        if (oldImageModel) {
            if (imageInfo.fileUrl && oldImageModel.fileUrl === imageInfo.fileUrl) {
                continue;
            }
            await safeDeleteActorImage(actor, oldImageModel, type, t);
        }
        const imageModel = await ActorImageModel.create({
            filename: imageInfo.name,
            onDisk: (_a = imageInfo.onDisk) !== null && _a !== void 0 ? _a : false,
            fileUrl: imageInfo.fileUrl,
            height: imageInfo.height,
            width: imageInfo.width,
            type,
            actorId: actor.id
        }, { transaction: t });
        addActorImage(actor, type, imageModel);
    }
    return actor;
}
async function deleteActorImages(actor, type, t) {
    try {
        const association = buildAssociationName(type);
        for (const image of actor[association]) {
            await image.destroy({ transaction: t });
        }
        actor[association] = [];
    }
    catch (err) {
        logger.error('Cannot remove old image of actor %s.', actor.url, { err });
    }
    return actor;
}
async function safeDeleteActorImage(actor, toDelete, type, t) {
    try {
        await toDelete.destroy({ transaction: t });
        const association = buildAssociationName(type);
        actor[association] = actor[association].filter(image => image.id !== toDelete.id);
    }
    catch (err) {
        logger.error('Cannot remove old actor image of actor %s.', actor.url, { err });
    }
}
export { updateActorImages, deleteActorImages };
function addActorImage(actor, type, imageModel) {
    const association = buildAssociationName(type);
    if (!actor[association])
        actor[association] = [];
    actor[association].push(imageModel);
}
function buildAssociationName(type) {
    return type === ActorImageType.AVATAR
        ? 'Avatars'
        : 'Banners';
}
//# sourceMappingURL=image.js.map