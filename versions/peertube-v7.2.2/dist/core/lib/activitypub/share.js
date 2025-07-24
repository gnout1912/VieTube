import { getServerActor } from '../../models/application/application.js';
import Bluebird from 'bluebird';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { CRAWL_REQUEST_CONCURRENCY } from '../../initializers/constants.js';
import { VideoShareModel } from '../../models/video/video-share.js';
import { fetchAP, getAPId } from './activity.js';
import { getOrCreateAPActor } from './actors/index.js';
import { sendUndoAnnounce, sendVideoAnnounce } from './send/index.js';
import { checkUrlsSameHost, getLocalVideoAnnounceActivityPubUrl } from './url.js';
import { HttpStatusCode } from '@peertube/peertube-models';
const lTags = loggerTagsFactory('share');
export async function changeVideoChannelShare(video, oldVideoChannel, t) {
    logger.info('Updating video channel of video %s: %s -> %s.', video.uuid, oldVideoChannel.name, video.VideoChannel.name, lTags(video.uuid));
    await undoShareByVideoChannel(video, oldVideoChannel, t);
    await shareByVideoChannel(video, t);
}
export async function addVideoShares(shareUrls, video) {
    await Bluebird.map(shareUrls, async (shareUrl) => {
        try {
            await addVideoShare(shareUrl, video);
        }
        catch (err) {
            if (err.statusCode === HttpStatusCode.NOT_FOUND_404 || err.statusCode === HttpStatusCode.GONE_410) {
                logger.debug(`Cannot add share ${shareUrl} that does not exist anymore`, { err });
                return;
            }
            logger.info(`Cannot add share ${shareUrl}`, { err });
        }
    }, { concurrency: CRAWL_REQUEST_CONCURRENCY });
}
export async function shareByServer(video, t) {
    const serverActor = await getServerActor();
    const serverShareUrl = getLocalVideoAnnounceActivityPubUrl(serverActor, video);
    const [serverShare] = await VideoShareModel.findOrCreate({
        defaults: {
            actorId: serverActor.id,
            videoId: video.id,
            url: serverShareUrl
        },
        where: {
            url: serverShareUrl
        },
        transaction: t
    });
    return sendVideoAnnounce(serverActor, serverShare, video, t);
}
export async function shareByVideoChannel(video, t) {
    const videoChannelShareUrl = getLocalVideoAnnounceActivityPubUrl(video.VideoChannel.Actor, video);
    const [videoChannelShare] = await VideoShareModel.findOrCreate({
        defaults: {
            actorId: video.VideoChannel.actorId,
            videoId: video.id,
            url: videoChannelShareUrl
        },
        where: {
            url: videoChannelShareUrl
        },
        transaction: t
    });
    return sendVideoAnnounce(video.VideoChannel.Actor, videoChannelShare, video, t);
}
async function addVideoShare(shareUrl, video) {
    const { body } = await fetchAP(shareUrl);
    if (!(body === null || body === void 0 ? void 0 : body.actor))
        throw new Error('Body or body actor is invalid');
    const actorUrl = getAPId(body.actor);
    if (checkUrlsSameHost(shareUrl, actorUrl) !== true) {
        throw new Error(`Actor url ${actorUrl} has not the same host than the share url ${shareUrl}`);
    }
    const actor = await getOrCreateAPActor(actorUrl);
    const entry = {
        actorId: actor.id,
        videoId: video.id,
        url: shareUrl
    };
    await VideoShareModel.upsert(entry);
}
async function undoShareByVideoChannel(video, oldVideoChannel, t) {
    const oldShare = await VideoShareModel.load(oldVideoChannel.actorId, video.id, t);
    if (!oldShare)
        return new Error('Cannot find old video channel share ' + oldVideoChannel.actorId + ' for video ' + video.id);
    await sendUndoAnnounce(oldVideoChannel.Actor, oldShare, video, t);
    await oldShare.destroy({ transaction: t });
}
//# sourceMappingURL=share.js.map