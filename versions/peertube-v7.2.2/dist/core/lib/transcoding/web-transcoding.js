import { buildAspectRatio } from '@peertube/peertube-core-utils';
import { getVideoStreamDuration } from '@peertube/peertube-ffmpeg';
import { VideoFileStream } from '@peertube/peertube-models';
import { computeOutputFPS } from '../../helpers/ffmpeg/index.js';
import { createTorrentAndSetInfoHash } from '../../helpers/webtorrent.js';
import { VideoModel } from '../../models/video/video.js';
import { move, remove } from 'fs-extra/esm';
import { copyFile } from 'fs/promises';
import { basename, join } from 'path';
import { CONFIG } from '../../initializers/config.js';
import { VideoFileModel } from '../../models/video/video-file.js';
import { JobQueue } from '../job-queue/index.js';
import { generateWebVideoFilename } from '../paths.js';
import { buildNewFile, saveNewOriginalFileIfNeeded } from '../video-file.js';
import { buildStoryboardJobIfNeeded } from '../video-jobs.js';
import { VideoPathManager } from '../video-path-manager.js';
import { buildFFmpegVOD } from './shared/index.js';
import { buildOriginalFileResolution } from './transcoding-resolutions.js';
export async function optimizeOriginalVideofile(options) {
    const { quickTranscode, job } = options;
    const transcodeDirectory = CONFIG.STORAGE.TMP_DIR;
    const newExtname = '.mp4';
    const inputFileMutexReleaser = await VideoPathManager.Instance.lockFiles(options.video.uuid);
    try {
        const video = await VideoModel.loadFull(options.video.id);
        const inputVideoFile = video.getMaxQualityFile(VideoFileStream.VIDEO);
        const result = await VideoPathManager.Instance.makeAvailableVideoFile(inputVideoFile, async (videoInputPath) => {
            const videoOutputPath = join(transcodeDirectory, video.id + '-transcoded' + newExtname);
            const transcodeType = quickTranscode
                ? 'quick-transcode'
                : 'video';
            const resolution = buildOriginalFileResolution(inputVideoFile.resolution);
            const fps = computeOutputFPS({ inputFPS: inputVideoFile.fps, resolution, isOriginResolution: true, type: 'vod' });
            await buildFFmpegVOD(job).transcode({
                type: transcodeType,
                videoInputPath,
                outputPath: videoOutputPath,
                inputFileMutexReleaser,
                resolution,
                fps
            });
            const { videoFile } = await onWebVideoFileTranscoding({ video, videoOutputPath, deleteWebInputVideoFile: inputVideoFile });
            return { transcodeType, videoFile };
        });
        return result;
    }
    finally {
        inputFileMutexReleaser();
    }
}
export async function transcodeNewWebVideoResolution(options) {
    const { video: videoArg, resolution, fps, job } = options;
    const transcodeDirectory = CONFIG.STORAGE.TMP_DIR;
    const newExtname = '.mp4';
    const inputFileMutexReleaser = await VideoPathManager.Instance.lockFiles(videoArg.uuid);
    try {
        const video = await VideoModel.loadFull(videoArg.uuid);
        const result = await VideoPathManager.Instance.makeAvailableMaxQualityFiles(video, async ({ videoPath, separatedAudioPath }) => {
            const filename = generateWebVideoFilename(resolution, newExtname);
            const videoOutputPath = join(transcodeDirectory, filename);
            const transcodeOptions = {
                type: 'video',
                videoInputPath: videoPath,
                separatedAudioInputPath: separatedAudioPath,
                outputPath: videoOutputPath,
                inputFileMutexReleaser,
                resolution,
                fps
            };
            await buildFFmpegVOD(job).transcode(transcodeOptions);
            return onWebVideoFileTranscoding({ video, videoOutputPath });
        });
        return result;
    }
    finally {
        inputFileMutexReleaser();
    }
}
export async function mergeAudioVideofile(options) {
    const { video: videoArg, resolution, fps, job } = options;
    const transcodeDirectory = CONFIG.STORAGE.TMP_DIR;
    const newExtname = '.mp4';
    const inputFileMutexReleaser = await VideoPathManager.Instance.lockFiles(videoArg.uuid);
    try {
        const video = await VideoModel.loadFull(videoArg.uuid);
        const inputVideoFile = video.getMaxQualityFile(VideoFileStream.AUDIO);
        const result = await VideoPathManager.Instance.makeAvailableVideoFile(inputVideoFile, async (audioInputPath) => {
            const videoOutputPath = join(transcodeDirectory, video.id + '-transcoded' + newExtname);
            const previewPath = video.getPreview().getPath();
            const tmpPreviewPath = join(CONFIG.STORAGE.TMP_DIR, basename(previewPath));
            await copyFile(previewPath, tmpPreviewPath);
            const transcodeOptions = {
                type: 'merge-audio',
                videoInputPath: tmpPreviewPath,
                audioPath: audioInputPath,
                outputPath: videoOutputPath,
                inputFileMutexReleaser,
                resolution,
                fps
            };
            try {
                await buildFFmpegVOD(job).transcode(transcodeOptions);
                await remove(tmpPreviewPath);
            }
            catch (err) {
                await remove(tmpPreviewPath);
                throw err;
            }
            await onWebVideoFileTranscoding({
                video,
                videoOutputPath,
                deleteWebInputVideoFile: inputVideoFile,
                wasAudioFile: true
            });
        });
        return result;
    }
    finally {
        inputFileMutexReleaser();
    }
}
export async function onWebVideoFileTranscoding(options) {
    const { video, videoOutputPath, wasAudioFile, deleteWebInputVideoFile } = options;
    const mutexReleaser = await VideoPathManager.Instance.lockFiles(video.uuid);
    const videoFile = await buildNewFile({ mode: 'web-video', path: videoOutputPath });
    videoFile.videoId = video.id;
    try {
        await video.reload();
        if (wasAudioFile) {
            video.duration = await getVideoStreamDuration(videoOutputPath);
            video.aspectRatio = buildAspectRatio({ width: videoFile.width, height: videoFile.height });
            await video.save();
        }
        const outputPath = VideoPathManager.Instance.getFSVideoFileOutputPath(video, videoFile);
        await move(videoOutputPath, outputPath, { overwrite: true });
        await createTorrentAndSetInfoHash(video, videoFile);
        if (deleteWebInputVideoFile) {
            await saveNewOriginalFileIfNeeded(video, deleteWebInputVideoFile);
            await video.removeWebVideoFile(deleteWebInputVideoFile);
            await deleteWebInputVideoFile.destroy();
        }
        const existingFile = await VideoFileModel.loadWebVideoFile({ videoId: video.id, fps: videoFile.fps, resolution: videoFile.resolution });
        if (existingFile)
            await video.removeWebVideoFile(existingFile);
        await VideoFileModel.customUpsert(videoFile, 'video', undefined);
        video.VideoFiles = await video.$get('VideoFiles');
        if (wasAudioFile) {
            await JobQueue.Instance.createJob(buildStoryboardJobIfNeeded({ video, federate: false }));
        }
        return { video, videoFile };
    }
    finally {
        mutexReleaser();
    }
}
//# sourceMappingURL=web-transcoding.js.map