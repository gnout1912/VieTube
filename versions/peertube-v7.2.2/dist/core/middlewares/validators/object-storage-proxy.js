import { CONFIG } from '../../initializers/config.js';
import { HttpStatusCode } from '@peertube/peertube-models';
const ensurePrivateObjectStorageProxyIsEnabled = [
    (req, res, next) => {
        if (CONFIG.OBJECT_STORAGE.PROXY.PROXIFY_PRIVATE_FILES !== true) {
            return res.fail({
                message: 'Private object storage proxy is not enabled',
                status: HttpStatusCode.BAD_REQUEST_400
            });
        }
        return next();
    }
];
export { ensurePrivateObjectStorageProxyIsEnabled };
//# sourceMappingURL=object-storage-proxy.js.map