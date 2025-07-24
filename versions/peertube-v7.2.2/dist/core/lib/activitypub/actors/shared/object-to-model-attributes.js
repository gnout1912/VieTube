import { ActorImageType } from '@peertube/peertube-models';
import { isActivityPubUrlValid } from '../../../../helpers/custom-validators/activitypub/misc.js';
import { MIMETYPES } from '../../../../initializers/constants.js';
import { buildUUID, getLowercaseExtension } from '@peertube/peertube-node-utils';
function getActorAttributesFromObject(actorObject, followersCount, followingCount) {
    var _a;
    return {
        type: actorObject.type,
        preferredUsername: actorObject.preferredUsername,
        url: actorObject.id,
        publicKey: actorObject.publicKey.publicKeyPem,
        privateKey: null,
        followersCount,
        followingCount,
        inboxUrl: actorObject.inbox,
        outboxUrl: actorObject.outbox,
        followersUrl: actorObject.followers,
        followingUrl: actorObject.following,
        sharedInboxUrl: ((_a = actorObject.endpoints) === null || _a === void 0 ? void 0 : _a.sharedInbox)
            ? actorObject.endpoints.sharedInbox
            : null
    };
}
function getImagesInfoFromObject(actorObject, type) {
    const iconsOrImages = type === ActorImageType.AVATAR
        ? actorObject.icon
        : actorObject.image;
    return normalizeIconOrImage(iconsOrImages)
        .map(iconOrImage => {
        const mimetypes = MIMETYPES.IMAGE;
        if (iconOrImage.type !== 'Image' || !isActivityPubUrlValid(iconOrImage.url))
            return undefined;
        let extension;
        if (iconOrImage.mediaType) {
            extension = mimetypes.MIMETYPE_EXT[iconOrImage.mediaType];
        }
        else {
            const tmp = getLowercaseExtension(iconOrImage.url);
            if (mimetypes.EXT_MIMETYPE[tmp] !== undefined)
                extension = tmp;
        }
        if (!extension)
            return undefined;
        return {
            name: buildUUID() + extension,
            fileUrl: iconOrImage.url,
            height: iconOrImage.height,
            width: iconOrImage.width,
            type
        };
    })
        .filter(i => !!i);
}
function getActorDisplayNameFromObject(actorObject) {
    return actorObject.name || actorObject.preferredUsername;
}
export { getActorAttributesFromObject, getImagesInfoFromObject, getActorDisplayNameFromObject };
function normalizeIconOrImage(icon) {
    if (Array.isArray(icon))
        return icon;
    if (icon)
        return [icon];
    return [];
}
//# sourceMappingURL=object-to-model-attributes.js.map