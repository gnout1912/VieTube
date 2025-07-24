import { runInReadCommittedTransaction } from '../../../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../../../helpers/logger.js';
import { JobQueue } from '../../../job-queue/index.js';
import { VideoCommentModel } from '../../../../models/video/video-comment.js';
import { VideoShareModel } from '../../../../models/video/video-share.js';
import { VideoModel } from '../../../../models/video/video.js';
import { fetchAP } from '../../activity.js';
import { crawlCollectionPage } from '../../crawl.js';
import { addVideoShares } from '../../share.js';
import { addVideoComments } from '../../video-comments.js';
const lTags = loggerTagsFactory('ap', 'video');
export async function syncVideoExternalAttributes(video, fetchedVideo, syncParam) {
    logger.info('Adding likes/dislikes/shares/comments of video %s.', video.uuid);
    const ratePromise = updateVideoRates(video, fetchedVideo);
    if (syncParam.rates)
        await ratePromise;
    await syncShares(video, fetchedVideo, syncParam.shares);
    await syncComments(video, fetchedVideo, syncParam.comments);
}
export async function updateVideoRates(video, fetchedVideo) {
    const [likes, dislikes] = await Promise.all([
        getRatesCount('like', video, fetchedVideo),
        getRatesCount('dislike', video, fetchedVideo)
    ]);
    return runInReadCommittedTransaction(async (t) => {
        await VideoModel.updateRatesOf(video.id, 'like', likes, t);
        await VideoModel.updateRatesOf(video.id, 'dislike', dislikes, t);
    });
}
async function getRatesCount(type, video, fetchedVideo) {
    const uri = type === 'like'
        ? fetchedVideo.likes
        : fetchedVideo.dislikes;
    if (!uri)
        return;
    logger.info('Sync %s of video %s', type, video.url);
    const { body } = await fetchAP(uri);
    if (isNaN(body.totalItems)) {
        logger.error('Cannot sync %s of video %s, totalItems is not a number', type, video.url, { body });
        return;
    }
    return body.totalItems;
}
function syncShares(video, fetchedVideo, isSync) {
    const uri = fetchedVideo.shares;
    if (!uri)
        return;
    if (!isSync) {
        return createJob({ uri, videoId: video.id, type: 'video-shares' });
    }
    const handler = items => addVideoShares(items, video);
    const cleaner = crawlStartDate => VideoShareModel.cleanOldSharesOf(video.id, crawlStartDate);
    return crawlCollectionPage(uri, handler, cleaner)
        .catch(err => logger.error('Cannot add shares of video %s.', video.uuid, Object.assign({ err, rootUrl: uri }, lTags(video.uuid, video.url))));
}
function syncComments(video, fetchedVideo, isSync) {
    const uri = fetchedVideo.comments;
    if (!uri)
        return;
    if (!isSync) {
        return createJob({ uri, videoId: video.id, type: 'video-comments' });
    }
    const handler = items => addVideoComments(items);
    const cleaner = crawlStartDate => VideoCommentModel.cleanOldCommentsOf(video.id, crawlStartDate);
    return crawlCollectionPage(uri, handler, cleaner)
        .catch(err => logger.error('Cannot add comments of video %s.', video.uuid, Object.assign({ err, rootUrl: uri }, lTags(video.uuid, video.url))));
}
function createJob(payload) {
    return JobQueue.Instance.createJob({ type: 'activitypub-http-fetcher', payload });
}
//# sourceMappingURL=video-sync-attributes.js.map