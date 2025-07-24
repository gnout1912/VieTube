import { writeJson } from 'fs-extra/esm';
import { rename } from 'fs/promises';
import PQueue from 'p-queue';
import { basename } from 'path';
import { mapToJSON } from '../../helpers/core-utils.js';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { buildSha256Segment } from '../hls.js';
import { storeHLSFileFromPath } from '../object-storage/index.js';
const lTags = loggerTagsFactory('live');
class LiveSegmentShaStore {
    constructor(options) {
        this.segmentsSha256 = new Map();
        this.writeQueue = new PQueue({ concurrency: 1 });
        this.videoUUID = options.videoUUID;
        this.sha256Path = options.sha256Path;
        this.sha256PathTMP = options.sha256Path + '.tmp';
        this.streamingPlaylist = options.streamingPlaylist;
        this.sendToObjectStorage = options.sendToObjectStorage;
    }
    async addSegmentSha(segmentPath) {
        logger.debug('Adding live sha segment %s.', segmentPath, lTags(this.videoUUID));
        const shaResult = await buildSha256Segment(segmentPath);
        const segmentName = basename(segmentPath);
        this.segmentsSha256.set(segmentName, shaResult);
        try {
            await this.writeToDisk();
        }
        catch (err) {
            logger.error('Cannot write sha segments to disk.', { err });
        }
    }
    async removeSegmentSha(segmentPath) {
        const segmentName = basename(segmentPath);
        logger.debug('Removing live sha segment %s.', segmentPath, lTags(this.videoUUID));
        if (!this.segmentsSha256.has(segmentName)) {
            logger.warn('Unknown segment in live segment hash store for video %s and segment %s.', this.videoUUID, segmentPath, lTags(this.videoUUID));
            return;
        }
        this.segmentsSha256.delete(segmentName);
        await this.writeToDisk();
    }
    writeToDisk() {
        return this.writeQueue.add(async () => {
            logger.debug(`Writing segment sha JSON ${this.sha256Path} of ${this.videoUUID} on disk.`, lTags(this.videoUUID));
            await writeJson(this.sha256PathTMP, mapToJSON(this.segmentsSha256), { flush: true });
            await rename(this.sha256PathTMP, this.sha256Path);
            if (this.sendToObjectStorage) {
                const url = await storeHLSFileFromPath(this.streamingPlaylist, this.sha256Path);
                if (this.streamingPlaylist.segmentsSha256Url !== url) {
                    this.streamingPlaylist.segmentsSha256Url = url;
                    await this.streamingPlaylist.save();
                }
            }
        });
    }
}
export { LiveSegmentShaStore };
//# sourceMappingURL=live-segment-sha-store.js.map