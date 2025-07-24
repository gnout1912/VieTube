import { CONFIG } from '../../initializers/config.js';
import { generateUserExportObjectStorageKey } from './keys.js';
import { getObjectStorageFileSize, removeObject, storeStream } from './shared/index.js';
export function storeUserExportFile(stream, userExport) {
    return storeStream({
        stream,
        objectStorageKey: generateUserExportObjectStorageKey(userExport.filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.USER_EXPORTS,
        isPrivate: true,
        contentType: 'application/zip'
    });
}
export function removeUserExportObjectStorage(userExport) {
    return removeObject(generateUserExportObjectStorageKey(userExport.filename), CONFIG.OBJECT_STORAGE.USER_EXPORTS);
}
export function getUserExportFileObjectStorageSize(userExport) {
    return getObjectStorageFileSize({
        key: generateUserExportObjectStorageKey(userExport.filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.USER_EXPORTS
    });
}
//# sourceMappingURL=user-export.js.map