import { JOB_PRIORITY } from '../../initializers/constants.js';
import { VideoModel } from '../../models/video/video.js';
export async function getTranscodingJobPriority(options) {
    const { user, fallback, type } = options;
    if (!user)
        return fallback;
    const now = new Date();
    const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const videoUploadedByUser = await VideoModel.countVideosUploadedByUserSince(user.id, lastWeek);
    const base = type === 'vod'
        ? JOB_PRIORITY.TRANSCODING
        : JOB_PRIORITY.VIDEO_STUDIO;
    return base + videoUploadedByUser;
}
//# sourceMappingURL=transcoding-priority.js.map