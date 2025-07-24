import { pick } from '@peertube/peertube-core-utils';
import { FileStorage, VideoCommentPolicy, VideoPrivacy } from '@peertube/peertube-models';
import { logger } from '../../../helpers/logger.js';
import { USER_EXPORT_MAX_ITEMS } from '../../../initializers/constants.js';
import { audiencify, getAudience } from '../../activitypub/audience.js';
import { buildCreateActivity } from '../../activitypub/send/send-create.js';
import { buildChaptersAPHasPart } from '../../activitypub/video-chapters.js';
import { getCaptionReadStream, getHLSFileReadStream, getOriginalFileReadStream, getWebVideoFileReadStream } from '../../object-storage/videos.js';
import { VideoDownload } from '../../video-download.js';
import { VideoPathManager } from '../../video-path-manager.js';
import { VideoCaptionModel } from '../../../models/video/video-caption.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { VideoChapterModel } from '../../../models/video/video-chapter.js';
import { VideoLiveModel } from '../../../models/video/video-live.js';
import { VideoPasswordModel } from '../../../models/video/video-password.js';
import { VideoSourceModel } from '../../../models/video/video-source.js';
import { VideoModel } from '../../../models/video/video.js';
import Bluebird from 'bluebird';
import { createReadStream } from 'fs';
import { extname, join } from 'path';
import { PassThrough } from 'stream';
import { AbstractUserExporter } from './abstract-user-exporter.js';
export class VideosExporter extends AbstractUserExporter {
    constructor(options) {
        super(options);
        this.options = options;
    }
    async export() {
        const videosJSON = [];
        const activityPubOutbox = [];
        let staticFiles = [];
        const channels = await VideoChannelModel.listAllByAccount(this.user.Account.id);
        for (const channel of channels) {
            const videoIds = await VideoModel.getAllIdsFromChannel(channel, USER_EXPORT_MAX_ITEMS);
            await Bluebird.map(videoIds, async (id) => {
                try {
                    const exported = await this.exportVideo(id);
                    videosJSON.push(exported.json);
                    staticFiles = staticFiles.concat(exported.staticFiles);
                    activityPubOutbox.push(exported.activityPubOutbox);
                }
                catch (err) {
                    logger.warn('Cannot export video %d.', id, { err });
                }
            }, { concurrency: 10 });
        }
        return {
            json: { videos: videosJSON },
            activityPubOutbox,
            staticFiles
        };
    }
    async exportVideo(videoId) {
        const [video, captions, source, chapters] = await Promise.all([
            VideoModel.loadFull(videoId),
            VideoCaptionModel.listVideoCaptions(videoId),
            VideoSourceModel.loadLatest(videoId),
            VideoChapterModel.listChaptersOfVideo(videoId)
        ]);
        const passwords = video.privacy === VideoPrivacy.PASSWORD_PROTECTED
            ? (await VideoPasswordModel.listPasswords({ videoId, start: 0, count: undefined, sort: 'createdAt' })).data
            : [];
        const live = video.isLive
            ? await VideoLiveModel.loadByVideoIdWithSettings(videoId)
            : undefined;
        video.VideoCaptions = captions;
        const videoAP = await video.lightAPToFullAP(undefined);
        const { relativePathsFromJSON, staticFiles, exportedVideoFileOrSource } = await this.exportVideoFiles({ video, captions });
        return {
            json: this.exportVideoJSON({ video, captions, live, passwords, source, chapters, archiveFiles: relativePathsFromJSON }),
            staticFiles,
            relativePathsFromJSON,
            activityPubOutbox: await this.exportVideoAP(videoAP, chapters, exportedVideoFileOrSource)
        };
    }
    exportVideoJSON(options) {
        var _a, _b;
        const { video, captions, live, passwords, source, chapters, archiveFiles } = options;
        return {
            uuid: video.uuid,
            createdAt: video.createdAt.toISOString(),
            updatedAt: video.updatedAt.toISOString(),
            publishedAt: video.publishedAt.toISOString(),
            originallyPublishedAt: video.originallyPublishedAt
                ? video.originallyPublishedAt.toISOString()
                : undefined,
            name: video.name,
            category: video.category,
            licence: video.licence,
            language: video.language,
            tags: video.Tags.map(t => t.name),
            privacy: video.privacy,
            passwords: passwords.map(p => p.password),
            duration: video.duration,
            description: video.description,
            support: video.support,
            isLive: video.isLive,
            live: this.exportLiveJSON(video, live),
            url: video.url,
            thumbnailUrl: ((_a = video.getMiniature()) === null || _a === void 0 ? void 0 : _a.getOriginFileUrl(video)) || null,
            previewUrl: ((_b = video.getPreview()) === null || _b === void 0 ? void 0 : _b.getOriginFileUrl(video)) || null,
            views: video.views,
            likes: video.likes,
            dislikes: video.dislikes,
            nsfw: video.nsfw,
            commentsPolicy: video.commentsPolicy,
            commentsEnabled: video.commentsPolicy !== VideoCommentPolicy.DISABLED,
            downloadEnabled: video.downloadEnabled,
            waitTranscoding: video.waitTranscoding,
            state: video.state,
            channel: {
                name: video.VideoChannel.Actor.preferredUsername
            },
            captions: this.exportCaptionsJSON(video, captions),
            chapters: this.exportChaptersJSON(chapters),
            files: this.exportFilesJSON(video, video.VideoFiles),
            streamingPlaylists: this.exportStreamingPlaylistsJSON(video, video.VideoStreamingPlaylists),
            source: this.exportVideoSourceJSON(source),
            archiveFiles
        };
    }
    exportLiveJSON(video, live) {
        if (!video.isLive)
            return undefined;
        return {
            saveReplay: live.saveReplay,
            permanentLive: live.permanentLive,
            latencyMode: live.latencyMode,
            streamKey: live.streamKey,
            replaySettings: live.ReplaySetting
                ? { privacy: live.ReplaySetting.privacy }
                : undefined
        };
    }
    exportCaptionsJSON(video, captions) {
        return captions.map(c => ({
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            language: c.language,
            filename: c.filename,
            automaticallyGenerated: c.automaticallyGenerated,
            fileUrl: c.getFileUrl(video)
        }));
    }
    exportChaptersJSON(chapters) {
        return chapters.map(c => ({
            timecode: c.timecode,
            title: c.title
        }));
    }
    exportFilesJSON(video, files) {
        return files.map(f => ({
            resolution: f.resolution,
            size: f.size,
            fps: f.fps,
            torrentUrl: f.getTorrentUrl(),
            fileUrl: f.getFileUrl(video)
        }));
    }
    exportStreamingPlaylistsJSON(video, streamingPlaylists) {
        return streamingPlaylists.map(p => ({
            type: p.type,
            playlistUrl: p.getMasterPlaylistUrl(video),
            segmentsSha256Url: p.getSha256SegmentsUrl(video),
            files: this.exportFilesJSON(video, p.VideoFiles)
        }));
    }
    exportVideoSourceJSON(source) {
        if (!source)
            return null;
        return {
            inputFilename: source.inputFilename,
            resolution: source.resolution,
            size: source.size,
            width: source.width,
            height: source.height,
            fps: source.fps,
            metadata: source.metadata
        };
    }
    async exportVideoAP(video, chapters, exportedVideoFileOrSource) {
        const icon = video.getPreview();
        const audience = getAudience(video.VideoChannel.Account.Actor, video.privacy === VideoPrivacy.PUBLIC);
        const videoObject = Object.assign(Object.assign({}, audiencify(await video.toActivityPubObject(), audience)), { icon: [
                Object.assign(Object.assign({}, icon.toActivityPubObject(video)), { url: join(this.options.relativeStaticDirPath, this.getArchiveThumbnailFilePath(video, icon)) })
            ], subtitleLanguage: video.VideoCaptions.map(c => (Object.assign(Object.assign({}, c.toActivityPubObject(video)), { url: join(this.options.relativeStaticDirPath, this.getArchiveCaptionFilePath(video, c)) }))), hasParts: buildChaptersAPHasPart(video, chapters), attachment: this.options.withVideoFiles && exportedVideoFileOrSource
                ? [
                    Object.assign({ type: 'Video', url: join(this.options.relativeStaticDirPath, this.getArchiveVideoFilePath(video, exportedVideoFileOrSource)) }, pick(exportedVideoFileOrSource.toActivityPubObject(video), [
                        'mediaType',
                        'height',
                        'size',
                        'fps'
                    ]))
                ]
                : undefined });
        return buildCreateActivity(video.url, video.VideoChannel.Account.Actor, videoObject, audience);
    }
    async exportVideoFiles(options) {
        const { video, captions } = options;
        const staticFiles = [];
        let exportedVideoFileOrSource;
        const relativePathsFromJSON = {
            videoFile: null,
            thumbnail: null,
            captions: {}
        };
        if (this.options.withVideoFiles) {
            const { source, videoFile, separatedAudioFile } = await this.getArchiveVideo(video);
            if (source || videoFile || separatedAudioFile) {
                const videoPath = this.getArchiveVideoFilePath(video, source || videoFile || separatedAudioFile);
                staticFiles.push({
                    archivePath: videoPath,
                    readStreamFactory: () => (source === null || source === void 0 ? void 0 : source.keptOriginalFilename)
                        ? this.generateVideoSourceReadStream(source)
                        : this.generateVideoFileReadStream({ video, videoFile, separatedAudioFile })
                });
                relativePathsFromJSON.videoFile = join(this.relativeStaticDirPath, videoPath);
                exportedVideoFileOrSource = (source === null || source === void 0 ? void 0 : source.keptOriginalFilename)
                    ? source
                    : videoFile || separatedAudioFile;
            }
        }
        for (const caption of captions) {
            staticFiles.push({
                archivePath: this.getArchiveCaptionFilePath(video, caption),
                readStreamFactory: () => this.generateCaptionReadStream(caption)
            });
            relativePathsFromJSON.captions[caption.language] = join(this.relativeStaticDirPath, this.getArchiveCaptionFilePath(video, caption));
        }
        const thumbnail = video.getPreview() || video.getMiniature();
        if (thumbnail) {
            staticFiles.push({
                archivePath: this.getArchiveThumbnailFilePath(video, thumbnail),
                readStreamFactory: () => Promise.resolve(createReadStream(thumbnail.getPath()))
            });
            relativePathsFromJSON.thumbnail = join(this.relativeStaticDirPath, this.getArchiveThumbnailFilePath(video, thumbnail));
        }
        return { staticFiles, relativePathsFromJSON, exportedVideoFileOrSource };
    }
    async generateVideoSourceReadStream(source) {
        if (source.storage === FileStorage.FILE_SYSTEM) {
            return createReadStream(VideoPathManager.Instance.getFSOriginalVideoFilePath(source.keptOriginalFilename));
        }
        const { stream } = await getOriginalFileReadStream({ keptOriginalFilename: source.keptOriginalFilename, rangeHeader: undefined });
        return stream;
    }
    async generateVideoFileReadStream(options) {
        const { video, videoFile, separatedAudioFile } = options;
        if (separatedAudioFile) {
            const stream = new PassThrough();
            new VideoDownload({ video, videoFiles: [videoFile, separatedAudioFile] })
                .muxToMergeVideoFiles(stream)
                .catch(err => logger.error('Cannot mux video files', { err }));
            return Promise.resolve(stream);
        }
        if (videoFile.storage === FileStorage.FILE_SYSTEM) {
            return createReadStream(VideoPathManager.Instance.getFSVideoFileOutputPath(video, videoFile));
        }
        const { stream } = videoFile.isHLS()
            ? await getHLSFileReadStream({ playlist: video.getHLSPlaylist(), filename: videoFile.filename, rangeHeader: undefined })
            : await getWebVideoFileReadStream({ filename: videoFile.filename, rangeHeader: undefined });
        return stream;
    }
    async generateCaptionReadStream(caption) {
        if (caption.storage === FileStorage.FILE_SYSTEM) {
            return createReadStream(caption.getFSFilePath());
        }
        const { stream } = await getCaptionReadStream({ filename: caption.filename, rangeHeader: undefined });
        return stream;
    }
    async getArchiveVideo(video) {
        const source = await VideoSourceModel.loadLatest(video.id);
        const { videoFile, separatedAudioFile } = video.getMaxQualityAudioAndVideoFiles();
        if (source === null || source === void 0 ? void 0 : source.keptOriginalFilename)
            return { source };
        return { videoFile, separatedAudioFile };
    }
    getArchiveVideoFilePath(video, file) {
        return join('video-files', video.uuid + extname(file.keptOriginalFilename || file.filename));
    }
    getArchiveCaptionFilePath(video, caption) {
        return join('captions', video.uuid + '-' + caption.language + extname(caption.filename));
    }
    getArchiveThumbnailFilePath(video, thumbnail) {
        return join('thumbnails', video.uuid + extname(thumbnail.filename));
    }
}
//# sourceMappingURL=videos-exporter.js.map