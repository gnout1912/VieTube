var VideoStreamingPlaylistModel_1;
import { __decorate, __metadata } from "tslib";
import { FileStorage, VideoResolution, VideoStreamingPlaylistType } from '@peertube/peertube-models';
import { generateP2PMediaLoaderHash } from '@peertube/peertube-node-utils';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { getHLSPrivateFileUrl, getObjectStoragePublicFileUrl } from '../../lib/object-storage/index.js';
import { generateHLSMasterPlaylistFilename, generateHlsSha256SegmentsFilename } from '../../lib/paths.js';
import { isVideoInPrivateDirectory } from '../../lib/video-privacy.js';
import { VideoFileModel } from './video-file.js';
import memoizee from 'memoizee';
import { join } from 'path';
import { Op } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, HasMany, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isArrayOf } from '../../helpers/custom-validators/misc.js';
import { isVideoFileInfoHashValid } from '../../helpers/custom-validators/videos.js';
import { CONSTRAINTS_FIELDS, MEMOIZE_LENGTH, MEMOIZE_TTL, P2P_MEDIA_LOADER_PEER_VERSION, STATIC_PATHS, WEBSERVER } from '../../initializers/constants.js';
import { VideoRedundancyModel } from '../redundancy/video-redundancy.js';
import { SequelizeModel, doesExist, throwIfNotValid } from '../shared/index.js';
import { VideoModel } from './video.js';
let VideoStreamingPlaylistModel = VideoStreamingPlaylistModel_1 = class VideoStreamingPlaylistModel extends SequelizeModel {
    static doesInfohashExist(infoHash) {
        const query = 'SELECT 1 FROM "videoStreamingPlaylist" WHERE "p2pMediaLoaderInfohashes" @> $infoHash';
        return doesExist({ sequelize: this.sequelize, query, bind: { infoHash: `{${infoHash}}` } });
    }
    static buildP2PMediaLoaderInfoHashes(playlistUrl, files) {
        const hashes = [];
        const version = Math.abs(P2P_MEDIA_LOADER_PEER_VERSION);
        for (let i = 0; i < files.length; i++) {
            hashes.push(generateP2PMediaLoaderHash(`v${version}-${playlistUrl}-main-${i}`));
        }
        if (files.some(f => f.height === 0)) {
            hashes.push(generateP2PMediaLoaderHash(`v${version}-${playlistUrl}-secondary-0`));
        }
        logger.debug('Assigned P2P Media Loader info hashes', { playlistUrl, hashes });
        return hashes;
    }
    static async listByIncorrectPeerVersion() {
        const rows = await VideoStreamingPlaylistModel_1.unscoped().findAll({
            raw: true,
            attributes: ['id'],
            where: {
                p2pMediaLoaderPeerVersion: {
                    [Op.ne]: P2P_MEDIA_LOADER_PEER_VERSION
                }
            }
        });
        return rows.map(r => r.id);
    }
    static loadWithVideoAndFiles(id) {
        const options = {
            include: [
                {
                    model: VideoModel.unscoped(),
                    required: true
                },
                {
                    model: VideoFileModel.unscoped()
                }
            ]
        };
        return VideoStreamingPlaylistModel_1.findByPk(id, options);
    }
    static loadWithVideo(id, transaction) {
        const options = {
            include: [
                {
                    model: VideoModel.unscoped(),
                    required: true
                }
            ],
            transaction
        };
        return VideoStreamingPlaylistModel_1.findByPk(id, options);
    }
    static loadHLSByVideo(videoId, transaction) {
        const options = {
            where: {
                type: VideoStreamingPlaylistType.HLS,
                videoId
            },
            transaction
        };
        return VideoStreamingPlaylistModel_1.findOne(options);
    }
    static loadHLSByVideoWithVideo(videoId, transaction) {
        const options = {
            where: {
                type: VideoStreamingPlaylistType.HLS,
                videoId
            },
            include: [
                {
                    model: VideoModel.unscoped(),
                    required: true
                }
            ],
            transaction
        };
        return VideoStreamingPlaylistModel_1.findOne(options);
    }
    static async loadOrGenerate(video, transaction) {
        let playlist = await VideoStreamingPlaylistModel_1.loadHLSByVideo(video.id, transaction);
        let generated = false;
        if (!playlist) {
            generated = true;
            playlist = new VideoStreamingPlaylistModel_1({
                p2pMediaLoaderPeerVersion: P2P_MEDIA_LOADER_PEER_VERSION,
                type: VideoStreamingPlaylistType.HLS,
                storage: FileStorage.FILE_SYSTEM,
                p2pMediaLoaderInfohashes: [],
                playlistFilename: generateHLSMasterPlaylistFilename(video.isLive),
                segmentsSha256Filename: generateHlsSha256SegmentsFilename(video.isLive),
                videoId: video.id
            });
            await playlist.save({ transaction });
        }
        return { generated, playlist: Object.assign(playlist, { Video: video }) };
    }
    static doesOwnedVideoUUIDExist(videoUUID, storage) {
        const query = `SELECT 1 FROM "videoStreamingPlaylist" ` +
            `INNER JOIN "video" ON "video"."id" = "videoStreamingPlaylist"."videoId" ` +
            `AND "video"."remote" IS FALSE AND "video"."uuid" = $videoUUID ` +
            `AND "storage" = $storage LIMIT 1`;
        return doesExist({ sequelize: this.sequelize, query, bind: { videoUUID, storage } });
    }
    assignP2PMediaLoaderInfoHashes(video, files) {
        const masterPlaylistUrl = this.getMasterPlaylistUrl(video);
        this.p2pMediaLoaderInfohashes = VideoStreamingPlaylistModel_1.buildP2PMediaLoaderInfoHashes(masterPlaylistUrl, files);
    }
    getMasterPlaylistUrl(video) {
        if (video.isOwned()) {
            if (this.storage === FileStorage.OBJECT_STORAGE) {
                return this.getMasterPlaylistObjectStorageUrl(video);
            }
            return WEBSERVER.URL + this.getMasterPlaylistStaticPath(video);
        }
        return this.playlistUrl;
    }
    getMasterPlaylistObjectStorageUrl(video) {
        if (video.hasPrivateStaticPath() && CONFIG.OBJECT_STORAGE.PROXY.PROXIFY_PRIVATE_FILES === true) {
            return getHLSPrivateFileUrl(video, this.playlistFilename);
        }
        return getObjectStoragePublicFileUrl(this.playlistUrl, CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
    }
    getSha256SegmentsUrl(video) {
        if (video.isOwned()) {
            if (!this.segmentsSha256Filename)
                return null;
            if (this.storage === FileStorage.OBJECT_STORAGE) {
                return this.getSha256SegmentsObjectStorageUrl(video);
            }
            return WEBSERVER.URL + this.getSha256SegmentsStaticPath(video);
        }
        return this.segmentsSha256Url;
    }
    getSha256SegmentsObjectStorageUrl(video) {
        if (video.hasPrivateStaticPath() && CONFIG.OBJECT_STORAGE.PROXY.PROXIFY_PRIVATE_FILES === true) {
            return getHLSPrivateFileUrl(video, this.segmentsSha256Filename);
        }
        return getObjectStoragePublicFileUrl(this.segmentsSha256Url, CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
    }
    hasAudioAndVideoSplitted() {
        if (this.VideoFiles.length === 1)
            return false;
        let hasAudio = false;
        let hasVideo = false;
        for (const file of this.VideoFiles) {
            if (file.hasAudio() && file.hasVideo())
                return false;
            if (file.resolution === VideoResolution.H_NOVIDEO)
                hasAudio = true;
            else if (file.hasVideo())
                hasVideo = true;
            if (hasVideo && hasAudio)
                return true;
        }
        return false;
    }
    getStringType() {
        if (this.type === VideoStreamingPlaylistType.HLS)
            return 'hls';
        return 'unknown';
    }
    getTrackerUrls(baseUrlHttp, baseUrlWs) {
        return [baseUrlWs + '/tracker/socket', baseUrlHttp + '/tracker/announce'];
    }
    hasSameUniqueKeysThan(other) {
        return this.type === other.type &&
            this.videoId === other.videoId;
    }
    withVideo(video) {
        return Object.assign(this, { Video: video });
    }
    static getPlaylistFileStaticPath(video, filename) {
        if (isVideoInPrivateDirectory(video.privacy)) {
            return join(STATIC_PATHS.STREAMING_PLAYLISTS.PRIVATE_HLS, video.uuid, filename);
        }
        return join(STATIC_PATHS.STREAMING_PLAYLISTS.HLS, video.uuid, filename);
    }
    getMasterPlaylistStaticPath(video) {
        return VideoStreamingPlaylistModel_1.getPlaylistFileStaticPath(video, this.playlistFilename);
    }
    getSha256SegmentsStaticPath(video) {
        return VideoStreamingPlaylistModel_1.getPlaylistFileStaticPath(video, this.segmentsSha256Filename);
    }
};
VideoStreamingPlaylistModel.doesInfohashExistCached = memoizee(VideoStreamingPlaylistModel_1.doesInfohashExist.bind(VideoStreamingPlaylistModel_1), {
    promise: true,
    max: MEMOIZE_LENGTH.INFO_HASH_EXISTS,
    maxAge: MEMOIZE_TTL.INFO_HASH_EXISTS
});
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoStreamingPlaylistModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoStreamingPlaylistModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], VideoStreamingPlaylistModel.prototype, "type", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], VideoStreamingPlaylistModel.prototype, "playlistFilename", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEOS.URL.max)),
    __metadata("design:type", String)
], VideoStreamingPlaylistModel.prototype, "playlistUrl", void 0);
__decorate([
    AllowNull(false),
    Is('VideoStreamingPlaylistInfoHashes', value => throwIfNotValid(value, v => isArrayOf(v, isVideoFileInfoHashValid), 'info hashes')),
    Column(DataType.ARRAY(DataType.STRING)),
    __metadata("design:type", Array)
], VideoStreamingPlaylistModel.prototype, "p2pMediaLoaderInfohashes", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], VideoStreamingPlaylistModel.prototype, "p2pMediaLoaderPeerVersion", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoStreamingPlaylistModel.prototype, "segmentsSha256Filename", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoStreamingPlaylistModel.prototype, "segmentsSha256Url", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoStreamingPlaylistModel.prototype, "videoId", void 0);
__decorate([
    AllowNull(false),
    Default(FileStorage.FILE_SYSTEM),
    Column,
    __metadata("design:type", Number)
], VideoStreamingPlaylistModel.prototype, "storage", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoStreamingPlaylistModel.prototype, "Video", void 0);
__decorate([
    HasMany(() => VideoFileModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], VideoStreamingPlaylistModel.prototype, "VideoFiles", void 0);
__decorate([
    HasMany(() => VideoRedundancyModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE',
        hooks: true
    }),
    __metadata("design:type", Array)
], VideoStreamingPlaylistModel.prototype, "RedundancyVideos", void 0);
VideoStreamingPlaylistModel = VideoStreamingPlaylistModel_1 = __decorate([
    Table({
        tableName: 'videoStreamingPlaylist',
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: ['videoId', 'type'],
                unique: true
            },
            {
                fields: ['p2pMediaLoaderInfohashes'],
                using: 'gin'
            }
        ]
    })
], VideoStreamingPlaylistModel);
export { VideoStreamingPlaylistModel };
//# sourceMappingURL=video-streaming-playlist.js.map