import { getFFmpegCommandWrapperOptions } from '../../../helpers/ffmpeg/index.js';
import { logger } from '../../../helpers/logger.js';
import { FFmpegVOD } from '@peertube/peertube-ffmpeg';
import { VideoTranscodingProfilesManager } from '../default-transcoding-profiles.js';
export function buildFFmpegVOD(job) {
    return new FFmpegVOD(Object.assign(Object.assign({}, getFFmpegCommandWrapperOptions('vod', VideoTranscodingProfilesManager.Instance.getAvailableEncoders())), { updateJobProgress: progress => {
            if (!job)
                return;
            job.updateProgress(progress)
                .catch(err => logger.error('Cannot update ffmpeg job progress', { err }));
        } }));
}
//# sourceMappingURL=ffmpeg-builder.js.map