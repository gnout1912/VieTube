import { CONFIG } from '../../initializers/config.js';
import { canDoQuickAudioTranscode, canDoQuickVideoTranscode, ffprobePromise } from '@peertube/peertube-ffmpeg';
export async function canDoQuickTranscode(path, maxFPS, existingProbe) {
    if (CONFIG.TRANSCODING.PROFILE !== 'default')
        return false;
    const probe = existingProbe || await ffprobePromise(path);
    return await canDoQuickVideoTranscode(path, maxFPS, probe) &&
        await canDoQuickAudioTranscode(path, probe);
}
//# sourceMappingURL=transcoding-quick-transcode.js.map