import { VideoResolution } from '@peertube/peertube-models';
import { CONFIG } from '../../initializers/config.js';
import { logger } from '../logger.js';
export function computeOutputFPS(options) {
    const { resolution, isOriginResolution, type } = options;
    if (resolution === VideoResolution.H_NOVIDEO)
        return 0;
    const settings = type === 'vod'
        ? buildTranscodingFPSOptions(CONFIG.TRANSCODING.FPS.MAX)
        : buildTranscodingFPSOptions(CONFIG.LIVE.TRANSCODING.FPS.MAX);
    let fps = options.inputFPS;
    if (!isOriginResolution &&
        resolution !== undefined &&
        resolution < settings.KEEP_ORIGIN_FPS_RESOLUTION_MIN &&
        fps > settings.AVERAGE) {
        fps = getClosestFramerate({ fps, settings, type: 'STANDARD' });
    }
    if (fps < settings.HARD_MIN) {
        throw new Error(`Cannot compute FPS because ${fps} is lower than our minimum value ${settings.HARD_MIN}`);
    }
    fps = Math.max(fps, settings.TRANSCODED_MIN);
    if (!isOriginResolution && fps > settings.TRANSCODED_MAX) {
        fps = getClosestFramerate({ fps, settings, type: 'HD_STANDARD' });
    }
    logger.debug(`Computed output FPS ${fps} for resolution ${resolution}p`, { options, settings });
    return fps;
}
function buildTranscodingFPSOptions(maxFPS) {
    const STANDARD = [24, 25, 30].filter(v => v <= maxFPS);
    if (STANDARD.length === 0)
        STANDARD.push(maxFPS);
    const HD_STANDARD = [50, 60, maxFPS].filter(v => v <= maxFPS);
    return {
        HARD_MIN: 0.1,
        TRANSCODED_MIN: 1,
        TRANSCODED_MAX: maxFPS,
        STANDARD,
        HD_STANDARD,
        AVERAGE: Math.min(30, maxFPS),
        KEEP_ORIGIN_FPS_RESOLUTION_MIN: 720
    };
}
function getClosestFramerate(options) {
    const { fps, settings, type } = options;
    const copy = [...settings[type]];
    const descSorted = copy.sort((a, b) => b - a);
    const found = descSorted.find(e => fps % e === 0);
    if (found)
        return found;
    return copy.sort((a, b) => fps % a - fps % b)[0];
}
//# sourceMappingURL=framerate.js.map