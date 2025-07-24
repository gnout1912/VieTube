import { pipelinePromise } from '../../helpers/core-utils.js';
import { isArray } from '../../helpers/custom-validators/misc.js';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import Bluebird from 'bluebird';
import { createReadStream, createWriteStream } from 'fs';
import { ensureDir } from 'fs-extra/esm';
import { dirname } from 'path';
import { getClient } from './shared/client.js';
import { lTags } from './shared/logger.js';
import { getInternalUrl } from './urls.js';
async function listKeysOfPrefix(prefix, bucketInfo, continuationToken) {
    const s3Client = await getClient();
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const commandPrefix = bucketInfo.PREFIX + prefix;
    const listCommand = new ListObjectsV2Command({
        Bucket: bucketInfo.BUCKET_NAME,
        Prefix: commandPrefix,
        ContinuationToken: continuationToken
    });
    const listedObjects = await s3Client.send(listCommand)
        .catch(err => {
        throw parseS3Error(err);
    });
    if (isArray(listedObjects.Contents) !== true)
        return [];
    let keys = listedObjects.Contents.map(c => c.Key);
    if (listedObjects.IsTruncated) {
        keys = keys.concat(await listKeysOfPrefix(prefix, bucketInfo, listedObjects.NextContinuationToken));
    }
    return keys;
}
async function storeObject(options) {
    const { inputPath, objectStorageKey, bucketInfo, isPrivate, contentType } = options;
    logger.debug('Uploading file %s to %s%s in bucket %s', inputPath, bucketInfo.PREFIX, objectStorageKey, bucketInfo.BUCKET_NAME, lTags());
    const fileStream = createReadStream(inputPath);
    return uploadToStorage({ objectStorageKey, content: fileStream, bucketInfo, isPrivate, contentType });
}
async function storeContent(options) {
    const { content, objectStorageKey, bucketInfo, isPrivate, contentType } = options;
    logger.debug('Uploading %s content to %s%s in bucket %s', content, bucketInfo.PREFIX, objectStorageKey, bucketInfo.BUCKET_NAME, lTags());
    return uploadToStorage({ objectStorageKey, content, bucketInfo, isPrivate, contentType });
}
async function storeStream(options) {
    const { stream, objectStorageKey, bucketInfo, isPrivate, contentType } = options;
    logger.debug('Streaming file to %s%s in bucket %s', bucketInfo.PREFIX, objectStorageKey, bucketInfo.BUCKET_NAME, lTags());
    return uploadToStorage({ objectStorageKey, content: stream, bucketInfo, isPrivate, contentType });
}
async function updateObjectACL(options) {
    const { objectStorageKey, bucketInfo, isPrivate } = options;
    const acl = getACL(isPrivate);
    if (!acl)
        return;
    const key = buildKey(objectStorageKey, bucketInfo);
    logger.debug('Updating ACL file %s in bucket %s', key, bucketInfo.BUCKET_NAME, lTags());
    const { PutObjectAclCommand } = await import('@aws-sdk/client-s3');
    const command = new PutObjectAclCommand({
        Bucket: bucketInfo.BUCKET_NAME,
        Key: key,
        ACL: acl
    });
    const client = await getClient();
    await client.send(command)
        .catch(err => {
        throw parseS3Error(err);
    });
}
async function updatePrefixACL(options) {
    const { prefix, bucketInfo, isPrivate } = options;
    const acl = getACL(isPrivate);
    if (!acl)
        return;
    const { PutObjectAclCommand } = await import('@aws-sdk/client-s3');
    logger.debug('Updating ACL of files in prefix %s in bucket %s', prefix, bucketInfo.BUCKET_NAME, lTags());
    return applyOnPrefix({
        prefix,
        bucketInfo,
        commandBuilder: obj => {
            logger.debug('Updating ACL of %s inside prefix %s in bucket %s', obj.Key, prefix, bucketInfo.BUCKET_NAME, lTags());
            return new PutObjectAclCommand({
                Bucket: bucketInfo.BUCKET_NAME,
                Key: obj.Key,
                ACL: acl
            });
        }
    });
}
function removeObject(objectStorageKey, bucketInfo) {
    const key = buildKey(objectStorageKey, bucketInfo);
    return removeObjectByFullKey(key, bucketInfo);
}
async function removeObjectByFullKey(fullKey, bucketInfo) {
    logger.debug('Removing file %s in bucket %s', fullKey, bucketInfo.BUCKET_NAME, lTags());
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
        Bucket: bucketInfo.BUCKET_NAME,
        Key: fullKey
    });
    const client = await getClient();
    return client.send(command)
        .catch(err => {
        throw parseS3Error(err);
    });
}
async function removePrefix(prefix, bucketInfo) {
    logger.debug('Removing prefix %s in bucket %s', prefix, bucketInfo.BUCKET_NAME, lTags());
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    return applyOnPrefix({
        prefix,
        bucketInfo,
        commandBuilder: obj => {
            logger.debug('Removing %s inside prefix %s in bucket %s', obj.Key, prefix, bucketInfo.BUCKET_NAME, lTags());
            return new DeleteObjectCommand({
                Bucket: bucketInfo.BUCKET_NAME,
                Key: obj.Key
            });
        }
    });
}
async function makeAvailable(options) {
    const { key, destination, bucketInfo } = options;
    await ensureDir(dirname(options.destination));
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
        Bucket: bucketInfo.BUCKET_NAME,
        Key: buildKey(key, bucketInfo)
    });
    const client = await getClient();
    const response = await client.send(command)
        .catch(err => {
        throw parseS3Error(err);
    });
    const file = createWriteStream(destination);
    await pipelinePromise(response.Body, file);
    file.close();
}
function buildKey(key, bucketInfo) {
    return bucketInfo.PREFIX + key;
}
async function createObjectReadStream(options) {
    const { key, bucketInfo, rangeHeader } = options;
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
        Bucket: bucketInfo.BUCKET_NAME,
        Key: buildKey(key, bucketInfo),
        Range: rangeHeader
    });
    const client = await getClient();
    const response = await client.send(command)
        .catch(err => {
        throw parseS3Error(err);
    });
    return {
        response,
        stream: response.Body
    };
}
async function getObjectStorageFileSize(options) {
    const { key, bucketInfo } = options;
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new HeadObjectCommand({
        Bucket: bucketInfo.BUCKET_NAME,
        Key: buildKey(key, bucketInfo)
    });
    const client = await getClient();
    const response = await client.send(command)
        .catch(err => {
        throw parseS3Error(err);
    });
    return response.ContentLength;
}
export { buildKey, createObjectReadStream, getObjectStorageFileSize, listKeysOfPrefix, makeAvailable, removeObject, removeObjectByFullKey, removePrefix, storeContent, storeObject, storeStream, updateObjectACL, updatePrefixACL };
async function uploadToStorage(options) {
    const { content, objectStorageKey, bucketInfo, isPrivate, contentType } = options;
    const input = {
        Body: content,
        Bucket: bucketInfo.BUCKET_NAME,
        Key: buildKey(objectStorageKey, bucketInfo),
        ContentType: contentType
    };
    const acl = getACL(isPrivate);
    if (acl)
        input.ACL = acl;
    const { Upload } = await import('@aws-sdk/lib-storage');
    const parallelUploads3 = new Upload({
        client: await getClient(),
        queueSize: 4,
        partSize: CONFIG.OBJECT_STORAGE.MAX_UPLOAD_PART,
        leavePartsOnError: true,
        params: input
    });
    try {
        const response = await parallelUploads3.done();
        if (!response.Bucket) {
            const message = `Error uploading ${objectStorageKey} to bucket ${bucketInfo.BUCKET_NAME}`;
            logger.error(message, Object.assign({ response }, lTags()));
            throw new Error(message);
        }
        logger.debug('Completed %s%s in bucket %s', bucketInfo.PREFIX, objectStorageKey, bucketInfo.BUCKET_NAME, Object.assign(Object.assign({}, lTags()), { responseMetadata: response.$metadata }));
        return getInternalUrl(bucketInfo, objectStorageKey);
    }
    catch (err) {
        throw parseS3Error(err);
    }
}
async function applyOnPrefix(options) {
    const { prefix, bucketInfo, commandBuilder, continuationToken } = options;
    const s3Client = await getClient();
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const commandPrefix = buildKey(prefix, bucketInfo);
    const listCommand = new ListObjectsV2Command({
        Bucket: bucketInfo.BUCKET_NAME,
        Prefix: commandPrefix,
        ContinuationToken: continuationToken
    });
    const listedObjects = await s3Client.send(listCommand)
        .catch(err => {
        throw parseS3Error(err);
    });
    if (isArray(listedObjects.Contents) !== true) {
        const message = `Cannot apply function on ${commandPrefix} prefix in bucket ${bucketInfo.BUCKET_NAME}: no files listed.`;
        logger.error(message, Object.assign({ response: listedObjects }, lTags()));
        throw new Error(message);
    }
    await Bluebird.map(listedObjects.Contents, object => {
        const command = commandBuilder(object);
        return s3Client.send(command)
            .catch(err => {
            throw parseS3Error(err);
        });
    }, { concurrency: 10 });
    if (listedObjects.IsTruncated) {
        await applyOnPrefix(Object.assign(Object.assign({}, options), { continuationToken: listedObjects.ContinuationToken }));
    }
}
function getACL(isPrivate) {
    return isPrivate
        ? CONFIG.OBJECT_STORAGE.UPLOAD_ACL.PRIVATE
        : CONFIG.OBJECT_STORAGE.UPLOAD_ACL.PUBLIC;
}
function parseS3Error(err) {
    var _a, _b;
    if ((_a = err.$response) === null || _a === void 0 ? void 0 : _a.body) {
        const body = err.$response.body;
        err.$response.body = {
            rawHeaders: body.rawHeaders,
            req: {
                _header: (_b = body.req) === null || _b === void 0 ? void 0 : _b._header
            }
        };
    }
    return err;
}
//# sourceMappingURL=object-storage-helpers.js.map