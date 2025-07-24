import { ThumbnailType } from '@peertube/peertube-models';
import { isVideoChaptersObjectValid } from '../../../../helpers/custom-validators/activitypub/video-chapters.js';
import { deleteAllModels, filterNonExistingModels, retryTransactionWrapper } from '../../../../helpers/database-utils.js';
import { logger } from '../../../../helpers/logger.js';
import { sequelizeTypescript } from '../../../../initializers/database.js';
import { AutomaticTagger } from '../../../automatic-tags/automatic-tagger.js';
import { setAndSaveVideoAutomaticTags } from '../../../automatic-tags/automatic-tags.js';
import { updateRemoteVideoThumbnail } from '../../../thumbnail.js';
import { replaceChapters } from '../../../video-chapters.js';
import { setVideoTags } from '../../../video.js';
import { StoryboardModel } from '../../../../models/video/storyboard.js';
import { VideoCaptionModel } from '../../../../models/video/video-caption.js';
import { VideoFileModel } from '../../../../models/video/video-file.js';
import { VideoLiveModel } from '../../../../models/video/video-live.js';
import { VideoStreamingPlaylistModel } from '../../../../models/video/video-streaming-playlist.js';
import { fetchAP } from '../../activity.js';
import { findOwner, getOrCreateAPActor } from '../../actors/index.js';
import { getCaptionAttributesFromObject, getFileAttributesFromUrl, getLiveAttributesFromObject, getPreviewFromIcons, getStoryboardAttributeFromObject, getStreamingPlaylistAttributesFromObject, getTagsFromObject, getThumbnailFromIcons } from './object-to-model-attributes.js';
import { getTrackerUrls, setVideoTrackers } from './trackers.js';
export class APVideoAbstractBuilder {
    async getOrCreateVideoChannelFromVideoObject() {
        const channel = await findOwner(this.videoObject.id, this.videoObject.attributedTo, 'Group');
        if (!channel)
            throw new Error('Cannot find associated video channel to video ' + this.videoObject.id);
        return getOrCreateAPActor(channel.id, 'all');
    }
    async setThumbnail(video, t) {
        const miniatureIcon = getThumbnailFromIcons(this.videoObject);
        if (!miniatureIcon) {
            logger.warn('Cannot find thumbnail in video object', Object.assign({ object: this.videoObject }, this.lTags()));
            return undefined;
        }
        const miniatureModel = updateRemoteVideoThumbnail({
            fileUrl: miniatureIcon.url,
            video,
            type: ThumbnailType.MINIATURE,
            size: miniatureIcon,
            onDisk: false
        });
        await video.addAndSaveThumbnail(miniatureModel, t);
    }
    async setPreview(video, t) {
        const previewIcon = getPreviewFromIcons(this.videoObject);
        if (!previewIcon)
            return;
        const previewModel = updateRemoteVideoThumbnail({
            fileUrl: previewIcon.url,
            video,
            type: ThumbnailType.PREVIEW,
            size: previewIcon,
            onDisk: false
        });
        await video.addAndSaveThumbnail(previewModel, t);
    }
    async setTags(video, t) {
        const tags = getTagsFromObject(this.videoObject);
        await setVideoTags({ video, tags, transaction: t });
    }
    async setTrackers(video, t) {
        const trackers = getTrackerUrls(this.videoObject, video);
        await setVideoTrackers({ video, trackers, transaction: t });
    }
    async insertOrReplaceCaptions(video, t) {
        const existingCaptions = await VideoCaptionModel.listVideoCaptions(video.id, t);
        let captionsToCreate = getCaptionAttributesFromObject(video, this.videoObject)
            .map(a => new VideoCaptionModel(a));
        for (const existingCaption of existingCaptions) {
            const filtered = captionsToCreate.filter(c => !c.isEqual(existingCaption));
            if (filtered.length !== captionsToCreate.length) {
                captionsToCreate = filtered;
                continue;
            }
            await existingCaption.destroy({ transaction: t });
        }
        for (const captionToCreate of captionsToCreate) {
            await captionToCreate.save({ transaction: t });
        }
    }
    async insertOrReplaceStoryboard(video, t) {
        const existingStoryboard = await StoryboardModel.loadByVideo(video.id, t);
        if (existingStoryboard)
            await existingStoryboard.destroy({ transaction: t });
        const storyboardAttributes = getStoryboardAttributeFromObject(video, this.videoObject);
        if (!storyboardAttributes)
            return;
        return StoryboardModel.create(storyboardAttributes, { transaction: t });
    }
    async insertOrReplaceLive(video, transaction) {
        const attributes = getLiveAttributesFromObject(video, this.videoObject);
        const [videoLive] = await VideoLiveModel.upsert(attributes, { transaction, returning: true });
        video.VideoLive = videoLive;
    }
    async setWebVideoFiles(video, t) {
        const videoFileAttributes = getFileAttributesFromUrl(video, this.videoObject.url);
        const newVideoFiles = videoFileAttributes.map(a => new VideoFileModel(a));
        await deleteAllModels(filterNonExistingModels(video.VideoFiles || [], newVideoFiles), t);
        const upsertTasks = newVideoFiles.map(f => VideoFileModel.customUpsert(f, 'video', t));
        video.VideoFiles = await Promise.all(upsertTasks);
    }
    async updateChaptersOutsideTransaction(video) {
        if (!this.videoObject.hasParts || typeof this.videoObject.hasParts !== 'string')
            return;
        const { body } = await fetchAP(this.videoObject.hasParts);
        if (!isVideoChaptersObjectValid(body)) {
            logger.warn('Chapters AP object is not valid, skipping', Object.assign({ body }, this.lTags()));
            return;
        }
        logger.debug('Fetched chapters AP object', Object.assign({ body }, this.lTags()));
        return retryTransactionWrapper(() => {
            return sequelizeTypescript.transaction(async (t) => {
                const chapters = body.hasPart.map(p => ({ title: p.name, timecode: p.startOffset }));
                await replaceChapters({ chapters, transaction: t, video });
            });
        });
    }
    async setStreamingPlaylists(video, t) {
        const streamingPlaylistAttributes = getStreamingPlaylistAttributesFromObject(video, this.videoObject);
        const newStreamingPlaylists = streamingPlaylistAttributes.map(a => new VideoStreamingPlaylistModel(a));
        await deleteAllModels(filterNonExistingModels(video.VideoStreamingPlaylists || [], newStreamingPlaylists), t);
        const oldPlaylists = video.VideoStreamingPlaylists;
        video.VideoStreamingPlaylists = [];
        for (const playlistAttributes of streamingPlaylistAttributes) {
            const streamingPlaylistModel = await this.insertOrReplaceStreamingPlaylist(playlistAttributes, t);
            streamingPlaylistModel.Video = video;
            await this.setStreamingPlaylistFiles(oldPlaylists, streamingPlaylistModel, playlistAttributes.tagAPObject, t);
            video.VideoStreamingPlaylists.push(streamingPlaylistModel);
        }
    }
    async insertOrReplaceStreamingPlaylist(attributes, t) {
        const [streamingPlaylist] = await VideoStreamingPlaylistModel.upsert(attributes, { returning: true, transaction: t });
        return streamingPlaylist;
    }
    getStreamingPlaylistFiles(oldPlaylists, type) {
        const playlist = oldPlaylists.find(s => s.type === type);
        if (!playlist)
            return [];
        return playlist.VideoFiles;
    }
    async setStreamingPlaylistFiles(oldPlaylists, playlistModel, tagObjects, t) {
        const oldStreamingPlaylistFiles = this.getStreamingPlaylistFiles(oldPlaylists || [], playlistModel.type);
        const newVideoFiles = getFileAttributesFromUrl(playlistModel, tagObjects).map(a => new VideoFileModel(a));
        await deleteAllModels(filterNonExistingModels(oldStreamingPlaylistFiles, newVideoFiles), t);
        const upsertTasks = newVideoFiles.map(f => VideoFileModel.customUpsert(f, 'streaming-playlist', t));
        playlistModel.VideoFiles = await Promise.all(upsertTasks);
    }
    async setAutomaticTags(options) {
        const { video, transaction, oldVideo } = options;
        if (oldVideo && video.name === oldVideo.name && video.description === oldVideo.description)
            return;
        const automaticTags = await new AutomaticTagger().buildVideoAutomaticTags({ video, transaction });
        await setAndSaveVideoAutomaticTags({ video, automaticTags, transaction });
    }
}
//# sourceMappingURL=abstract-builder.js.map