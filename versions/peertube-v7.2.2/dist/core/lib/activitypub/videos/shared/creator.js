import { logger, loggerTagsFactory } from '../../../../helpers/logger.js';
import { sequelizeTypescript } from '../../../../initializers/database.js';
import { Hooks } from '../../../plugins/hooks.js';
import { autoBlacklistVideoIfNeeded } from '../../../video-blacklist.js';
import { VideoModel } from '../../../../models/video/video.js';
import { APVideoAbstractBuilder } from './abstract-builder.js';
import { getVideoAttributesFromObject } from './object-to-model-attributes.js';
export class APVideoCreator extends APVideoAbstractBuilder {
    constructor(videoObject) {
        super();
        this.videoObject = videoObject;
        this.lTags = loggerTagsFactory('ap', 'video', 'create', this.videoObject.uuid, this.videoObject.id);
    }
    async create() {
        logger.debug('Adding remote video %s.', this.videoObject.id, Object.assign(Object.assign({}, this.videoObject), this.lTags()));
        const channelActor = await this.getOrCreateVideoChannelFromVideoObject();
        const channel = channelActor.VideoChannel;
        channel.Actor = channelActor;
        const videoData = getVideoAttributesFromObject(channel, this.videoObject, this.videoObject.to);
        const video = VideoModel.build(Object.assign(Object.assign({}, videoData), { likes: 0, dislikes: 0 }));
        const { autoBlacklisted, videoCreated } = await sequelizeTypescript.transaction(async (t) => {
            const videoCreated = await video.save({ transaction: t });
            videoCreated.VideoChannel = channel;
            await this.setThumbnail(videoCreated, t);
            await this.setPreview(videoCreated, t);
            await this.setWebVideoFiles(videoCreated, t);
            await this.setStreamingPlaylists(videoCreated, t);
            await this.setTags(videoCreated, t);
            await this.setTrackers(videoCreated, t);
            await this.insertOrReplaceCaptions(videoCreated, t);
            await this.insertOrReplaceLive(videoCreated, t);
            await this.insertOrReplaceStoryboard(videoCreated, t);
            await this.setAutomaticTags({ video: videoCreated, transaction: t });
            await channel.setAsUpdated(t);
            const autoBlacklisted = await autoBlacklistVideoIfNeeded({
                video: videoCreated,
                user: undefined,
                isRemote: true,
                isNew: true,
                isNewFile: true,
                transaction: t
            });
            logger.info('Remote video with uuid %s inserted.', this.videoObject.uuid, this.lTags());
            Hooks.runAction('action:activity-pub.remote-video.created', { video: videoCreated, videoAPObject: this.videoObject });
            return { autoBlacklisted, videoCreated };
        });
        await this.updateChaptersOutsideTransaction(videoCreated);
        return { autoBlacklisted, videoCreated };
    }
}
//# sourceMappingURL=creator.js.map