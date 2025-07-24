import { LiveRTMPHLSTranscodingJobHandler } from './live-rtmp-hls-transcoding-job-handler.js';
import { TranscriptionJobHandler } from './transcription-job-handler.js';
import { VideoStudioTranscodingJobHandler } from './video-studio-transcoding-job-handler.js';
import { VODAudioMergeTranscodingJobHandler } from './vod-audio-merge-transcoding-job-handler.js';
import { VODHLSTranscodingJobHandler } from './vod-hls-transcoding-job-handler.js';
import { VODWebVideoTranscodingJobHandler } from './vod-web-video-transcoding-job-handler.js';
const processors = {
    'vod-web-video-transcoding': VODWebVideoTranscodingJobHandler,
    'vod-hls-transcoding': VODHLSTranscodingJobHandler,
    'vod-audio-merge-transcoding': VODAudioMergeTranscodingJobHandler,
    'live-rtmp-hls-transcoding': LiveRTMPHLSTranscodingJobHandler,
    'video-studio-transcoding': VideoStudioTranscodingJobHandler,
    'video-transcription': TranscriptionJobHandler
};
export function getRunnerJobHandlerClass(job) {
    return processors[job.type];
}
//# sourceMappingURL=runner-job-handlers.js.map