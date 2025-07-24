import { VideoChannelModel } from '../models/video/video-channel.js';
import { VideoModel } from '../models/video/video.js';
import { getLocalVideoChannelActivityPubUrl } from './activitypub/url.js';
import { federateVideoIfNeeded } from './activitypub/videos/index.js';
import { buildActorInstance } from './local-actor.js';
async function createLocalVideoChannelWithoutKeys(videoChannelInfo, account, t) {
    const url = getLocalVideoChannelActivityPubUrl(videoChannelInfo.name);
    const actorInstance = buildActorInstance('Group', url, videoChannelInfo.name);
    const actorInstanceCreated = await actorInstance.save({ transaction: t });
    const videoChannelData = {
        name: videoChannelInfo.displayName,
        description: videoChannelInfo.description,
        support: videoChannelInfo.support,
        accountId: account.id,
        actorId: actorInstanceCreated.id
    };
    const videoChannel = new VideoChannelModel(videoChannelData);
    const options = { transaction: t };
    const videoChannelCreated = await videoChannel.save(options);
    videoChannelCreated.Actor = actorInstanceCreated;
    return videoChannelCreated;
}
async function federateAllVideosOfChannel(videoChannel) {
    const videoIds = await VideoModel.getAllIdsFromChannel(videoChannel);
    for (const videoId of videoIds) {
        const video = await VideoModel.loadFull(videoId);
        await federateVideoIfNeeded(video, false);
    }
}
export { createLocalVideoChannelWithoutKeys, federateAllVideosOfChannel };
//# sourceMappingURL=video-channel.js.map