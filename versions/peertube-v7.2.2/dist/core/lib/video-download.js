import { FFmpegContainer } from '@peertube/peertube-ffmpeg';
import { FileStorage } from '@peertube/peertube-models';
import { getFFmpegCommandWrapperOptions } from '../helpers/ffmpeg/ffmpeg-options.js';
import { logger } from '../helpers/logger.js';
import { buildRequestError, doRequestAndSaveToFile, generateRequestStream } from '../helpers/requests.js';
import { REQUEST_TIMEOUTS } from '../initializers/constants.js';
import { remove } from 'fs-extra/esm';
import { Readable } from 'stream';
import { lTags } from './object-storage/shared/index.js';
import { getHLSFileReadStream, getWebVideoFileReadStream, makeHLSFileAvailable, makeWebVideoFileAvailable } from './object-storage/videos.js';
import { VideoPathManager } from './video-path-manager.js';
export class VideoDownload {
    constructor(options) {
        this.inputs = [];
        this.tmpDestinations = [];
        this.video = options.video;
        this.videoFiles = options.videoFiles;
    }
    async muxToMergeVideoFiles(output) {
        return new Promise(async (res, rej) => {
            try {
                VideoDownload.totalDownloads++;
                const maxResolution = await this.buildMuxInputs(rej);
                const { coverPath, isTmpDestination } = maxResolution === 0
                    ? await this.buildCoverInput()
                    : { coverPath: undefined, isTmpDestination: false };
                if (coverPath && isTmpDestination) {
                    this.tmpDestinations.push(coverPath);
                }
                logger.info(`Muxing files for video ${this.video.url}`, Object.assign({ inputs: this.inputsToLog() }, lTags(this.video.uuid)));
                this.ffmpegContainer = new FFmpegContainer(getFFmpegCommandWrapperOptions('vod'));
                try {
                    await this.ffmpegContainer.mergeInputs({
                        inputs: this.inputs,
                        output,
                        logError: false,
                        coverPath
                    });
                    logger.info(`Mux ended for video ${this.video.url}`, Object.assign({ inputs: this.inputsToLog() }, lTags(this.video.uuid)));
                    res();
                }
                catch (err) {
                    const message = (err === null || err === void 0 ? void 0 : err.message) || '';
                    if (message.includes('Output stream closed')) {
                        logger.info(`Client aborted mux for video ${this.video.url}`, lTags(this.video.uuid));
                        return;
                    }
                    logger.warn(`Cannot mux files of video ${this.video.url}`, Object.assign({ err, inputs: this.inputsToLog() }, lTags(this.video.uuid)));
                    if (err.inputStreamError) {
                        err.inputStreamError = buildRequestError(err.inputStreamError);
                    }
                    throw err;
                }
                finally {
                    this.ffmpegContainer.forceKill();
                }
            }
            catch (err) {
                rej(err);
            }
            finally {
                this.cleanup()
                    .catch(cleanupErr => logger.error('Cannot cleanup after mux error', Object.assign({ err: cleanupErr }, lTags(this.video.uuid))));
            }
        });
    }
    async buildMuxInputs(rej) {
        let maxResolution = 0;
        for (const videoFile of this.videoFiles) {
            if (!videoFile)
                continue;
            maxResolution = Math.max(maxResolution, videoFile.resolution);
            const { input, isTmpDestination } = await this.buildMuxInput(videoFile, err => {
                logger.warn(`Cannot build mux input of video ${this.video.url}`, Object.assign({ err, inputs: this.inputsToLog() }, lTags(this.video.uuid)));
                this.cleanup()
                    .catch(cleanupErr => logger.error('Cannot cleanup after mux error', Object.assign({ err: cleanupErr }, lTags(this.video.uuid))));
                rej(buildRequestError(err));
            });
            this.inputs.push(input);
            if (isTmpDestination === true)
                this.tmpDestinations.push(input);
        }
        return maxResolution;
    }
    async buildMuxInput(videoFile, onStreamError) {
        if (this.video.remote === true) {
            return this.buildMuxRemoteInput(videoFile, onStreamError);
        }
        if (videoFile.storage === FileStorage.FILE_SYSTEM) {
            return this.buildMuxLocalFSInput(videoFile);
        }
        return this.buildMuxLocalObjectStorageInput(videoFile);
    }
    async buildMuxRemoteInput(videoFile, onStreamError) {
        const timeout = REQUEST_TIMEOUTS.VIDEO_FILE;
        const videoSizeKB = videoFile.size / 1000;
        const bodyKBLimit = videoSizeKB + 0.1 * videoSizeKB;
        if (videoFile.isAudio()) {
            const destination = VideoPathManager.Instance.buildTMPDestination(videoFile.filename);
            if (bodyKBLimit > 1000 * 1000) {
                throw new Error('Cannot download remote video file > 1GB');
            }
            await doRequestAndSaveToFile(videoFile.fileUrl, destination, { timeout, bodyKBLimit });
            return { input: destination, isTmpDestination: true };
        }
        return {
            input: generateRequestStream(videoFile.fileUrl, { timeout, bodyKBLimit }).on('error', onStreamError),
            isTmpDestination: false
        };
    }
    buildMuxLocalFSInput(videoFile) {
        return { input: VideoPathManager.Instance.getFSVideoFileOutputPath(this.video, videoFile), isTmpDestination: false };
    }
    async buildMuxLocalObjectStorageInput(videoFile) {
        if (videoFile.hasAudio() && !videoFile.hasVideo()) {
            const destination = VideoPathManager.Instance.buildTMPDestination(videoFile.filename);
            if (videoFile.isHLS()) {
                await makeHLSFileAvailable(this.video.getHLSPlaylist(), videoFile.filename, destination);
            }
            else {
                await makeWebVideoFileAvailable(videoFile.filename, destination);
            }
            return { input: destination, isTmpDestination: true };
        }
        if (videoFile.isHLS()) {
            const { stream } = await getHLSFileReadStream({
                playlist: this.video.getHLSPlaylist().withVideo(this.video),
                filename: videoFile.filename,
                rangeHeader: undefined
            });
            return { input: stream, isTmpDestination: false };
        }
        const { stream } = await getWebVideoFileReadStream({
            filename: videoFile.filename,
            rangeHeader: undefined
        });
        return { input: stream, isTmpDestination: false };
    }
    async buildCoverInput() {
        const preview = this.video.getPreview();
        if (this.video.isOwned())
            return { coverPath: preview === null || preview === void 0 ? void 0 : preview.getPath() };
        if (preview.fileUrl) {
            const destination = VideoPathManager.Instance.buildTMPDestination(preview.filename);
            await doRequestAndSaveToFile(preview.fileUrl, destination);
            return { coverPath: destination, isTmpDestination: true };
        }
        return { coverPath: undefined };
    }
    inputsToLog() {
        return this.inputs.map(i => {
            if (typeof i === 'string')
                return i;
            return 'ReadableStream';
        });
    }
    async cleanup() {
        VideoDownload.totalDownloads--;
        for (const destination of this.tmpDestinations) {
            await remove(destination)
                .catch(err => logger.error('Cannot remove tmp destination', Object.assign({ err, destination }, lTags(this.video.uuid))));
        }
        for (const input of this.inputs) {
            if (input instanceof Readable) {
                if (!input.destroyed)
                    input.destroy();
            }
        }
        if (this.ffmpegContainer) {
            this.ffmpegContainer.forceKill();
            this.ffmpegContainer = undefined;
        }
        logger.debug(`Cleaned muxing for video ${this.video.url}`, Object.assign({ inputs: this.inputsToLog() }, lTags(this.video.uuid)));
    }
}
VideoDownload.totalDownloads = 0;
//# sourceMappingURL=video-download.js.map