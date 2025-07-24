import { __decorate, __metadata } from "tslib";
import { LRUCache } from 'lru-cache';
import { logger } from '../../../helpers/logger.js';
import { CachePromise } from '../../../helpers/promise-cache.js';
import { LRU_CACHE, STATIC_MAX_AGE } from '../../../initializers/constants.js';
import { downloadImageFromWorker } from '../../worker/parent-process.js';
import { HttpStatusCode } from '@peertube/peertube-models';
export class AbstractPermanentFileCache {
    constructor(directory) {
        this.directory = directory;
        this.filenameToPathUnsafeCache = new LRUCache({
            max: LRU_CACHE.FILENAME_TO_PATH_PERMANENT_FILE_CACHE.MAX_SIZE
        });
    }
    async lazyServe(options) {
        const { filename, res, next } = options;
        if (this.filenameToPathUnsafeCache.has(filename)) {
            return res.sendFile(this.filenameToPathUnsafeCache.get(filename), { maxAge: STATIC_MAX_AGE.SERVER });
        }
        const image = await this.lazyLoadIfNeeded(filename);
        if (!image)
            return res.status(HttpStatusCode.NOT_FOUND_404).end();
        const path = image.getPath();
        this.filenameToPathUnsafeCache.set(filename, path);
        return res.sendFile(path, { maxAge: STATIC_MAX_AGE.LAZY_SERVER }, (err) => {
            if (!err)
                return;
            this.onServeError({ err, image, next, filename });
        });
    }
    async lazyLoadIfNeeded(filename) {
        const image = await this.loadModel(filename);
        if (!image)
            return undefined;
        if (image.onDisk === false) {
            if (!image.fileUrl)
                return undefined;
            try {
                await this.downloadRemoteFile(image);
            }
            catch (err) {
                logger.warn('Cannot process remote image %s.', image.fileUrl, { err });
                return undefined;
            }
        }
        return image;
    }
    async downloadRemoteFile(image) {
        logger.info('Download remote image %s lazily.', image.fileUrl);
        const destination = await this.downloadImage({
            filename: image.filename,
            fileUrl: image.fileUrl,
            size: this.getImageSize(image)
        });
        image.onDisk = true;
        image.save()
            .catch(err => logger.error('Cannot save new image disk state.', { err }));
        return destination;
    }
    onServeError(options) {
        const { err, image, filename, next } = options;
        if (err.status === HttpStatusCode.NOT_FOUND_404 && !image.isOwned()) {
            logger.error('Cannot lazy serve image %s.', filename, { err });
            this.filenameToPathUnsafeCache.delete(filename);
            image.onDisk = false;
            image.save()
                .catch(err => logger.error('Cannot save new image disk state.', { err }));
        }
        return next(err);
    }
    downloadImage(options) {
        const downloaderOptions = {
            url: options.fileUrl,
            destDir: this.directory,
            destName: options.filename,
            size: options.size
        };
        return downloadImageFromWorker(downloaderOptions);
    }
}
__decorate([
    CachePromise({
        keyBuilder: filename => filename
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AbstractPermanentFileCache.prototype, "lazyLoadIfNeeded", null);
//# sourceMappingURL=abstract-permanent-file-cache.js.map