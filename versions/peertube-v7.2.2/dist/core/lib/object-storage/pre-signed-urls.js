import { CONFIG } from '../../initializers/config.js';
import { generateHLSObjectStorageKey, generateOriginalVideoObjectStorageKey, generateUserExportObjectStorageKey, generateWebVideoObjectStorageKey } from './keys.js';
import { buildKey, getClient } from './shared/index.js';
import { getObjectStoragePublicFileUrl } from './urls.js';
export async function generateWebVideoPresignedUrl(options) {
    const { file, downloadFilename } = options;
    const url = await generatePresignedUrl({
        bucket: CONFIG.OBJECT_STORAGE.WEB_VIDEOS.BUCKET_NAME,
        key: buildKey(generateWebVideoObjectStorageKey(file.filename), CONFIG.OBJECT_STORAGE.WEB_VIDEOS),
        downloadFilename
    });
    return getObjectStoragePublicFileUrl(url, CONFIG.OBJECT_STORAGE.WEB_VIDEOS);
}
export async function generateHLSFilePresignedUrl(options) {
    const { streamingPlaylist, file, downloadFilename } = options;
    const url = await generatePresignedUrl({
        bucket: CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS.BUCKET_NAME,
        key: buildKey(generateHLSObjectStorageKey(streamingPlaylist, file.filename), CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS),
        downloadFilename
    });
    return getObjectStoragePublicFileUrl(url, CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
}
export async function generateUserExportPresignedUrl(options) {
    const { userExport, downloadFilename } = options;
    const url = await generatePresignedUrl({
        bucket: CONFIG.OBJECT_STORAGE.USER_EXPORTS.BUCKET_NAME,
        key: buildKey(generateUserExportObjectStorageKey(userExport.filename), CONFIG.OBJECT_STORAGE.USER_EXPORTS),
        downloadFilename
    });
    return getObjectStoragePublicFileUrl(url, CONFIG.OBJECT_STORAGE.USER_EXPORTS);
}
export async function generateOriginalFilePresignedUrl(options) {
    const { videoSource, downloadFilename } = options;
    const url = await generatePresignedUrl({
        bucket: CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES.BUCKET_NAME,
        key: buildKey(generateOriginalVideoObjectStorageKey(videoSource.keptOriginalFilename), CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES),
        downloadFilename
    });
    return getObjectStoragePublicFileUrl(url, CONFIG.OBJECT_STORAGE.ORIGINAL_VIDEO_FILES);
}
async function generatePresignedUrl(options) {
    const { bucket, downloadFilename, key } = options;
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${encodeURI(downloadFilename)}"`
    });
    return getSignedUrl(await getClient(), command, { expiresIn: 3600 * 24 });
}
//# sourceMappingURL=pre-signed-urls.js.map