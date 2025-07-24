import { buildLogger } from '../helpers/logger.js';
import { getResumableUploadPath } from '../helpers/upload.js';
import { CONFIG } from '../initializers/config.js';
import { Uploadx } from '@uploadx/core';
import { extname } from 'path';
import { authenticate } from '../middlewares/auth.js';
import { resumableInitValidator } from '../middlewares/validators/resumable-upload.js';
const logger = buildLogger({ labelSuffix: 'uploadx' });
export const uploadx = new Uploadx({
    directory: getResumableUploadPath(),
    expiration: { maxAge: undefined, rolling: true },
    maxMetadataSize: '10MB',
    logger: {
        logLevel: CONFIG.LOG.LEVEL,
        debug: logger.debug.bind(logger),
        info: logger.info.bind(logger),
        warn: logger.warn.bind(logger),
        error: logger.error.bind(logger)
    },
    userIdentifier: (_, res) => {
        if (!res.locals.oauth)
            return undefined;
        return res.locals.oauth.token.user.id + '';
    },
    filename: file => `${file.userId}-${file.id}${extname(file.metadata.filename)}`
});
export function safeUploadXCleanup(file) {
    uploadx.storage.delete(file)
        .catch(err => logger.error('Cannot delete the file %s', file.name, { err }));
}
export function buildUploadXFile(reqBody) {
    return Object.assign(Object.assign({}, reqBody), { path: getResumableUploadPath(reqBody.name), filename: reqBody.metadata.filename, originalname: reqBody.originalName });
}
export function setupUploadResumableRoutes(options) {
    const { router, routePath, uploadedMiddlewares = [], uploadedController, uploadInitBeforeMiddlewares = [], uploadInitAfterMiddlewares = [], uploadDeleteMiddlewares = [] } = options;
    router.post(routePath, authenticate, ...uploadInitBeforeMiddlewares, resumableInitValidator, ...uploadInitAfterMiddlewares, (req, res) => uploadx.upload(req, res));
    router.delete(routePath, authenticate, ...uploadDeleteMiddlewares, (req, res) => uploadx.upload(req, res));
    router.put(routePath, authenticate, uploadx.upload, ...uploadedMiddlewares, uploadedController);
}
//# sourceMappingURL=uploadx.js.map