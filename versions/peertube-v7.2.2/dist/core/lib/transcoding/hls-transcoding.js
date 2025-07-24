import { pick } from '@peertube/peertube-core-utils';
import { getVideoStreamDuration } from '@peertube/peertube-ffmpeg';
import { retryTransactionWrapper } from '../../helpers/database-utils.js';
import { createTorrentAndSetInfoHash } from '../../helpers/webtorrent.js';
import { sequelizeTypescript } from '../../initializers/database.js';
import { ensureDir, move } from 'fs-extra/esm';
import { join } from 'path';
import { CONFIG } from '../../initializers/config.js';
import { VideoFileModel } from '../../models/video/video-file.js';
import { VideoStreamingPlaylistModel } from '../../models/video/video-streaming-playlist.js';
import { renameVideoFileInPlaylist, updateM3U8AndShaPlaylist } from '../hls.js';
import { generateHLSVideoFilename, getHLSResolutionPlaylistFilename } from '../paths.js';
import { buildNewFile } from '../video-file.js';
import { VideoPathManager } from '../video-path-manager.js';
import { buildFFmpegVOD } from './shared/index.js';
import { createAllCaptionPlaylistsOnFSIfNeeded } from '../video-captions.js';
export async function generateHlsPlaylistResolutionFromTS(options) {
    return generateHlsPlaylistCommon(Object.assign({ type: 'hls-from-ts', videoInputPath: options.concatenatedTsFilePath }, pick(options, ['video', 'resolution', 'fps', 'inputFileMutexReleaser', 'isAAC'])));
}
export function generateHlsPlaylistResolution(options) {
    return generateHlsPlaylistCommon(Object.assign({ type: 'hls' }, pick(options, [
        'videoInputPath',
        'separatedAudioInputPath',
        'video',
        'resolution',
        'fps',
        'copyCodecs',
        'separatedAudio',
        'inputFileMutexReleaser',
        'job'
    ])));
}
export async function onHLSVideoFileTranscoding(options) {
    const { video, videoOutputPath, m3u8OutputPath, filesLockedInParent = false } = options;
    const { playlist, generated: playlistGenerated } = await retryTransactionWrapper(() => {
        return sequelizeTypescript.transaction(async (transaction) => {
            return VideoStreamingPlaylistModel.loadOrGenerate(video, transaction);
        });
    });
    const newVideoFile = await buildNewFile({ mode: 'hls', path: videoOutputPath });
    newVideoFile.videoStreamingPlaylistId = playlist.id;
    const mutexReleaser = !filesLockedInParent
        ? await VideoPathManager.Instance.lockFiles(video.uuid)
        : null;
    try {
        await video.reload();
        const videoFilePath = VideoPathManager.Instance.getFSVideoFileOutputPath(playlist, newVideoFile);
        await ensureDir(VideoPathManager.Instance.getFSHLSOutputPath(video));
        const resolutionPlaylistPath = VideoPathManager.Instance.getFSHLSOutputPath(video, getHLSResolutionPlaylistFilename(newVideoFile.filename));
        await move(m3u8OutputPath, resolutionPlaylistPath, { overwrite: true });
        await move(videoOutputPath, videoFilePath, { overwrite: true });
        await renameVideoFileInPlaylist(resolutionPlaylistPath, newVideoFile.filename);
        if (!video.duration) {
            video.duration = await getVideoStreamDuration(videoFilePath);
            await video.save();
        }
        await createTorrentAndSetInfoHash(playlist, newVideoFile);
        const oldFile = await VideoFileModel.loadHLSFile({
            playlistId: playlist.id,
            fps: newVideoFile.fps,
            resolution: newVideoFile.resolution
        });
        if (oldFile) {
            await video.removeStreamingPlaylistVideoFile(playlist, oldFile);
            await oldFile.destroy();
        }
        const savedVideoFile = await VideoFileModel.customUpsert(newVideoFile, 'streaming-playlist', undefined);
        if (playlistGenerated) {
            await createAllCaptionPlaylistsOnFSIfNeeded(video);
        }
        await updateM3U8AndShaPlaylist(video, playlist);
        return { resolutionPlaylistPath, videoFile: savedVideoFile };
    }
    finally {
        if (mutexReleaser)
            mutexReleaser();
    }
}
async function generateHlsPlaylistCommon(options) {
    const { type, video, videoInputPath, separatedAudioInputPath, resolution, fps, copyCodecs, separatedAudio, isAAC, job, inputFileMutexReleaser } = options;
    const transcodeDirectory = CONFIG.STORAGE.TMP_DIR;
    const videoTranscodedBasePath = join(transcodeDirectory, type);
    await ensureDir(videoTranscodedBasePath);
    const videoFilename = generateHLSVideoFilename(resolution);
    const videoOutputPath = join(videoTranscodedBasePath, videoFilename);
    const resolutionPlaylistFilename = getHLSResolutionPlaylistFilename(videoFilename);
    const m3u8OutputPath = join(videoTranscodedBasePath, resolutionPlaylistFilename);
    const transcodeOptions = {
        type,
        videoInputPath,
        separatedAudioInputPath,
        outputPath: m3u8OutputPath,
        resolution,
        fps,
        copyCodecs,
        separatedAudio,
        isAAC,
        inputFileMutexReleaser,
        hlsPlaylist: {
            videoFilename
        }
    };
    await buildFFmpegVOD(job).transcode(transcodeOptions);
    await onHLSVideoFileTranscoding({
        video,
        videoOutputPath,
        m3u8OutputPath,
        filesLockedInParent: !inputFileMutexReleaser
    });
}
//# sourceMappingURL=hls-transcoding.js.map