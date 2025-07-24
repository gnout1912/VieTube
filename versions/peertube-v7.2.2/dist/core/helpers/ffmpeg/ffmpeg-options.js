import { logger } from '../logger.js';
import { CONFIG } from '../../initializers/config.js';
import { FFMPEG_NICE } from '../../initializers/constants.js';
export function getFFmpegCommandWrapperOptions(type, availableEncoders) {
    return {
        availableEncoders,
        profile: getProfile(type),
        niceness: FFMPEG_NICE[type.toUpperCase()],
        tmpDirectory: CONFIG.STORAGE.TMP_DIR,
        threads: getThreads(type),
        logger: {
            debug: logger.debug.bind(logger),
            info: logger.info.bind(logger),
            warn: logger.warn.bind(logger),
            error: logger.error.bind(logger)
        },
        lTags: { tags: ['ffmpeg'] }
    };
}
function getThreads(type) {
    if (type === 'live')
        return CONFIG.LIVE.TRANSCODING.THREADS;
    if (type === 'vod')
        return CONFIG.TRANSCODING.THREADS;
    return 0;
}
function getProfile(type) {
    if (type === 'live')
        return CONFIG.LIVE.TRANSCODING.PROFILE;
    if (type === 'vod')
        return CONFIG.TRANSCODING.PROFILE;
    return undefined;
}
//# sourceMappingURL=ffmpeg-options.js.map