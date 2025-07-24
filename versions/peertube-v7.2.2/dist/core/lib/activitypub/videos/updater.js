import { VideoPrivacy } from '@peertube/peertube-models';
import { resetSequelizeInstance, runInReadCommittedTransaction } from '../../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { Notifier } from '../../notifier/index.js';
import { PeerTubeSocket } from '../../peertube-socket.js';
import { Hooks } from '../../plugins/hooks.js';
import { autoBlacklistVideoIfNeeded } from '../../video-blacklist.js';
import { VideoLiveModel } from '../../../models/video/video-live.js';
import { haveActorsSameRemoteHost } from '../actors/check-actor.js';
import { APVideoAbstractBuilder, getVideoAttributesFromObject, updateVideoRates } from './shared/index.js';
export class APVideoUpdater extends APVideoAbstractBuilder {
    constructor(videoObject, video) {
        super();
        this.videoObject = videoObject;
        this.video = video;
        this.wasPrivateVideo = this.video.privacy === VideoPrivacy.PRIVATE;
        this.wasUnlistedVideo = this.video.privacy === VideoPrivacy.UNLISTED;
        this.oldVideoChannel = this.video.VideoChannel;
        this.lTags = loggerTagsFactory('ap', 'video', 'update', video.uuid, video.url);
    }
    async update(overrideTo) {
        logger.debug('Updating remote video "%s".', this.videoObject.uuid, Object.assign({ videoObject: this.videoObject }, this.lTags()));
        const oldInputFileUpdatedAt = this.video.inputFileUpdatedAt;
        try {
            const channelActor = await this.getOrCreateVideoChannelFromVideoObject();
            this.checkChannelUpdateOrThrow(channelActor);
            const oldState = this.video.state;
            const oldVideo = { name: this.video.name, description: this.video.description };
            const videoUpdated = await this.updateVideo(channelActor.VideoChannel, undefined, overrideTo);
            await runInReadCommittedTransaction(async (t) => {
                await this.setWebVideoFiles(videoUpdated, t);
                await this.setStreamingPlaylists(videoUpdated, t);
            });
            await Promise.all([
                runInReadCommittedTransaction(t => this.setTags(videoUpdated, t)),
                runInReadCommittedTransaction(t => this.setTrackers(videoUpdated, t)),
                runInReadCommittedTransaction(t => this.setStoryboard(videoUpdated, t)),
                runInReadCommittedTransaction(t => this.setAutomaticTags({ video: videoUpdated, transaction: t, oldVideo })),
                runInReadCommittedTransaction(t => {
                    return Promise.all([
                        this.setPreview(videoUpdated, t),
                        this.setThumbnail(videoUpdated, t)
                    ]);
                }),
                this.setOrDeleteLive(videoUpdated)
            ]);
            await runInReadCommittedTransaction(t => this.setCaptions(videoUpdated, t));
            await this.updateChaptersOutsideTransaction(videoUpdated);
            await autoBlacklistVideoIfNeeded({
                video: videoUpdated,
                user: undefined,
                isRemote: true,
                isNew: false,
                isNewFile: oldInputFileUpdatedAt !== videoUpdated.inputFileUpdatedAt,
                transaction: undefined
            });
            await updateVideoRates(videoUpdated, this.videoObject);
            if (this.wasPrivateVideo || this.wasUnlistedVideo) {
                Notifier.Instance.notifyOnNewVideoOrLiveIfNeeded(videoUpdated);
            }
            if (videoUpdated.isLive && oldState !== videoUpdated.state) {
                PeerTubeSocket.Instance.sendVideoLiveNewState(videoUpdated);
                Notifier.Instance.notifyOnNewVideoOrLiveIfNeeded(videoUpdated);
            }
            Hooks.runAction('action:activity-pub.remote-video.updated', { video: videoUpdated, videoAPObject: this.videoObject });
            logger.info('Remote video with uuid %s updated', this.videoObject.uuid, this.lTags());
            return videoUpdated;
        }
        catch (err) {
            await this.catchUpdateError(err);
        }
    }
    checkChannelUpdateOrThrow(newChannelActor) {
        if (haveActorsSameRemoteHost(this.oldVideoChannel.Actor, newChannelActor) !== true) {
            throw new Error(`Actor ${this.oldVideoChannel.Actor.url} is not on the same host as ${newChannelActor.url}`);
        }
    }
    updateVideo(channel, transaction, overrideTo) {
        const to = overrideTo || this.videoObject.to;
        const videoData = getVideoAttributesFromObject(channel, this.videoObject, to);
        this.video.name = videoData.name;
        this.video.uuid = videoData.uuid;
        this.video.url = videoData.url;
        this.video.category = videoData.category;
        this.video.licence = videoData.licence;
        this.video.language = videoData.language;
        this.video.description = videoData.description;
        this.video.support = videoData.support;
        this.video.nsfw = videoData.nsfw;
        this.video.nsfwSummary = videoData.nsfwSummary;
        this.video.nsfwFlags = videoData.nsfwFlags;
        this.video.commentsPolicy = videoData.commentsPolicy;
        this.video.downloadEnabled = videoData.downloadEnabled;
        this.video.waitTranscoding = videoData.waitTranscoding;
        this.video.state = videoData.state;
        this.video.duration = videoData.duration;
        this.video.createdAt = videoData.createdAt;
        this.video.publishedAt = videoData.publishedAt;
        this.video.originallyPublishedAt = videoData.originallyPublishedAt;
        this.video.inputFileUpdatedAt = videoData.inputFileUpdatedAt;
        this.video.privacy = videoData.privacy;
        this.video.channelId = videoData.channelId;
        this.video.views = videoData.views;
        this.video.isLive = videoData.isLive;
        this.video.aspectRatio = videoData.aspectRatio;
        this.video.changed('updatedAt', true);
        return this.video.save({ transaction });
    }
    async setCaptions(videoUpdated, t) {
        await this.insertOrReplaceCaptions(videoUpdated, t);
    }
    async setStoryboard(videoUpdated, t) {
        await this.insertOrReplaceStoryboard(videoUpdated, t);
    }
    async setOrDeleteLive(videoUpdated, transaction) {
        if (!this.video.isLive)
            return;
        if (this.video.isLive)
            return this.insertOrReplaceLive(videoUpdated, transaction);
        await VideoLiveModel.destroy({
            where: {
                videoId: this.video.id
            },
            transaction
        });
        videoUpdated.VideoLive = null;
    }
    async catchUpdateError(err) {
        if (this.video !== undefined) {
            await resetSequelizeInstance(this.video);
        }
        logger.debug('Cannot update the remote video.', Object.assign({ err }, this.lTags()));
        throw err;
    }
}
//# sourceMappingURL=updater.js.map