import { sanitizeAndCheckVideoTorrentObject } from '../../../../helpers/custom-validators/activitypub/videos.js';
import { logger, loggerTagsFactory } from '../../../../helpers/logger.js';
import { fetchAP } from '../../activity.js';
import { checkUrlsSameHost } from '../../url.js';
const lTags = loggerTagsFactory('ap', 'video');
async function fetchRemoteVideo(videoUrl) {
    logger.info('Fetching remote video %s.', videoUrl, lTags(videoUrl));
    const { statusCode, body } = await fetchAP(videoUrl);
    if (sanitizeAndCheckVideoTorrentObject(body) === false || checkUrlsSameHost(body.id, videoUrl) !== true) {
        logger.debug('Remote video JSON is not valid.', Object.assign({ body }, lTags(videoUrl)));
        return { statusCode, videoObject: undefined };
    }
    return { statusCode, videoObject: body };
}
export { fetchRemoteVideo };
//# sourceMappingURL=url-to-object.js.map