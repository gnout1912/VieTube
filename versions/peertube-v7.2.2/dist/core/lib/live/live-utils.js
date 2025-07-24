import { wait } from '@peertube/peertube-core-utils';
import { FileStorage, LiveVideoLatencyMode, VideoState } from '@peertube/peertube-models';
import { logger } from '../../helpers/logger.js';
import { VIDEO_LIVE } from '../../initializers/constants.js';
import { pathExists, remove } from 'fs-extra/esm';
import { readdir, rmdir } from 'fs/promises';
import { basename, join } from 'path';
import { listHLSFileKeysOf, removeHLSFileObjectStorageByFullKey, removeHLSObjectStorage } from '../object-storage/index.js';
import { getLiveDirectory, getLiveReplayBaseDirectory } from '../paths.js';
export function buildConcatenatedName(segmentOrPlaylistPath) {
    const num = basename(segmentOrPlaylistPath).match(/^(\d+)(-|\.)/);
    return 'concat-' + num[1] + '.ts';
}
export async function cleanupAndDestroyPermanentLive(video, streamingPlaylist) {
    await cleanupTMPLiveFiles(video, streamingPlaylist);
    if (video.state === VideoState.WAITING_FOR_LIVE) {
        try {
            await rmdir(getLiveReplayBaseDirectory(video));
            await wait(100);
            await rmdir(getLiveDirectory(video));
        }
        catch (err) {
            logger.debug('Cannot cleanup permanent local live files', { err });
        }
    }
    await streamingPlaylist.destroy();
}
export async function cleanupUnsavedNormalLive(video, streamingPlaylist) {
    const hlsDirectory = getLiveDirectory(video);
    if (streamingPlaylist.storage === FileStorage.OBJECT_STORAGE) {
        await removeHLSObjectStorage(streamingPlaylist.withVideo(video));
    }
    await remove(hlsDirectory);
    await streamingPlaylist.destroy();
}
export async function cleanupTMPLiveFiles(video, streamingPlaylist) {
    await cleanupTMPLiveFilesFromObjectStorage(streamingPlaylist.withVideo(video));
    await cleanupTMPLiveFilesFromFilesystem(video);
}
export function getLiveSegmentTime(latencyMode) {
    if (latencyMode === LiveVideoLatencyMode.SMALL_LATENCY) {
        return VIDEO_LIVE.SEGMENT_TIME_SECONDS.SMALL_LATENCY;
    }
    return VIDEO_LIVE.SEGMENT_TIME_SECONDS.DEFAULT_LATENCY;
}
function isTMPLiveFile(name) {
    return name.endsWith('.ts') ||
        name.endsWith('.m3u8') ||
        name.endsWith('.json') ||
        name.endsWith('.mpd') ||
        name.endsWith('.m4s') ||
        name.endsWith('.tmp');
}
async function cleanupTMPLiveFilesFromFilesystem(video) {
    const hlsDirectory = getLiveDirectory(video);
    if (!await pathExists(hlsDirectory))
        return;
    logger.info('Cleanup TMP live files from filesystem of %s.', hlsDirectory);
    const files = await readdir(hlsDirectory);
    for (const filename of files) {
        if (isTMPLiveFile(filename)) {
            const p = join(hlsDirectory, filename);
            remove(p)
                .catch(err => logger.error('Cannot remove %s.', p, { err }));
        }
    }
}
async function cleanupTMPLiveFilesFromObjectStorage(streamingPlaylist) {
    if (streamingPlaylist.storage !== FileStorage.OBJECT_STORAGE)
        return;
    logger.info('Cleanup TMP live files from object storage for %s.', streamingPlaylist.Video.uuid);
    const keys = await listHLSFileKeysOf(streamingPlaylist);
    for (const key of keys) {
        if (isTMPLiveFile(key)) {
            await removeHLSFileObjectStorageByFullKey(key);
        }
    }
}
//# sourceMappingURL=live-utils.js.map