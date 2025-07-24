import { CONFIG } from '../../initializers/config.js';
import { ActorImageModel } from '../../models/actor/actor-image.js';
import { AbstractPermanentFileCache } from './shared/index.js';
export class AvatarPermanentFileCache extends AbstractPermanentFileCache {
    constructor() {
        super(CONFIG.STORAGE.ACTOR_IMAGES_DIR);
    }
    loadModel(filename) {
        return ActorImageModel.loadByFilename(filename);
    }
    getImageSize(image) {
        if (image.width && image.height) {
            return {
                height: image.height,
                width: image.width
            };
        }
        return undefined;
    }
}
//# sourceMappingURL=avatar-permanent-file-cache.js.map