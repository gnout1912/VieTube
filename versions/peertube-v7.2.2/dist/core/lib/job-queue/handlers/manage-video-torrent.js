import { extractVideo } from '../../../helpers/video.js';
import { createTorrentAndSetInfoHash, updateTorrentMetadata } from '../../../helpers/webtorrent.js';
import { VideoPathManager } from '../../video-path-manager.js';
import { VideoModel } from '../../../models/video/video.js';
import { VideoFileModel } from '../../../models/video/video-file.js';
import { VideoStreamingPlaylistModel } from '../../../models/video/video-streaming-playlist.js';
import { logger } from '../../../helpers/logger.js';
async function processManageVideoTorrent(job) {
    const payload = job.data;
    logger.info('Processing torrent in job %s.', job.id);
    if (payload.action === 'create')
        return doCreateAction(payload);
    if (payload.action === 'update-metadata')
        return doUpdateMetadataAction(payload);
}
export { processManageVideoTorrent };
async function doCreateAction(payload) {
    const [video, file] = await Promise.all([
        loadVideoOrLog(payload.videoId),
        loadFileOrLog(payload.videoFileId)
    ]);
    if (!video || !file)
        return;
    const fileMutexReleaser = await VideoPathManager.Instance.lockFiles(video.uuid);
    try {
        await video.reload();
        await file.reload();
        await createTorrentAndSetInfoHash(video, file);
        const refreshedFile = await VideoFileModel.loadWithVideo(file.id);
        if (!refreshedFile)
            return file.removeTorrent();
        refreshedFile.infoHash = file.infoHash;
        refreshedFile.torrentFilename = file.torrentFilename;
        await refreshedFile.save();
    }
    finally {
        fileMutexReleaser();
    }
}
async function doUpdateMetadataAction(payload) {
    const [video, streamingPlaylist, file] = await Promise.all([
        loadVideoOrLog(payload.videoId),
        loadStreamingPlaylistOrLog(payload.streamingPlaylistId),
        loadFileOrLog(payload.videoFileId)
    ]);
    if ((!video && !streamingPlaylist) || !file)
        return;
    const extractedVideo = extractVideo(video || streamingPlaylist);
    const fileMutexReleaser = await VideoPathManager.Instance.lockFiles(extractedVideo.uuid);
    try {
        await updateTorrentMetadata(video || streamingPlaylist, file);
        await file.save();
    }
    finally {
        fileMutexReleaser();
    }
}
async function loadVideoOrLog(videoId) {
    if (!videoId)
        return undefined;
    const video = await VideoModel.load(videoId);
    if (!video) {
        logger.debug('Do not process torrent for video %d: does not exist anymore.', videoId);
    }
    return video;
}
async function loadStreamingPlaylistOrLog(streamingPlaylistId) {
    if (!streamingPlaylistId)
        return undefined;
    const streamingPlaylist = await VideoStreamingPlaylistModel.loadWithVideo(streamingPlaylistId);
    if (!streamingPlaylist) {
        logger.debug('Do not process torrent for streaming playlist %d: does not exist anymore.', streamingPlaylistId);
    }
    return streamingPlaylist;
}
async function loadFileOrLog(videoFileId) {
    if (!videoFileId)
        return undefined;
    const file = await VideoFileModel.load(videoFileId);
    if (!file) {
        logger.debug('Do not process torrent for file %d: does not exist anymore.', videoFileId);
    }
    return file;
}
//# sourceMappingURL=manage-video-torrent.js.map