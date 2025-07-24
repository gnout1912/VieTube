var VideoCaptionModel_1;
import { __decorate, __metadata } from "tslib";
import { removeVTTExt } from '@peertube/peertube-core-utils';
import { FileStorage } from '@peertube/peertube-models';
import { buildUUID } from '@peertube/peertube-node-utils';
import { getObjectStoragePublicFileUrl } from '../../lib/object-storage/urls.js';
import { removeCaptionObjectStorage, removeHLSFileObjectStorageByFilename } from '../../lib/object-storage/videos.js';
import { VideoPathManager } from '../../lib/video-path-manager.js';
import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { Op } from 'sequelize';
import { AllowNull, BeforeDestroy, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, Is, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { isVideoCaptionLanguageValid } from '../../helpers/custom-validators/video-captions.js';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { CONSTRAINTS_FIELDS, LAZY_STATIC_PATHS, VIDEO_LANGUAGES, WEBSERVER } from '../../initializers/constants.js';
import { SequelizeModel, buildWhereIdOrUUID, doesExist, throwIfNotValid } from '../shared/index.js';
import { VideoStreamingPlaylistModel } from './video-streaming-playlist.js';
import { VideoModel } from './video.js';
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["CAPTION_WITH_VIDEO"] = "CAPTION_WITH_VIDEO";
})(ScopeNames || (ScopeNames = {}));
const videoAttributes = ['id', 'name', 'remote', 'uuid', 'url', 'state', 'privacy'];
let VideoCaptionModel = VideoCaptionModel_1 = class VideoCaptionModel extends SequelizeModel {
    static async removeFiles(instance, options) {
        if (!instance.Video) {
            instance.Video = await instance.$get('Video', { transaction: options.transaction });
        }
        if (instance.isOwned()) {
            logger.info('Removing caption %s.', instance.filename);
            instance.removeAllCaptionFiles()
                .catch(err => logger.error('Cannot remove caption file ' + instance.filename, { err }));
        }
        return undefined;
    }
    static async insertOrReplaceLanguage(caption, transaction) {
        const existing = await VideoCaptionModel_1.loadByVideoIdAndLanguage(caption.videoId, caption.language, transaction);
        if (existing)
            await existing.destroy({ transaction });
        return caption.save({ transaction });
    }
    static async doesOwnedFileExist(filename, storage) {
        const query = 'SELECT 1 FROM "videoCaption" ' +
            `WHERE "filename" = $filename AND "storage" = $storage LIMIT 1`;
        return doesExist({ sequelize: this.sequelize, query, bind: { filename, storage } });
    }
    static loadWithVideo(captionId, transaction) {
        const query = {
            where: { id: captionId },
            include: [
                {
                    model: VideoModel.unscoped(),
                    attributes: videoAttributes
                }
            ],
            transaction
        };
        return VideoCaptionModel_1.findOne(query);
    }
    static loadByVideoIdAndLanguage(videoId, language, transaction) {
        const videoInclude = {
            model: VideoModel.unscoped(),
            attributes: videoAttributes,
            where: buildWhereIdOrUUID(videoId)
        };
        const query = {
            where: { language },
            include: [videoInclude],
            transaction
        };
        return VideoCaptionModel_1.findOne(query);
    }
    static loadWithVideoByFilename(filename) {
        const query = {
            where: {
                filename
            },
            include: [
                {
                    model: VideoModel.unscoped(),
                    attributes: videoAttributes
                }
            ]
        };
        return VideoCaptionModel_1.findOne(query);
    }
    static async hasVideoCaption(videoId) {
        const query = {
            where: {
                videoId
            }
        };
        const result = await VideoCaptionModel_1.unscoped().findOne(query);
        return !!result;
    }
    static listVideoCaptions(videoId, transaction) {
        const query = {
            order: [['language', 'ASC']],
            where: {
                videoId
            },
            transaction
        };
        return VideoCaptionModel_1.scope(ScopeNames.CAPTION_WITH_VIDEO).findAll(query);
    }
    static async listCaptionsOfMultipleVideos(videoIds, transaction) {
        const query = {
            order: [['language', 'ASC']],
            where: {
                videoId: {
                    [Op.in]: videoIds
                }
            },
            transaction
        };
        const captions = await VideoCaptionModel_1.scope(ScopeNames.CAPTION_WITH_VIDEO).findAll(query);
        const result = {};
        for (const id of videoIds) {
            result[id] = [];
        }
        for (const caption of captions) {
            result[caption.videoId].push(caption);
        }
        return result;
    }
    static getLanguageLabel(language) {
        return VIDEO_LANGUAGES[language] || 'Unknown';
    }
    static generateCaptionName(language) {
        return `${buildUUID()}-${language}.vtt`;
    }
    static generateM3U8Filename(vttFilename) {
        return removeVTTExt(vttFilename) + '.m3u8';
    }
    toFormattedJSON() {
        return {
            language: {
                id: this.language,
                label: VideoCaptionModel_1.getLanguageLabel(this.language)
            },
            automaticallyGenerated: this.automaticallyGenerated,
            captionPath: this.Video.isOwned() && this.fileUrl
                ? null
                : this.getFileStaticPath(),
            fileUrl: this.getFileUrl(this.Video),
            m3u8Url: this.getM3U8Url(this.Video),
            updatedAt: this.updatedAt.toISOString()
        };
    }
    toActivityPubObject(video) {
        return {
            identifier: this.language,
            name: VideoCaptionModel_1.getLanguageLabel(this.language),
            automaticallyGenerated: this.automaticallyGenerated,
            url: process.env.ENABLE_AP_BREAKING_CHANGES === 'true'
                ? [
                    {
                        type: 'Link',
                        mediaType: 'text/vtt',
                        href: this.getOriginFileUrl(video)
                    },
                    {
                        type: 'Link',
                        mediaType: 'application/x-mpegURL',
                        href: this.getOriginFileUrl(video)
                    }
                ]
                : this.getOriginFileUrl(video)
        };
    }
    isOwned() {
        return this.Video.remote === false;
    }
    getFileStaticPath() {
        return join(LAZY_STATIC_PATHS.VIDEO_CAPTIONS, this.filename);
    }
    getM3U8StaticPath(video) {
        if (!this.m3u8Filename)
            return null;
        return VideoStreamingPlaylistModel.getPlaylistFileStaticPath(video, this.m3u8Filename);
    }
    getFSFilePath() {
        return join(CONFIG.STORAGE.CAPTIONS_DIR, this.filename);
    }
    getFSM3U8Path(video) {
        if (!this.m3u8Filename)
            return null;
        return VideoPathManager.Instance.getFSHLSOutputPath(video, this.m3u8Filename);
    }
    async removeAllCaptionFiles() {
        await this.removeCaptionFile();
        await this.removeCaptionPlaylist();
    }
    async removeCaptionFile() {
        if (this.storage === FileStorage.OBJECT_STORAGE) {
            if (this.fileUrl) {
                await removeCaptionObjectStorage(this);
            }
        }
        else {
            await remove(this.getFSFilePath());
        }
        this.filename = null;
        this.fileUrl = null;
    }
    async removeCaptionPlaylist() {
        if (!this.m3u8Filename)
            return;
        const hls = await VideoStreamingPlaylistModel.loadHLSByVideoWithVideo(this.videoId);
        if (!hls)
            return;
        if (this.storage === FileStorage.OBJECT_STORAGE) {
            if (this.m3u8Url) {
                await removeHLSFileObjectStorageByFilename(hls, this.m3u8Filename);
            }
        }
        else {
            await remove(this.getFSM3U8Path(this.Video));
        }
        this.m3u8Filename = null;
        this.m3u8Url = null;
    }
    getFileUrl(video) {
        if (video.isOwned() && this.storage === FileStorage.OBJECT_STORAGE) {
            return getObjectStoragePublicFileUrl(this.fileUrl, CONFIG.OBJECT_STORAGE.CAPTIONS);
        }
        return WEBSERVER.URL + this.getFileStaticPath();
    }
    getOriginFileUrl(video) {
        if (video.isOwned())
            return this.getFileUrl(video);
        return this.fileUrl;
    }
    getM3U8Url(video) {
        if (!this.m3u8Filename)
            return null;
        if (video.isOwned()) {
            if (this.storage === FileStorage.OBJECT_STORAGE) {
                return getObjectStoragePublicFileUrl(this.m3u8Url, CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS);
            }
            return WEBSERVER.URL + this.getM3U8StaticPath(video);
        }
        return this.m3u8Url;
    }
    isEqual(other) {
        if (this.fileUrl)
            return this.fileUrl === other.fileUrl;
        return this.filename === other.filename;
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoCaptionModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoCaptionModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Is('VideoCaptionLanguage', value => throwIfNotValid(value, isVideoCaptionLanguageValid, 'language')),
    Column,
    __metadata("design:type", String)
], VideoCaptionModel.prototype, "language", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], VideoCaptionModel.prototype, "filename", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoCaptionModel.prototype, "m3u8Filename", void 0);
__decorate([
    AllowNull(false),
    Default(FileStorage.FILE_SYSTEM),
    Column,
    __metadata("design:type", Number)
], VideoCaptionModel.prototype, "storage", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.COMMONS.URL.max)),
    __metadata("design:type", String)
], VideoCaptionModel.prototype, "fileUrl", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoCaptionModel.prototype, "m3u8Url", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoCaptionModel.prototype, "automaticallyGenerated", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoCaptionModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoCaptionModel.prototype, "Video", void 0);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoCaptionModel, Object]),
    __metadata("design:returntype", Promise)
], VideoCaptionModel, "removeFiles", null);
VideoCaptionModel = VideoCaptionModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.CAPTION_WITH_VIDEO]: {
            include: [
                {
                    attributes: videoAttributes,
                    model: VideoModel.unscoped(),
                    required: true
                }
            ]
        }
    })),
    Table({
        tableName: 'videoCaption',
        indexes: [
            {
                fields: ['filename'],
                unique: true
            },
            {
                fields: ['videoId']
            },
            {
                fields: ['videoId', 'language'],
                unique: true
            }
        ]
    })
], VideoCaptionModel);
export { VideoCaptionModel };
//# sourceMappingURL=video-caption.js.map