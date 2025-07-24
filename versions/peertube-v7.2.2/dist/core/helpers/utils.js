import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { sha256 } from '@peertube/peertube-node-utils';
import { CONFIG } from '../initializers/config.js';
import { randomBytesPromise } from './core-utils.js';
import { logger } from './logger.js';
function deleteFileAndCatch(path) {
    remove(path)
        .catch(err => logger.error('Cannot delete the file %s asynchronously.', path, { err }));
}
async function generateRandomString(size) {
    const raw = await randomBytesPromise(size);
    return raw.toString('hex');
}
function getFormattedObjects(objects, objectsTotal, formattedArg) {
    const formattedObjects = objects.map(o => o.toFormattedJSON(formattedArg));
    return {
        total: objectsTotal,
        data: formattedObjects
    };
}
function generateVideoImportTmpPath(target, extension = '.mp4') {
    const id = typeof target === 'string'
        ? target
        : target.infoHash;
    const hash = sha256(id);
    return join(CONFIG.STORAGE.TMP_DIR, `${hash}-import${extension}`);
}
function getSecureTorrentName(originalName) {
    return sha256(originalName) + '.torrent';
}
function getUUIDFromFilename(filename) {
    const regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
    const result = filename.match(regex);
    if (!result || Array.isArray(result) === false)
        return null;
    return result[0];
}
export { deleteFileAndCatch, generateRandomString, getFormattedObjects, getSecureTorrentName, generateVideoImportTmpPath, getUUIDFromFilename };
//# sourceMappingURL=utils.js.map