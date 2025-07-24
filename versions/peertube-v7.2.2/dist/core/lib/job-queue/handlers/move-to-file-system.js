import { FileStorage, isMoveCaptionPayload, isMoveVideoStoragePayload } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { updateTorrentMetadata } from '../../../helpers/webtorrent.js';
import { P2P_MEDIA_LOADER_PEER_VERSION } from '../../../initializers/constants.js';
import { makeCaptionFileAvailable, makeHLSFileAvailable, makeOriginalFileAvailable, makeWebVideoFileAvailable, removeCaptionObjectStorage, removeHLSFileObjectStorageByFilename, removeHLSObjectStorage, removeOriginalFileObjectStorage, removeWebVideoObjectStorage } from '../../object-storage/index.js';
import { getHLSDirectory, getHLSResolutionPlaylistFilename } from '../../paths.js';
import { updateHLSMasterOnCaptionChange, upsertCaptionPlaylistOnFS } from '../../video-captions.js';
import { VideoPathManager } from '../../video-path-manager.js';
import { moveToFailedMoveToFileSystemState, moveToNextState } from '../../video-state.js';
import { join } from 'path';
import { moveCaptionToStorageJob } from './shared/move-caption.js';
import { moveVideoToStorageJob, onMoveVideoToStorageFailure } from './shared/move-video.js';
const lTagsBase = loggerTagsFactory('move-file-system');
export async function processMoveToFileSystem(job) {
    const payload = job.data;
    if (isMoveVideoStoragePayload(payload)) {
        logger.info('Moving video %s to file system in job %s.', payload.videoUUID, job.id);
        await moveVideoToStorageJob({
            jobId: job.id,
            videoUUID: payload.videoUUID,
            loggerTags: lTagsBase().tags,
            moveWebVideoFiles,
            moveHLSFiles,
            moveVideoSourceFile,
            moveCaptionFiles,
            doAfterLastMove: video => doAfterLastMove({ video, previousVideoState: payload.previousVideoState, isNewVideo: payload.isNewVideo })
        });
    }
    else if (isMoveCaptionPayload(payload)) {
        logger.info(`Moving video caption ${payload.captionId} to file system in job ${job.id}.`);
        await moveCaptionToStorageJob({
            jobId: job.id,
            captionId: payload.captionId,
            loggerTags: lTagsBase().tags,
            moveCaptionFiles
        });
    }
    else {
        throw new Error('Unknown payload type');
    }
}
export async function onMoveToFileSystemFailure(job, err) {
    const payload = job.data;
    if (!isMoveVideoStoragePayload(payload))
        return;
    await onMoveVideoToStorageFailure({
        videoUUID: payload.videoUUID,
        err,
        lTags: lTagsBase(),
        moveToFailedState: moveToFailedMoveToFileSystemState
    });
}
async function moveVideoSourceFile(source) {
    if (source.storage === FileStorage.FILE_SYSTEM)
        return;
    await makeOriginalFileAvailable(source.keptOriginalFilename, VideoPathManager.Instance.getFSOriginalVideoFilePath(source.keptOriginalFilename));
    const oldFileUrl = source.fileUrl;
    source.fileUrl = null;
    source.storage = FileStorage.FILE_SYSTEM;
    await source.save();
    logger.debug('Removing original video file %s because it\'s now on file system', oldFileUrl, lTagsBase());
    await removeOriginalFileObjectStorage(source);
}
async function moveWebVideoFiles(video) {
    for (const file of video.VideoFiles) {
        if (file.storage === FileStorage.FILE_SYSTEM)
            continue;
        await makeWebVideoFileAvailable(file.filename, VideoPathManager.Instance.getFSVideoFileOutputPath(video, file));
        await onVideoFileMoved({
            videoOrPlaylist: video,
            file,
            objetStorageRemover: () => removeWebVideoObjectStorage(file)
        });
    }
}
async function moveHLSFiles(video) {
    for (const playlist of video.VideoStreamingPlaylists) {
        const playlistWithVideo = playlist.withVideo(video);
        for (const file of playlist.VideoFiles) {
            if (file.storage === FileStorage.FILE_SYSTEM)
                continue;
            const playlistFilename = getHLSResolutionPlaylistFilename(file.filename);
            await makeHLSFileAvailable(playlistWithVideo, playlistFilename, join(getHLSDirectory(video), playlistFilename));
            await makeHLSFileAvailable(playlistWithVideo, file.filename, join(getHLSDirectory(video), file.filename));
            await onVideoFileMoved({
                videoOrPlaylist: playlistWithVideo,
                file,
                objetStorageRemover: async () => {
                    await removeHLSFileObjectStorageByFilename(playlistWithVideo, playlistFilename);
                    await removeHLSFileObjectStorageByFilename(playlistWithVideo, file.filename);
                }
            });
        }
    }
}
async function onVideoFileMoved(options) {
    const { videoOrPlaylist, file, objetStorageRemover } = options;
    const oldFileUrl = file.fileUrl;
    file.fileUrl = null;
    file.storage = FileStorage.FILE_SYSTEM;
    await updateTorrentMetadata(videoOrPlaylist, file);
    await file.save();
    logger.debug('Removing web video file %s because it\'s now on file system', oldFileUrl, lTagsBase());
    await objetStorageRemover();
}
async function moveCaptionFiles(captions, hls) {
    let hlsUpdated = false;
    for (const caption of captions) {
        if (caption.storage === FileStorage.OBJECT_STORAGE) {
            const oldFileUrl = caption.fileUrl;
            await makeCaptionFileAvailable(caption.filename, caption.getFSFilePath());
            caption.fileUrl = null;
            caption.storage = FileStorage.FILE_SYSTEM;
            await caption.save();
            logger.debug('Removing caption file %s because it\'s now on file system', oldFileUrl, lTagsBase());
            await removeCaptionObjectStorage(caption);
        }
        if (hls && (!caption.m3u8Filename || caption.m3u8Url)) {
            hlsUpdated = true;
            const oldM3U8Url = caption.m3u8Url;
            const oldM3U8Filename = caption.m3u8Filename;
            caption.m3u8Filename = await upsertCaptionPlaylistOnFS(caption, hls.Video);
            caption.m3u8Url = null;
            await caption.save();
            if (oldM3U8Url) {
                logger.debug(`Removing video caption playlist file ${oldM3U8Url} because it's now on file system`, lTagsBase());
                await removeHLSFileObjectStorageByFilename(hls, oldM3U8Filename);
            }
        }
    }
    if (hlsUpdated) {
        await updateHLSMasterOnCaptionChange(hls.Video, hls);
    }
}
async function doAfterLastMove(options) {
    const { video, previousVideoState, isNewVideo } = options;
    for (const playlist of video.VideoStreamingPlaylists) {
        if (playlist.storage === FileStorage.FILE_SYSTEM)
            continue;
        const playlistWithVideo = playlist.withVideo(video);
        for (const filename of [playlist.playlistFilename, playlist.segmentsSha256Filename]) {
            await makeHLSFileAvailable(playlistWithVideo, filename, join(getHLSDirectory(video), filename));
        }
        playlist.playlistUrl = null;
        playlist.segmentsSha256Url = null;
        playlist.storage = FileStorage.FILE_SYSTEM;
        playlist.assignP2PMediaLoaderInfoHashes(video, playlist.VideoFiles);
        playlist.p2pMediaLoaderPeerVersion = P2P_MEDIA_LOADER_PEER_VERSION;
        await playlist.save();
        await removeHLSObjectStorage(playlistWithVideo);
    }
    await moveToNextState({ video, previousVideoState, isNewVideo });
}
//# sourceMappingURL=move-to-file-system.js.map