import { removeFragmentedMP4Ext } from '@peertube/peertube-core-utils';
import { buildUUID } from '@peertube/peertube-node-utils';
import { CONFIG } from '../initializers/config.js';
import { DIRECTORIES, VIDEO_LIVE } from '../initializers/constants.js';
import { isStreamingPlaylist } from '../types/models/index.js';
import { join } from 'path';
import { isVideoInPrivateDirectory } from './video-privacy.js';
export function generateWebVideoFilename(resolution, extname) {
    return buildUUID() + '-' + resolution + extname;
}
export function generateHLSVideoFilename(resolution) {
    return `${buildUUID()}-${resolution}-fragmented.mp4`;
}
export function getLiveDirectory(video) {
    return getHLSDirectory(video);
}
export function getLiveReplayBaseDirectory(video) {
    return join(getLiveDirectory(video), VIDEO_LIVE.REPLAY_DIRECTORY);
}
export function getHLSDirectory(video) {
    if (isVideoInPrivateDirectory(video.privacy)) {
        return join(DIRECTORIES.HLS_STREAMING_PLAYLIST.PRIVATE, video.uuid);
    }
    return join(DIRECTORIES.HLS_STREAMING_PLAYLIST.PUBLIC, video.uuid);
}
export function getHLSRedundancyDirectory(video) {
    return join(DIRECTORIES.HLS_REDUNDANCY, video.uuid);
}
export function getHLSResolutionPlaylistFilename(videoFilename) {
    return removeFragmentedMP4Ext(videoFilename) + '.m3u8';
}
export function generateHLSMasterPlaylistFilename(isLive = false) {
    if (isLive)
        return 'master.m3u8';
    return buildUUID() + '-master.m3u8';
}
export function generateHlsSha256SegmentsFilename(isLive = false) {
    if (isLive)
        return 'segments-sha256.json';
    return buildUUID() + '-segments-sha256.json';
}
export function generateTorrentFileName(videoOrPlaylist, resolution) {
    const extension = '.torrent';
    const uuid = buildUUID();
    if (isStreamingPlaylist(videoOrPlaylist)) {
        return `${uuid}-${resolution}-${videoOrPlaylist.getStringType()}${extension}`;
    }
    return uuid + '-' + resolution + extension;
}
export function getFSTorrentFilePath(videoFile) {
    return join(CONFIG.STORAGE.TORRENTS_DIR, videoFile.torrentFilename);
}
export function getFSUserExportFilePath(userExport) {
    return join(CONFIG.STORAGE.TMP_PERSISTENT_DIR, userExport.filename);
}
export function getFSUserImportFilePath(userImport) {
    return join(CONFIG.STORAGE.TMP_PERSISTENT_DIR, userImport.filename);
}
//# sourceMappingURL=paths.js.map