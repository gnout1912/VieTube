import { toEven } from '@peertube/peertube-core-utils';
import { VideoResolution } from '@peertube/peertube-models';
import { CONFIG } from '../../initializers/config.js';
export function buildOriginalFileResolution(inputResolution) {
    if (CONFIG.TRANSCODING.ALWAYS_TRANSCODE_ORIGINAL_RESOLUTION === true) {
        return toEven(inputResolution);
    }
    const resolutions = computeResolutionsToTranscode({
        input: inputResolution,
        type: 'vod',
        includeInput: false,
        strictLower: false,
        hasAudio: true
    });
    if (resolutions.length === 0 ||
        (resolutions.length === 1 && resolutions[0] === VideoResolution.H_NOVIDEO)) {
        return toEven(inputResolution);
    }
    return Math.max(...resolutions);
}
export function computeResolutionsToTranscode(options) {
    const { input, type, includeInput, strictLower, hasAudio } = options;
    const configResolutions = type === 'vod'
        ? CONFIG.TRANSCODING.RESOLUTIONS
        : CONFIG.LIVE.TRANSCODING.RESOLUTIONS;
    const resolutionsEnabled = new Set();
    const availableResolutions = [
        VideoResolution.H_NOVIDEO,
        VideoResolution.H_480P,
        VideoResolution.H_360P,
        VideoResolution.H_720P,
        VideoResolution.H_240P,
        VideoResolution.H_144P,
        VideoResolution.H_1080P,
        VideoResolution.H_1440P,
        VideoResolution.H_4K
    ];
    for (const resolution of availableResolutions) {
        if (configResolutions[resolution + 'p'] !== true)
            continue;
        if (input < resolution)
            continue;
        if (strictLower && input === resolution)
            continue;
        if (resolution === VideoResolution.H_NOVIDEO && !hasAudio)
            continue;
        resolutionsEnabled.add(resolution);
    }
    if (includeInput) {
        resolutionsEnabled.add(toEven(input));
    }
    return Array.from(resolutionsEnabled);
}
//# sourceMappingURL=transcoding-resolutions.js.map