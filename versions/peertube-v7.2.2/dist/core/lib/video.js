import { VideoCommentPolicy } from '@peertube/peertube-models';
import { CONFIG } from '../initializers/config.js';
import { MEMOIZE_LENGTH, MEMOIZE_TTL } from '../initializers/constants.js';
import { TagModel } from '../models/video/tag.js';
import { VideoModel } from '../models/video/video.js';
import memoizee from 'memoizee';
export async function setVideoTags(options) {
    const { video, tags, transaction } = options;
    const internalTags = tags || [];
    const tagInstances = await TagModel.findOrCreateMultiple({ tags: internalTags, transaction });
    await video.$set('Tags', tagInstances, { transaction });
    video.Tags = tagInstances;
}
async function getVideoDuration(videoId) {
    const video = await VideoModel.load(videoId);
    const duration = video.isLive
        ? undefined
        : video.duration;
    return { duration, isLive: video.isLive };
}
export const getCachedVideoDuration = memoizee(getVideoDuration, {
    promise: true,
    max: MEMOIZE_LENGTH.VIDEO_DURATION,
    maxAge: MEMOIZE_TTL.VIDEO_DURATION
});
export function buildCommentsPolicy(options) {
    if (options.commentsPolicy)
        return options.commentsPolicy;
    if (options.commentsEnabled === true)
        return VideoCommentPolicy.ENABLED;
    if (options.commentsEnabled === false)
        return VideoCommentPolicy.DISABLED;
    return CONFIG.DEFAULTS.PUBLISH.COMMENTS_POLICY;
}
//# sourceMappingURL=video.js.map