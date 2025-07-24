import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { logger } from '../../../helpers/logger.js';
import { JobQueue } from '../../job-queue/index.js';
import { loadVideoByUrl } from '../../model-loaders/index.js';
import { getAPId } from '../activity.js';
import { refreshVideoIfNeeded } from './refresh.js';
import { APVideoCreator, fetchRemoteVideo, syncVideoExternalAttributes } from './shared/index.js';
export async function getOrCreateAPVideo(options) {
    const syncParam = options.syncParam || { rates: true, shares: true, comments: true, refreshVideo: false };
    const fetchType = options.fetchType || 'all';
    const allowRefresh = options.allowRefresh !== false;
    const videoUrl = getAPId(options.videoObject);
    let videoFromDatabase = await loadVideoByUrl(videoUrl, fetchType);
    if (videoFromDatabase) {
        if (allowRefresh === true) {
            videoFromDatabase = await scheduleRefresh(videoFromDatabase, fetchType, syncParam);
        }
        return { video: videoFromDatabase, created: false };
    }
    const { videoObject } = await fetchRemoteVideo(videoUrl);
    if (!videoObject)
        throw new Error('Cannot fetch remote video with url: ' + videoUrl);
    if (videoObject.id !== videoUrl)
        return getOrCreateAPVideo(Object.assign(Object.assign({}, options), { fetchType: 'all', videoObject }));
    try {
        const creator = new APVideoCreator(videoObject);
        const { autoBlacklisted, videoCreated } = await retryTransactionWrapper(creator.create.bind(creator));
        await syncVideoExternalAttributes(videoCreated, videoObject, syncParam);
        return { video: videoCreated, created: true, autoBlacklisted };
    }
    catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            const alreadyCreatedVideo = await loadVideoByUrl(videoUrl, fetchType);
            if (alreadyCreatedVideo)
                return { video: alreadyCreatedVideo, created: false };
            logger.error('Cannot create video %s because of SequelizeUniqueConstraintError error, but cannot find it in database.', videoUrl);
        }
        throw err;
    }
}
export async function maybeGetOrCreateAPVideo(options) {
    try {
        const result = await getOrCreateAPVideo(options);
        return result;
    }
    catch (err) {
        logger.debug('Cannot fetch remote video ' + options.videoObject + ': maybe not a video object?', { err });
        return { video: undefined, created: false };
    }
}
async function scheduleRefresh(video, fetchType, syncParam) {
    if (!video.isOutdated())
        return video;
    const refreshOptions = {
        video,
        fetchedType: fetchType,
        syncParam
    };
    if (syncParam.refreshVideo === true) {
        return refreshVideoIfNeeded(refreshOptions);
    }
    await JobQueue.Instance.createJob({
        type: 'activitypub-refresher',
        payload: { type: 'video', url: video.url }
    });
    return video;
}
//# sourceMappingURL=get.js.map