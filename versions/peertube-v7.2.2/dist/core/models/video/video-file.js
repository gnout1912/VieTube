var VideoFileModel_1;
import { __decorate, __metadata } from "tslib";
import { FileStorage, VideoFileFormatFlag, VideoFileStream, VideoResolution } from '@peertube/peertube-models';
import { logger } from '../../helpers/logger.js';
import { extractVideo } from '../../helpers/video.js';
import { CONFIG } from '../../initializers/config.js';
import { buildRemoteUrl } from '../../lib/activitypub/url.js';
import { getHLSPrivateFileUrl, getObjectStoragePublicFileUrl, getWebVideoPrivateFileUrl } from '../../lib/object-storage/index.js';
import { getFSTorrentFilePath } from '../../lib/paths.js';
import { getVideoFileMimeType } from '../../lib/video-file.js';
import { isVideoInPrivateDirectory } from '../../lib/video-privacy.js';
import { isStreamingPlaylist } from '../../types/models/index.js';
import { remove } from 'fs-extra/esm';
import memoizee from 'memoizee';
import { join } from 'path';
import { Op } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, DefaultScope, ForeignKey, Is, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import validator from 'validator';
import { isVideoFPSResolutionValid, isVideoFileExtnameValid, isVideoFileInfoHashValid, isVideoFileResolutionValid, isVideoFileSizeValid } from '../../helpers/custom-validators/videos.js';
import { DOWNLOAD_PATHS, LAZY_STATIC_PATHS, MEMOIZE_LENGTH, MEMOIZE_TTL, STATIC_PATHS, WEBSERVER } from '../../initializers/constants.js';
import { SequelizeModel, doesExist, parseAggregateResult, throwIfNotValid } from '../shared/index.js';
import { VideoStreamingPlaylistModel } from './video-streaming-playlist.js';
import { VideoModel } from './video.js';
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["WITH_VIDEO"] = "WITH_VIDEO";
    ScopeNames["WITH_METADATA"] = "WITH_METADATA";
    ScopeNames["WITH_VIDEO_OR_PLAYLIST"] = "WITH_VIDEO_OR_PLAYLIST";
})(ScopeNames || (ScopeNames = {}));
let VideoFileModel = VideoFileModel_1 = class VideoFileModel extends SequelizeModel {
    static doesInfohashExist(infoHash) {
        const query = 'SELECT 1 FROM "videoFile" WHERE "infoHash" = $infoHash LIMIT 1';
        return doesExist({ sequelize: this.sequelize, query, bind: { infoHash } });
    }
    static async doesVideoExistForVideoFile(id, videoIdOrUUID) {
        const videoFile = await VideoFileModel_1.loadWithVideoOrPlaylist(id, videoIdOrUUID);
        return !!videoFile;
    }
    static async doesOwnedTorrentFileExist(filename) {
        const query = 'SELECT 1 FROM "videoFile" ' +
            'LEFT JOIN "video" "webvideo" ON "webvideo"."id" = "videoFile"."videoId" AND "webvideo"."remote" IS FALSE ' +
            'LEFT JOIN "videoStreamingPlaylist" ON "videoStreamingPlaylist"."id" = "videoFile"."videoStreamingPlaylistId" ' +
            'LEFT JOIN "video" "hlsVideo" ON "hlsVideo"."id" = "videoStreamingPlaylist"."videoId" AND "hlsVideo"."remote" IS FALSE ' +
            'WHERE "torrentFilename" = $filename AND ("hlsVideo"."id" IS NOT NULL OR "webvideo"."id" IS NOT NULL) LIMIT 1';
        return doesExist({ sequelize: this.sequelize, query, bind: { filename } });
    }
    static async doesOwnedWebVideoFileExist(filename, storage) {
        const query = 'SELECT 1 FROM "videoFile" INNER JOIN "video" ON "video"."id" = "videoFile"."videoId" AND "video"."remote" IS FALSE ' +
            `WHERE "filename" = $filename AND "storage" = $storage LIMIT 1`;
        return doesExist({ sequelize: this.sequelize, query, bind: { filename, storage } });
    }
    static loadByFilename(filename) {
        const query = {
            where: {
                filename
            }
        };
        return VideoFileModel_1.findOne(query);
    }
    static loadWithVideoByFilename(filename) {
        const query = {
            where: {
                filename
            }
        };
        return VideoFileModel_1.scope(ScopeNames.WITH_VIDEO_OR_PLAYLIST).findOne(query);
    }
    static loadWithVideoOrPlaylistByTorrentFilename(filename) {
        const query = {
            where: {
                torrentFilename: filename
            }
        };
        return VideoFileModel_1.scope(ScopeNames.WITH_VIDEO_OR_PLAYLIST).findOne(query);
    }
    static load(id) {
        return VideoFileModel_1.findByPk(id);
    }
    static loadWithMetadata(id) {
        return VideoFileModel_1.scope(ScopeNames.WITH_METADATA).findByPk(id);
    }
    static loadWithVideo(id, transaction) {
        return VideoFileModel_1.scope(ScopeNames.WITH_VIDEO).findByPk(id, { transaction });
    }
    static loadWithVideoOrPlaylist(id, videoIdOrUUID) {
        const whereVideo = validator.default.isUUID(videoIdOrUUID + '')
            ? { uuid: videoIdOrUUID }
            : { id: videoIdOrUUID };
        const options = {
            where: {
                id
            }
        };
        return VideoFileModel_1.scope({ method: [ScopeNames.WITH_VIDEO_OR_PLAYLIST, { whereVideo }] })
            .findOne(options)
            .then(file => {
            if (!file)
                return null;
            if (!file.Video && !file.VideoStreamingPlaylist)
                return null;
            return file;
        });
    }
    static listByStreamingPlaylist(streamingPlaylistId, transaction) {
        const query = {
            include: [
                {
                    model: VideoStreamingPlaylistModel.unscoped(),
                    required: true,
                    where: {
                        id: streamingPlaylistId
                    }
                }
            ],
            transaction
        };
        return VideoFileModel_1.findAll(query);
    }
    static getStats() {
        const webVideoFilesQuery = {
            include: [
                {
                    attributes: [],
                    required: true,
                    model: VideoModel.unscoped(),
                    where: {
                        remote: false
                    }
                }
            ]
        };
        const hlsFilesQuery = {
            include: [
                {
                    attributes: [],
                    required: true,
                    model: VideoStreamingPlaylistModel.unscoped(),
                    include: [
                        {
                            attributes: [],
                            model: VideoModel.unscoped(),
                            required: true,
                            where: {
                                remote: false
                            }
                        }
                    ]
                }
            ]
        };
        return Promise.all([
            VideoFileModel_1.aggregate('size', 'SUM', webVideoFilesQuery),
            VideoFileModel_1.aggregate('size', 'SUM', hlsFilesQuery)
        ]).then(([webVideoResult, hlsResult]) => ({
            totalLocalVideoFilesSize: parseAggregateResult(webVideoResult) + parseAggregateResult(hlsResult)
        }));
    }
    static async customUpsert(videoFile, mode, transaction) {
        const baseFind = {
            fps: videoFile.fps,
            resolution: videoFile.resolution,
            transaction
        };
        const element = mode === 'streaming-playlist'
            ? await VideoFileModel_1.loadHLSFile(Object.assign(Object.assign({}, baseFind), { playlistId: videoFile.videoStreamingPlaylistId }))
            : await VideoFileModel_1.loadWebVideoFile(Object.assign(Object.assign({}, baseFind), { videoId: videoFile.videoId }));
        if (!element)
            return videoFile.save({ transaction });
        for (const k of Object.keys(videoFile.toJSON())) {
            element.set(k, videoFile[k]);
        }
        return element.save({ transaction });
    }
    static async loadWebVideoFile(options) {
        const where = {
            fps: options.fps,
            resolution: options.resolution,
            videoId: options.videoId
        };
        return VideoFileModel_1.findOne({ where, transaction: options.transaction });
    }
    static async loadHLSFile(options) {
        const where = {
            fps: options.fps,
            resolution: options.resolution,
            videoStreamingPlaylistId: options.playlistId
        };
        return VideoFileModel_1.findOne({ where, transaction: options.transaction });
    }
    static removeHLSFilesOfStreamingPlaylistId(videoStreamingPlaylistId) {
        const options = {
            where: { videoStreamingPlaylistId }
        };
        return VideoFileModel_1.destroy(options);
    }
    hasTorrent() {
        return this.infoHash && this.torrentFilename;
    }
    getVideoOrStreamingPlaylist() {
        if (this.videoId || this.Video)
            return this.Video;
        return this.VideoStreamingPlaylist;
    }
    getVideo() {
        return extractVideo(this.getVideoOrStreamingPlaylist());
    }
    isAudio() {
        return this.resolution === VideoResolution.H_NOVIDEO;
    }
    isLive() {
        return this.size === -1;
    }
    isHLS() {
        return !!this.videoStreamingPlaylistId;
    }
    hasAudio() {
        return (this.streams & VideoFileStream.AUDIO) === VideoFileStream.AUDIO;
    }
    hasVideo() {
        return (this.streams & VideoFileStream.VIDEO) === VideoFileStream.VIDEO;
    }
    getObjectStorageUrl(video) {
        if (video.hasPrivateStaticPath() && CONFIG.OBJECT_STORAGE.PROXY.PROXIFY_PRIVATE_FILES === true) {
            return this.getPrivateObjectStorageUrl(video);
        }
        return this.getPublicObjectStorageUrl();
    }
    getPrivateObjectStorageUrl(video) {
        if (this.isHLS()) {
            return getHLSPrivateFileUrl(video, this.filename);
        }
        return getWebVideoPrivateFileUrl(this.filename);
    }
    getPublicObjectStorageUrl() {
        if (this.isHLS()) {
            return getObjectStoragePublicFileUrl(this.fileUrl, CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
        }
        return getObjectStoragePublicFileUrl(this.fileUrl, CONFIG.OBJECT_STORAGE.WEB_VIDEOS);
    }
    getFileUrl(video) {
        if (video.isOwned()) {
            if (this.storage === FileStorage.OBJECT_STORAGE) {
                return this.getObjectStorageUrl(video);
            }
            return WEBSERVER.URL + this.getFileStaticPath(video);
        }
        return this.fileUrl;
    }
    getFileStaticPath(video) {
        if (this.isHLS())
            return this.getHLSFileStaticPath(video);
        return this.getWebVideoFileStaticPath(video);
    }
    getWebVideoFileStaticPath(video) {
        if (isVideoInPrivateDirectory(video.privacy)) {
            return join(STATIC_PATHS.PRIVATE_WEB_VIDEOS, this.filename);
        }
        return join(STATIC_PATHS.WEB_VIDEOS, this.filename);
    }
    getHLSFileStaticPath(video) {
        if (isVideoInPrivateDirectory(video.privacy)) {
            return join(STATIC_PATHS.STREAMING_PLAYLISTS.PRIVATE_HLS, video.uuid, this.filename);
        }
        return join(STATIC_PATHS.STREAMING_PLAYLISTS.HLS, video.uuid, this.filename);
    }
    getFileDownloadUrl(video) {
        const path = this.isHLS()
            ? join(DOWNLOAD_PATHS.HLS_VIDEOS, `${video.uuid}-${this.resolution}-fragmented${this.extname}`)
            : join(DOWNLOAD_PATHS.WEB_VIDEOS, `${video.uuid}-${this.resolution}${this.extname}`);
        if (video.isOwned())
            return WEBSERVER.URL + path;
        return buildRemoteUrl(video, path);
    }
    getRemoteTorrentUrl(video) {
        if (video.isOwned())
            throw new Error(`Video ${video.url} is not a remote video`);
        return this.torrentUrl;
    }
    getTorrentUrl() {
        if (!this.torrentFilename)
            return null;
        return WEBSERVER.URL + this.getTorrentStaticPath();
    }
    getTorrentStaticPath() {
        if (!this.torrentFilename)
            return null;
        return join(LAZY_STATIC_PATHS.TORRENTS, this.torrentFilename);
    }
    getTorrentDownloadUrl() {
        if (!this.torrentFilename)
            return null;
        return WEBSERVER.URL + join(DOWNLOAD_PATHS.TORRENTS, this.torrentFilename);
    }
    removeTorrent() {
        if (!this.torrentFilename)
            return null;
        const torrentPath = getFSTorrentFilePath(this);
        return remove(torrentPath)
            .catch(err => logger.warn('Cannot delete torrent %s.', torrentPath, { err }));
    }
    hasSameUniqueKeysThan(other) {
        return this.fps === other.fps &&
            this.resolution === other.resolution &&
            ((this.videoId !== null && this.videoId === other.videoId) ||
                (this.videoStreamingPlaylistId !== null && this.videoStreamingPlaylistId === other.videoStreamingPlaylistId));
    }
    withVideoOrPlaylist(videoOrPlaylist) {
        if (isStreamingPlaylist(videoOrPlaylist))
            return Object.assign(this, { VideoStreamingPlaylist: videoOrPlaylist });
        return Object.assign(this, { Video: videoOrPlaylist });
    }
    toActivityPubObject(video) {
        const mimeType = getVideoFileMimeType(this.extname, false);
        const attachment = [];
        if (this.hasAudio()) {
            attachment.push({
                type: 'PropertyValue',
                name: 'ffprobe_codec_type',
                value: 'audio'
            });
        }
        if (this.hasVideo()) {
            attachment.push({
                type: 'PropertyValue',
                name: 'ffprobe_codec_type',
                value: 'video'
            });
        }
        if (this.formatFlags & VideoFileFormatFlag.FRAGMENTED) {
            attachment.push({
                type: 'PropertyValue',
                name: 'peertube_format_flag',
                value: 'fragmented'
            });
        }
        if (this.formatFlags & VideoFileFormatFlag.WEB_VIDEO) {
            attachment.push({
                type: 'PropertyValue',
                name: 'peertube_format_flag',
                value: 'web-video'
            });
        }
        return {
            type: 'Link',
            mediaType: mimeType,
            href: this.getFileUrl(video),
            height: this.height || this.resolution,
            width: this.width,
            size: this.size,
            fps: this.fps,
            attachment
        };
    }
};
VideoFileModel.doesInfohashExistCached = memoizee(VideoFileModel_1.doesInfohashExist.bind(VideoFileModel_1), {
    promise: true,
    max: MEMOIZE_LENGTH.INFO_HASH_EXISTS,
    maxAge: MEMOIZE_TTL.INFO_HASH_EXISTS
});
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoFileModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoFileModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Is('VideoFileResolution', value => throwIfNotValid(value, isVideoFileResolutionValid, 'resolution')),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "resolution", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "width", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "height", void 0);
__decorate([
    AllowNull(false),
    Is('VideoFileSize', value => throwIfNotValid(value, isVideoFileSizeValid, 'size')),
    Column(DataType.BIGINT),
    __metadata("design:type", Number)
], VideoFileModel.prototype, "size", void 0);
__decorate([
    AllowNull(false),
    Is('VideoFileExtname', value => throwIfNotValid(value, isVideoFileExtnameValid, 'extname')),
    Column,
    __metadata("design:type", String)
], VideoFileModel.prototype, "extname", void 0);
__decorate([
    AllowNull(true),
    Is('VideoFileInfohash', value => throwIfNotValid(value, isVideoFileInfoHashValid, 'info hash', true)),
    Column,
    __metadata("design:type", String)
], VideoFileModel.prototype, "infoHash", void 0);
__decorate([
    AllowNull(false),
    Default(-1),
    Is('VideoFileFPS', value => throwIfNotValid(value, isVideoFPSResolutionValid, 'fps')),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "fps", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "formatFlags", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "streams", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.JSONB),
    __metadata("design:type", Object)
], VideoFileModel.prototype, "metadata", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoFileModel.prototype, "metadataUrl", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoFileModel.prototype, "fileUrl", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoFileModel.prototype, "filename", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoFileModel.prototype, "torrentUrl", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoFileModel.prototype, "torrentFilename", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "videoId", void 0);
__decorate([
    AllowNull(false),
    Default(FileStorage.FILE_SYSTEM),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "storage", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoFileModel.prototype, "Video", void 0);
__decorate([
    ForeignKey(() => VideoStreamingPlaylistModel),
    Column,
    __metadata("design:type", Number)
], VideoFileModel.prototype, "videoStreamingPlaylistId", void 0);
__decorate([
    BelongsTo(() => VideoStreamingPlaylistModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoFileModel.prototype, "VideoStreamingPlaylist", void 0);
VideoFileModel = VideoFileModel_1 = __decorate([
    DefaultScope(() => ({
        attributes: {
            exclude: ['metadata']
        }
    })),
    Scopes(() => ({
        [ScopeNames.WITH_VIDEO]: {
            include: [
                {
                    model: VideoModel.unscoped(),
                    required: true
                }
            ]
        },
        [ScopeNames.WITH_VIDEO_OR_PLAYLIST]: (options = {}) => {
            return {
                include: [
                    {
                        model: VideoModel.unscoped(),
                        required: false,
                        where: options.whereVideo
                    },
                    {
                        model: VideoStreamingPlaylistModel.unscoped(),
                        required: false,
                        include: [
                            {
                                model: VideoModel.unscoped(),
                                required: true,
                                where: options.whereVideo
                            }
                        ]
                    }
                ]
            };
        },
        [ScopeNames.WITH_METADATA]: {
            attributes: {
                include: ['metadata']
            }
        }
    })),
    Table({
        tableName: 'videoFile',
        indexes: [
            {
                fields: ['infoHash']
            },
            {
                fields: ['torrentFilename'],
                unique: true
            },
            {
                fields: ['filename'],
                unique: true
            },
            {
                fields: ['videoId', 'resolution', 'fps'],
                unique: true,
                where: {
                    videoId: {
                        [Op.ne]: null
                    }
                }
            },
            {
                fields: ['videoStreamingPlaylistId', 'resolution', 'fps'],
                unique: true,
                where: {
                    videoStreamingPlaylistId: {
                        [Op.ne]: null
                    }
                }
            }
        ]
    })
], VideoFileModel);
export { VideoFileModel };
//# sourceMappingURL=video-file.js.map