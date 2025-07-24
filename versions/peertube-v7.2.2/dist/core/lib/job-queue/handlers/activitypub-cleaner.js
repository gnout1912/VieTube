import Bluebird from 'bluebird';
import { isAnnounceActivityValid, isDislikeActivityValid, isLikeActivityValid } from '../../../helpers/custom-validators/activitypub/activity.js';
import { sanitizeAndCheckVideoCommentObject } from '../../../helpers/custom-validators/activitypub/video-comments.js';
import { AP_CLEANER } from '../../../initializers/constants.js';
import { fetchAP } from '../../activitypub/activity.js';
import { checkUrlsSameHost } from '../../activitypub/url.js';
import { Redis } from '../../redis.js';
import { VideoCommentModel } from '../../../models/video/video-comment.js';
import { VideoShareModel } from '../../../models/video/video-share.js';
import { VideoModel } from '../../../models/video/video.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { AccountVideoRateModel } from '../../../models/account/account-video-rate.js';
const lTags = loggerTagsFactory('ap-cleaner');
async function processActivityPubCleaner(_job) {
    logger.info('Processing ActivityPub cleaner.', lTags());
    {
        const rateUrls = await AccountVideoRateModel.listRemoteRateUrlsOfLocalVideos();
        const { bodyValidator, deleter, updater } = rateOptionsFactory();
        await Bluebird.map(rateUrls, async (rateUrl) => {
            if (rateUrl.includes('#'))
                return;
            const result = await updateObjectIfNeeded({ url: rateUrl, bodyValidator, updater, deleter });
            if ((result === null || result === void 0 ? void 0 : result.status) === 'deleted') {
                const { videoId, type } = result.data;
                await VideoModel.syncLocalRates(videoId, type, undefined);
            }
        }, { concurrency: AP_CLEANER.CONCURRENCY });
    }
    {
        const shareUrls = await VideoShareModel.listRemoteShareUrlsOfLocalVideos();
        const { bodyValidator, deleter, updater } = shareOptionsFactory();
        await Bluebird.map(shareUrls, async (shareUrl) => {
            await updateObjectIfNeeded({ url: shareUrl, bodyValidator, updater, deleter });
        }, { concurrency: AP_CLEANER.CONCURRENCY });
    }
    {
        const commentUrls = await VideoCommentModel.listRemoteCommentUrlsOfLocalVideos();
        const { bodyValidator, deleter, updater } = commentOptionsFactory();
        await Bluebird.map(commentUrls, async (commentUrl) => {
            await updateObjectIfNeeded({ url: commentUrl, bodyValidator, updater, deleter });
        }, { concurrency: AP_CLEANER.CONCURRENCY });
    }
}
export { processActivityPubCleaner };
async function updateObjectIfNeeded(options) {
    const { url, bodyValidator, updater, deleter } = options;
    const on404OrTombstone = async () => {
        logger.info('Removing remote AP object %s.', url, lTags(url));
        const data = await deleter(url);
        return { status: 'deleted', data };
    };
    try {
        const { body } = await fetchAP(url);
        if (!(body === null || body === void 0 ? void 0 : body.id) || !bodyValidator(body))
            throw new Error(`Body or body id of ${url} is invalid`);
        if (body.type === 'Tombstone') {
            return on404OrTombstone();
        }
        const newUrl = body.id;
        if (newUrl !== url) {
            if (checkUrlsSameHost(newUrl, url) !== true) {
                throw new Error(`New url ${newUrl} has not the same host than old url ${url}`);
            }
            logger.info('Updating remote AP object %s.', url, lTags(url));
            const data = await updater(url, newUrl);
            return { status: 'updated', data };
        }
        return null;
    }
    catch (err) {
        if (err.statusCode === HttpStatusCode.NOT_FOUND_404) {
            return on404OrTombstone();
        }
        logger.debug('Remote AP object %s is unavailable.', url, lTags(url));
        const unavailability = await Redis.Instance.addAPUnavailability(url);
        if (unavailability >= AP_CLEANER.UNAVAILABLE_TRESHOLD) {
            logger.info('Removing unavailable AP resource %s.', url, lTags(url));
            return on404OrTombstone();
        }
        return null;
    }
}
function rateOptionsFactory() {
    return {
        bodyValidator: (body) => isLikeActivityValid(body) || isDislikeActivityValid(body),
        updater: async (url, newUrl) => {
            const rate = await AccountVideoRateModel.loadByUrl(url, undefined);
            rate.url = newUrl;
            const videoId = rate.videoId;
            const type = rate.type;
            await rate.save();
            return { videoId, type };
        },
        deleter: async (url) => {
            const rate = await AccountVideoRateModel.loadByUrl(url, undefined);
            const videoId = rate.videoId;
            const type = rate.type;
            await rate.destroy();
            return { videoId, type };
        }
    };
}
function shareOptionsFactory() {
    return {
        bodyValidator: (body) => isAnnounceActivityValid(body),
        updater: async (url, newUrl) => {
            const share = await VideoShareModel.loadByUrl(url, undefined);
            share.url = newUrl;
            await share.save();
            return undefined;
        },
        deleter: async (url) => {
            const share = await VideoShareModel.loadByUrl(url, undefined);
            await share.destroy();
            return undefined;
        }
    };
}
function commentOptionsFactory() {
    return {
        bodyValidator: (body) => sanitizeAndCheckVideoCommentObject(body),
        updater: async (url, newUrl) => {
            const comment = await VideoCommentModel.loadByUrlAndPopulateAccountAndVideoAndReply(url);
            comment.url = newUrl;
            await comment.save();
            return undefined;
        },
        deleter: async (url) => {
            const comment = await VideoCommentModel.loadByUrlAndPopulateAccountAndVideoAndReply(url);
            await comment.destroy();
            return undefined;
        }
    };
}
//# sourceMappingURL=activitypub-cleaner.js.map