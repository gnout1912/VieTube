import { logger } from '../../../../helpers/logger.js';
import { ffprobePromise, getVideoStreamDuration } from '@peertube/peertube-ffmpeg';
import { HttpStatusCode } from '@peertube/peertube-models';
export async function addDurationToVideoFileIfNeeded(options) {
    const { res, middlewareName, videoFile } = options;
    try {
        if (!videoFile.duration)
            await addDurationToVideo(res, videoFile);
    }
    catch (err) {
        logger.error('Invalid input file in ' + middlewareName, { err });
        res.fail({
            status: HttpStatusCode.UNPROCESSABLE_ENTITY_422,
            message: 'Video file unreadable.'
        });
        return false;
    }
    return true;
}
async function addDurationToVideo(res, videoFile) {
    const probe = await ffprobePromise(videoFile.path);
    res.locals.ffprobe = probe;
    const duration = await getVideoStreamDuration(videoFile.path, probe);
    if (isNaN(duration))
        videoFile.duration = 0;
    else
        videoFile.duration = duration;
}
//# sourceMappingURL=upload.js.map