import { isAPVideoTrackerUrlObject } from '../../../../helpers/custom-validators/activitypub/videos.js';
import { isArray } from '../../../../helpers/custom-validators/misc.js';
import { REMOTE_SCHEME } from '../../../../initializers/constants.js';
import { TrackerModel } from '../../../../models/server/tracker.js';
import { buildRemoteUrl } from '../../url.js';
function getTrackerUrls(object, video) {
    let wsFound = false;
    const trackers = object.url.filter(u => isAPVideoTrackerUrlObject(u))
        .map((u) => {
        if (isArray(u.rel) && u.rel.includes('websocket'))
            wsFound = true;
        return u.href;
    });
    if (wsFound)
        return trackers;
    return [
        buildRemoteUrl(video, '/tracker/socket', REMOTE_SCHEME.WS),
        buildRemoteUrl(video, '/tracker/announce')
    ];
}
async function setVideoTrackers(options) {
    const { video, trackers, transaction } = options;
    const trackerInstances = await TrackerModel.findOrCreateTrackers(trackers, transaction);
    await video.$set('Trackers', trackerInstances, { transaction });
}
export { getTrackerUrls, setVideoTrackers };
//# sourceMappingURL=trackers.js.map