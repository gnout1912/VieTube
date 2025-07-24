import { getAPId } from '../activity.js';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { VideoShareModel } from '../../../models/video/video-share.js';
import { Notifier } from '../../notifier/index.js';
import { forwardVideoRelatedActivity } from '../send/shared/send-utils.js';
import { maybeGetOrCreateAPVideo } from '../videos/index.js';
async function processAnnounceActivity(options) {
    const { activity, byActor: actorAnnouncer } = options;
    const notify = options.fromFetch !== true;
    if (actorAnnouncer.type !== 'Application' && actorAnnouncer.type !== 'Group')
        return;
    return retryTransactionWrapper(processVideoShare, actorAnnouncer, activity, notify);
}
export { processAnnounceActivity };
async function processVideoShare(actorAnnouncer, activity, notify) {
    const objectUri = getAPId(activity.object);
    const { video, created: videoCreated } = await maybeGetOrCreateAPVideo({ videoObject: objectUri });
    if (!video)
        return;
    await sequelizeTypescript.transaction(async (t) => {
        const share = {
            actorId: actorAnnouncer.id,
            videoId: video.id,
            url: activity.id
        };
        const [, created] = await VideoShareModel.findOrCreate({
            where: {
                url: activity.id
            },
            defaults: share,
            transaction: t
        });
        if (video.isOwned() && created === true) {
            const exceptions = [actorAnnouncer];
            await forwardVideoRelatedActivity(activity, t, exceptions, video);
        }
        return undefined;
    });
    if (videoCreated && notify)
        Notifier.Instance.notifyOnNewVideoOrLiveIfNeeded(video);
}
//# sourceMappingURL=process-announce.js.map