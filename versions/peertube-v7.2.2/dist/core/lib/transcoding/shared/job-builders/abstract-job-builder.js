import { ffprobePromise } from '@peertube/peertube-ffmpeg';
import { VideoResolution } from '@peertube/peertube-models';
import { computeOutputFPS } from '../../../../helpers/ffmpeg/framerate.js';
import { logger, loggerTagsFactory } from '../../../../helpers/logger.js';
import { CONFIG } from '../../../../initializers/config.js';
import { DEFAULT_AUDIO_MERGE_RESOLUTION, DEFAULT_AUDIO_RESOLUTION } from '../../../../initializers/constants.js';
import { Hooks } from '../../../plugins/hooks.js';
import { VideoPathManager } from '../../../video-path-manager.js';
import { canDoQuickTranscode } from '../../transcoding-quick-transcode.js';
import { buildOriginalFileResolution, computeResolutionsToTranscode } from '../../transcoding-resolutions.js';
const lTags = loggerTagsFactory('transcoding');
export class AbstractJobBuilder {
    async createOptimizeOrMergeAudioJobs(options) {
        const { video, videoFile, isNewVideo, user, videoFileAlreadyLocked } = options;
        let mergeOrOptimizePayload;
        let children = [];
        const mutexReleaser = videoFileAlreadyLocked
            ? () => { }
            : await VideoPathManager.Instance.lockFiles(video.uuid);
        try {
            await video.reload();
            await videoFile.reload();
            await VideoPathManager.Instance.makeAvailableVideoFile(videoFile.withVideoOrPlaylist(video), async (videoFilePath) => {
                const probe = await ffprobePromise(videoFilePath);
                const quickTranscode = await canDoQuickTranscode(videoFilePath, CONFIG.TRANSCODING.FPS.MAX, probe);
                let maxFPS;
                let maxResolution;
                let hlsAudioAlreadyGenerated = false;
                if (videoFile.isAudio()) {
                    maxFPS = Math.min(DEFAULT_AUDIO_MERGE_RESOLUTION, CONFIG.TRANSCODING.FPS.MAX);
                    maxResolution = DEFAULT_AUDIO_RESOLUTION;
                    mergeOrOptimizePayload = this.buildMergeAudioPayload({
                        video,
                        isNewVideo,
                        inputFile: videoFile,
                        resolution: maxResolution,
                        fps: maxFPS
                    });
                }
                else {
                    const inputFPS = videoFile.fps;
                    maxResolution = buildOriginalFileResolution(videoFile.resolution);
                    maxFPS = computeOutputFPS({ inputFPS, resolution: maxResolution, isOriginResolution: true, type: 'vod' });
                    mergeOrOptimizePayload = this.buildOptimizePayload({
                        video,
                        isNewVideo,
                        quickTranscode,
                        inputFile: videoFile,
                        resolution: maxResolution,
                        fps: maxFPS
                    });
                }
                if (CONFIG.TRANSCODING.HLS.ENABLED === true) {
                    const hasSplitAudioTranscoding = CONFIG.TRANSCODING.HLS.SPLIT_AUDIO_AND_VIDEO && videoFile.hasAudio();
                    const copyCodecs = !quickTranscode;
                    const hlsPayloads = [];
                    hlsPayloads.push(this.buildHLSJobPayload({
                        deleteWebVideoFiles: !CONFIG.TRANSCODING.WEB_VIDEOS.ENABLED && !hasSplitAudioTranscoding,
                        separatedAudio: hasSplitAudioTranscoding,
                        copyCodecs,
                        resolution: maxResolution,
                        fps: maxFPS,
                        video,
                        isNewVideo
                    }));
                    if (hasSplitAudioTranscoding) {
                        hlsAudioAlreadyGenerated = true;
                        hlsPayloads.push(Object.assign({ higherPriority: true }, this.buildHLSJobPayload({
                            deleteWebVideoFiles: !CONFIG.TRANSCODING.WEB_VIDEOS.ENABLED,
                            separatedAudio: hasSplitAudioTranscoding,
                            copyCodecs,
                            resolution: 0,
                            fps: 0,
                            video,
                            isNewVideo
                        })));
                    }
                    children.push(hlsPayloads);
                }
                const lowerResolutionJobPayloads = await this.buildLowerResolutionJobPayloads({
                    video,
                    inputVideoResolution: maxResolution,
                    inputVideoFPS: maxFPS,
                    hasAudio: videoFile.hasAudio(),
                    isNewVideo,
                    hlsAudioAlreadyGenerated
                });
                children = children.concat(lowerResolutionJobPayloads);
            });
        }
        finally {
            mutexReleaser();
        }
        await this.createJobs({
            payloads: [[mergeOrOptimizePayload], ...children],
            user,
            video
        });
    }
    async createTranscodingJobs(options) {
        const { video, transcodingType, resolutions, isNewVideo } = options;
        const separatedAudio = CONFIG.TRANSCODING.HLS.SPLIT_AUDIO_AND_VIDEO;
        const maxResolution = Math.max(...resolutions);
        const childrenResolutions = resolutions.filter(r => r !== maxResolution);
        logger.info('Manually creating transcoding jobs for %s.', transcodingType, Object.assign({ childrenResolutions, maxResolution }, lTags(video.uuid)));
        const inputFPS = video.getMaxFPS();
        const children = childrenResolutions
            .map(resolution => {
            const fps = computeOutputFPS({ inputFPS, resolution, isOriginResolution: maxResolution === resolution, type: 'vod' });
            if (transcodingType === 'hls') {
                if (resolution === VideoResolution.H_NOVIDEO && separatedAudio)
                    return undefined;
                return this.buildHLSJobPayload({ video, resolution, fps, isNewVideo, separatedAudio });
            }
            if (transcodingType === 'web-video') {
                return this.buildWebVideoJobPayload({ video, resolution, fps, isNewVideo });
            }
            throw new Error('Unknown transcoding type');
        })
            .filter(r => !!r);
        const fps = computeOutputFPS({ inputFPS, resolution: maxResolution, isOriginResolution: true, type: 'vod' });
        const parent = transcodingType === 'hls'
            ? this.buildHLSJobPayload({ video, resolution: maxResolution, fps, isNewVideo, separatedAudio })
            : this.buildWebVideoJobPayload({ video, resolution: maxResolution, fps, isNewVideo });
        const payloads = [[parent]];
        if (transcodingType === 'hls' && separatedAudio) {
            payloads.unshift([this.buildHLSJobPayload({ video, resolution: VideoResolution.H_NOVIDEO, fps, isNewVideo, separatedAudio })]);
        }
        if (children && children.length !== 0)
            payloads.push(children);
        await this.createJobs({ video, payloads, user: null });
    }
    async buildLowerResolutionJobPayloads(options) {
        const { video, inputVideoResolution, inputVideoFPS, isNewVideo, hlsAudioAlreadyGenerated, hasAudio } = options;
        const resolutionsEnabled = await Hooks.wrapObject(computeResolutionsToTranscode({ input: inputVideoResolution, type: 'vod', includeInput: false, strictLower: true, hasAudio }), 'filter:transcoding.auto.resolutions-to-transcode.result', options);
        logger.debug('Lower resolutions built for %s.', video.uuid, Object.assign({ resolutionsEnabled }, lTags(video.uuid)));
        const sequentialPayloads = [];
        for (const resolution of resolutionsEnabled) {
            const fps = computeOutputFPS({
                inputFPS: inputVideoFPS,
                resolution,
                isOriginResolution: resolution === inputVideoResolution,
                type: 'vod'
            });
            let generateHLS = CONFIG.TRANSCODING.HLS.ENABLED;
            if (resolution === VideoResolution.H_NOVIDEO && hlsAudioAlreadyGenerated)
                generateHLS = false;
            const parallelPayloads = [];
            if (CONFIG.TRANSCODING.WEB_VIDEOS.ENABLED) {
                parallelPayloads.push(this.buildWebVideoJobPayload({
                    video,
                    resolution,
                    fps,
                    isNewVideo
                }));
            }
            if (generateHLS) {
                parallelPayloads.push(this.buildHLSJobPayload({
                    video,
                    resolution,
                    fps,
                    isNewVideo,
                    separatedAudio: hasAudio && CONFIG.TRANSCODING.HLS.SPLIT_AUDIO_AND_VIDEO,
                    copyCodecs: CONFIG.TRANSCODING.WEB_VIDEOS.ENABLED
                }));
            }
            if (parallelPayloads.length !== 0) {
                sequentialPayloads.push(parallelPayloads);
            }
        }
        return sequentialPayloads;
    }
}
//# sourceMappingURL=abstract-job-builder.js.map