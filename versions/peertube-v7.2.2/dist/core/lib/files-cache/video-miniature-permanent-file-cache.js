import { CONFIG } from '../../initializers/config.js';
import { THUMBNAILS_SIZE } from '../../initializers/constants.js';
import { ThumbnailModel } from '../../models/video/thumbnail.js';
import { ThumbnailType } from '@peertube/peertube-models';
import { AbstractPermanentFileCache } from './shared/index.js';
export class VideoMiniaturePermanentFileCache extends AbstractPermanentFileCache {
    constructor() {
        super(CONFIG.STORAGE.THUMBNAILS_DIR);
    }
    loadModel(filename) {
        return ThumbnailModel.loadByFilename(filename, ThumbnailType.MINIATURE);
    }
    getImageSize(image) {
        if (image.width && image.height) {
            return {
                height: image.height,
                width: image.width
            };
        }
        return THUMBNAILS_SIZE;
    }
}
//# sourceMappingURL=video-miniature-permanent-file-cache.js.map