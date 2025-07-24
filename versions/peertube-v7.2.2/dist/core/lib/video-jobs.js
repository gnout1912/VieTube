import { VideoPrivacy, VideoState } from '@peertube/peertube-models';
import { CONFIG } from '../initializers/config.js';
import { VideoJobInfoModel } from '../models/video/video-job-info.js';
import { JobQueue } from './job-queue/job-queue.js';
import { createTranscriptionTaskIfNeeded } from './video-captions.js';
import { moveFilesIfPrivacyChanged } from './video-privacy.js';
export async function buildMoveVideoJob(options) {
    const { video, previousVideoState, isNewVideo = true, type } = options;
    await VideoJobInfoModel.increaseOrCreate(video.uuid, 'pendingMove');
    return {
        type,
        payload: {
            videoUUID: video.uuid,
            isNewVideo,
            previousVideoState
        }
    };
}
export function buildStoryboardJobIfNeeded(options) {
    const { video, federate } = options;
    if (CONFIG.STORYBOARDS.ENABLED) {
        return {
            type: 'generate-video-storyboard',
            payload: {
                videoUUID: video.uuid,
                federate
            }
        };
    }
    if (federate === true) {
        return {
            type: 'federate-video',
            payload: {
                videoUUID: video.uuid,
                isNewVideoForFederation: false
            }
        };
    }
    return undefined;
}
export async function addVideoJobsAfterCreation(options) {
    const { video, videoFile, generateTranscription } = options;
    const jobs = [
        {
            type: 'manage-video-torrent',
            payload: {
                videoId: video.id,
                videoFileId: videoFile.id,
                action: 'create'
            }
        },
        buildStoryboardJobIfNeeded({ video, federate: false }),
        {
            type: 'notify',
            payload: {
                action: 'new-video',
                videoUUID: video.uuid
            }
        },
        {
            type: 'federate-video',
            payload: {
                videoUUID: video.uuid,
                isNewVideoForFederation: true
            }
        }
    ];
    if (video.state === VideoState.TO_MOVE_TO_EXTERNAL_STORAGE) {
        jobs.push(await buildMoveVideoJob({ video, previousVideoState: undefined, type: 'move-to-object-storage' }));
    }
    if (video.state === VideoState.TO_TRANSCODE) {
        jobs.push({
            type: 'transcoding-job-builder',
            payload: {
                videoUUID: video.uuid,
                optimizeJob: {
                    isNewVideo: true
                }
            }
        });
    }
    await JobQueue.Instance.createSequentialJobFlow(...jobs);
    if (generateTranscription === true) {
        await createTranscriptionTaskIfNeeded(video);
    }
}
export async function addVideoJobsAfterUpdate(options) {
    const { video, nameChanged, oldPrivacy, isNewVideoForFederation } = options;
    const jobs = [];
    const filePathChanged = await moveFilesIfPrivacyChanged(video, oldPrivacy);
    const hls = video.getHLSPlaylist();
    if (filePathChanged && hls) {
        hls.assignP2PMediaLoaderInfoHashes(video, hls.VideoFiles);
        await hls.save();
    }
    if (!video.isLive && (nameChanged || filePathChanged)) {
        for (const file of (video.VideoFiles || [])) {
            const payload = { action: 'update-metadata', videoId: video.id, videoFileId: file.id };
            jobs.push({ type: 'manage-video-torrent', payload });
        }
        const hls = video.getHLSPlaylist();
        for (const file of ((hls === null || hls === void 0 ? void 0 : hls.VideoFiles) || [])) {
            const payload = { action: 'update-metadata', streamingPlaylistId: hls.id, videoFileId: file.id };
            jobs.push({ type: 'manage-video-torrent', payload });
        }
    }
    jobs.push({
        type: 'federate-video',
        payload: {
            videoUUID: video.uuid,
            isNewVideoForFederation
        }
    });
    const wasConfidentialVideoForNotification = new Set([
        VideoPrivacy.PRIVATE,
        VideoPrivacy.UNLISTED
    ]).has(oldPrivacy);
    if (wasConfidentialVideoForNotification) {
        jobs.push({
            type: 'notify',
            payload: {
                action: 'new-video',
                videoUUID: video.uuid
            }
        });
    }
    return JobQueue.Instance.createSequentialJobFlow(...jobs);
}
//# sourceMappingURL=video-jobs.js.map