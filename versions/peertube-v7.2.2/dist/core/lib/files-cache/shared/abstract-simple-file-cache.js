import { remove } from 'fs-extra/esm';
import { logger } from '../../../helpers/logger.js';
import memoizee from 'memoizee';
export class AbstractSimpleFileCache {
    init(max, maxAge) {
        this.getFilePath = memoizee(this.getFilePathImpl.bind(this), {
            maxAge,
            max,
            promise: true,
            dispose: (result) => {
                if (result && result.isOwned !== true) {
                    remove(result.path)
                        .then(() => logger.debug('%s removed from %s', result.path, this.constructor.name))
                        .catch(err => logger.error('Cannot remove %s from cache %s.', result.path, this.constructor.name, { err }));
                }
            }
        });
    }
}
//# sourceMappingURL=abstract-simple-file-cache.js.map