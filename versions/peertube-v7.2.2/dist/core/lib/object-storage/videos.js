import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { basename, extname, join } from 'path';
import { getHLSDirectory } from '../paths.js';
import { VideoPathManager } from '../video-path-manager.js';
import { generateCaptionObjectStorageKey, generateHLSObjectBaseStorageKey, generateHLSObjectStorageKey, generateOriginalVideoObjectStorageKey, generateWebVideoObjectStorageKey } from './keys.js';
import { createObjectReadStream, lTags, listKeysOfPrefix, makeAvailable, removeObject, removeObjectByFullKey, removePrefix, storeContent, storeObject, updateObjectACL, updatePrefixACL } from './shared/index.js';
import { MIMETYPES } from '../../initializers/constants.js';
export function listHLSFileKeysOf(playlist) {
    return listKeysOfPrefix(generateHLSObjectBaseStorageKey(playlist), CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
}
export function storeHLSFileFromFilename(playlist, filename) {
    return storeObject({
        inputPath: join(getHLSDirectory(playlist.Video), filename),
        objectStorageKey: generateHLSObjectStorageKey(playlist, filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS,
        isPrivate: playlist.Video.hasPrivateStaticPath(),
        contentType: getObjectStorageContentType(filename)
    });
}
export function storeHLSFileFromPath(playlist, path) {
    const filename = basename(path);
    return storeObject({
        inputPath: path,
        objectStorageKey: generateHLSObjectStorageKey(playlist, filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS,
        isPrivate: playlist.Video.hasPrivateStaticPath(),
        contentType: getObjectStorageContentType(filename)
    });
}
export function storeHLSFileFromContent(options) {
    const { playlist, pathOrFilename, content } = options;
    const filename = basename(pathOrFilename);
    return storeContent({
        content,
        objectStorageKey: generateHLSObjectStorageKey(playlist, filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS,
        isPrivate: playlist.Video.hasPrivateStaticPath(),
        contentType: getObjectStorageContentType(filename)
    });
}
export function storeWebVideoFile(video, file) {
    return storeObject({
        inputPath: VideoPathManager.Instance.getFSVideoFileOutputPath(video, file),
        objectStorageKey: generateWebVideoObjectStorageKey(file.filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.WEB_VIDEOS,
        isPrivate: video.hasPrivateStaticPath(),
        contentType: getObjectStorageContentType(file.filename)
    });
}
export function storeVideoCaption(inputPath, filename) {
    return storeObject({
        inputPath,
        objectStorageKey: generateCaptionObjectStorageKey(filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.CAPTIONS,
        isPrivate: false,
        contentType: getObjectStorageContentType(filename)
    });
}
export function storeOriginalVideoFile(inputPath, filename) {
    return storeObject({
        inputPath,
        objectStorageKey: generateOriginalVideoObjectStorageKey(filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES,
        isPrivate: true,
        contentType: getObjectStorageContentType(filename)
    });
}
export async function updateWebVideoFileACL(video, file) {
    await updateObjectACL({
        objectStorageKey: generateWebVideoObjectStorageKey(file.filename),
        bucketInfo: CONFIG.OBJECT_STORAGE.WEB_VIDEOS,
        isPrivate: video.hasPrivateStaticPath()
    });
}
export async function updateHLSFilesACL(playlist) {
    await updatePrefixACL({
        prefix: generateHLSObjectBaseStorageKey(playlist),
        bucketInfo: CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS,
        isPrivate: playlist.Video.hasPrivateStaticPath()
    });
}
export function removeHLSObjectStorage(playlist) {
    return removePrefix(generateHLSObjectBaseStorageKey(playlist), CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
}
export function removeHLSFileObjectStorageByFilename(playlist, filename) {
    return removeObject(generateHLSObjectStorageKey(playlist, filename), CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
}
export function removeHLSFileObjectStorageByPath(playlist, path) {
    return removeObject(generateHLSObjectStorageKey(playlist, basename(path)), CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
}
export function removeHLSFileObjectStorageByFullKey(key) {
    return removeObjectByFullKey(key, CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
}
export function removeWebVideoObjectStorage(videoFile) {
    return removeObject(generateWebVideoObjectStorageKey(videoFile.filename), CONFIG.OBJECT_STORAGE.WEB_VIDEOS);
}
export function removeOriginalFileObjectStorage(videoSource) {
    return removeObject(generateOriginalVideoObjectStorageKey(videoSource.keptOriginalFilename), CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES);
}
export function removeCaptionObjectStorage(videoCaption) {
    return removeObject(generateCaptionObjectStorageKey(videoCaption.filename), CONFIG.OBJECT_STORAGE.CAPTIONS);
}
export async function makeHLSFileAvailable(playlist, filename, destination) {
    const key = generateHLSObjectStorageKey(playlist, filename);
    logger.info('Fetching HLS file %s from object storage to %s.', key, destination, lTags());
    await makeAvailable({
        key,
        destination,
        bucketInfo: CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS
    });
    logger.debug('Fetched HLS file %s from object storage to %s.', key, destination, lTags());
    return destination;
}
export async function makeWebVideoFileAvailable(filename, destination) {
    const key = generateWebVideoObjectStorageKey(filename);
    logger.info('Fetching Web Video file %s from object storage to %s.', key, destination, lTags());
    await makeAvailable({
        key,
        destination,
        bucketInfo: CONFIG.OBJECT_STORAGE.WEB_VIDEOS
    });
    return destination;
}
export async function makeOriginalFileAvailable(keptOriginalFilename, destination) {
    const key = generateOriginalVideoObjectStorageKey(keptOriginalFilename);
    logger.info('Fetching Original Video file %s from object storage to %s.', key, destination, lTags());
    await makeAvailable({
        key,
        destination,
        bucketInfo: CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES
    });
    return destination;
}
export async function makeCaptionFileAvailable(filename, destination) {
    const key = generateCaptionObjectStorageKey(filename);
    logger.info('Fetching Caption file %s from object storage to %s.', key, destination, lTags());
    await makeAvailable({
        key,
        destination,
        bucketInfo: CONFIG.OBJECT_STORAGE.CAPTIONS
    });
    return destination;
}
export function getWebVideoFileReadStream(options) {
    const { filename, rangeHeader } = options;
    const key = generateWebVideoObjectStorageKey(filename);
    return createObjectReadStream({
        key,
        bucketInfo: CONFIG.OBJECT_STORAGE.WEB_VIDEOS,
        rangeHeader
    });
}
export function getHLSFileReadStream(options) {
    const { playlist, filename, rangeHeader } = options;
    const key = generateHLSObjectStorageKey(playlist, filename);
    return createObjectReadStream({
        key,
        bucketInfo: CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS,
        rangeHeader
    });
}
export function getOriginalFileReadStream(options) {
    const { keptOriginalFilename, rangeHeader } = options;
    const key = generateOriginalVideoObjectStorageKey(keptOriginalFilename);
    return createObjectReadStream({
        key,
        bucketInfo: CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES,
        rangeHeader
    });
}
export function getCaptionReadStream(options) {
    const { filename, rangeHeader } = options;
    const key = generateCaptionObjectStorageKey(filename);
    return createObjectReadStream({
        key,
        bucketInfo: CONFIG.OBJECT_STORAGE.CAPTIONS,
        rangeHeader
    });
}
function getObjectStorageContentType(filename) {
    if (filename.endsWith('.m3u8')) {
        return 'application/x-mpegURL; charset=utf-8';
    }
    if (filename.endsWith('.json')) {
        return 'application/json; charset=utf-8';
    }
    if (filename.endsWith('.vtt')) {
        return 'text/vtt; charset=utf-8';
    }
    const ext = extname(filename).toLowerCase();
    return MIMETYPES.VIDEO.EXT_MIMETYPE[ext] || MIMETYPES.AUDIO.EXT_MIMETYPE[ext];
}
//# sourceMappingURL=videos.js.map