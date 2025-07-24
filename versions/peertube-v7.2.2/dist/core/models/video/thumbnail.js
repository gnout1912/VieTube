var ThumbnailModel_1;
import { __decorate, __metadata } from "tslib";
import { ThumbnailType } from '@peertube/peertube-models';
import { afterCommitIfTransaction } from '../../helpers/database-utils.js';
import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { AfterDestroy, AllowNull, BeforeCreate, BeforeUpdate, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { CONSTRAINTS_FIELDS, LAZY_STATIC_PATHS, WEBSERVER } from '../../initializers/constants.js';
import { VideoPlaylistModel } from './video-playlist.js';
import { VideoModel } from './video.js';
import { SequelizeModel } from '../shared/sequelize-type.js';
let ThumbnailModel = ThumbnailModel_1 = class ThumbnailModel extends SequelizeModel {
    static removeOldFile(instance, options) {
        return afterCommitIfTransaction(options.transaction, () => instance.removePreviousFilenameIfNeeded());
    }
    static removeFiles(instance) {
        logger.info('Removing %s file %s.', ThumbnailModel_1.types[instance.type].label, instance.filename);
        instance.removeThumbnail()
            .catch(err => logger.error('Cannot remove thumbnail file %s.', instance.filename, { err }));
    }
    static loadByFilename(filename, thumbnailType) {
        const query = {
            where: {
                filename,
                type: thumbnailType
            }
        };
        return ThumbnailModel_1.findOne(query);
    }
    static loadWithVideoByFilename(filename, thumbnailType) {
        const query = {
            where: {
                filename,
                type: thumbnailType
            },
            include: [
                {
                    model: VideoModel.unscoped(),
                    required: true
                }
            ]
        };
        return ThumbnailModel_1.findOne(query);
    }
    static listRemoteOnDisk() {
        return this.findAll({
            where: {
                onDisk: true
            },
            include: [
                {
                    attributes: ['id'],
                    model: VideoModel.unscoped(),
                    required: true,
                    where: {
                        remote: true
                    }
                }
            ]
        });
    }
    static buildPath(type, filename) {
        const directory = ThumbnailModel_1.types[type].directory;
        return join(directory, filename);
    }
    getOriginFileUrl(videoOrPlaylist) {
        const staticPath = ThumbnailModel_1.types[this.type].staticPath + this.filename;
        if (videoOrPlaylist.isOwned())
            return WEBSERVER.URL + staticPath;
        return this.fileUrl;
    }
    getLocalStaticPath() {
        return ThumbnailModel_1.types[this.type].staticPath + this.filename;
    }
    getPath() {
        return ThumbnailModel_1.buildPath(this.type, this.filename);
    }
    getPreviousPath() {
        return ThumbnailModel_1.buildPath(this.type, this.previousThumbnailFilename);
    }
    removeThumbnail() {
        return remove(this.getPath());
    }
    removePreviousFilenameIfNeeded() {
        if (!this.previousThumbnailFilename)
            return;
        const previousPath = this.getPreviousPath();
        remove(previousPath)
            .catch(err => logger.error('Cannot remove previous thumbnail file %s.', previousPath, { err }));
        this.previousThumbnailFilename = undefined;
    }
    isOwned() {
        return !this.fileUrl;
    }
    toActivityPubObject(video) {
        return {
            type: 'Image',
            url: this.getOriginFileUrl(video),
            mediaType: 'image/jpeg',
            width: this.width,
            height: this.height
        };
    }
};
ThumbnailModel.types = {
    [ThumbnailType.MINIATURE]: {
        label: 'miniature',
        directory: CONFIG.STORAGE.THUMBNAILS_DIR,
        staticPath: LAZY_STATIC_PATHS.THUMBNAILS
    },
    [ThumbnailType.PREVIEW]: {
        label: 'preview',
        directory: CONFIG.STORAGE.PREVIEWS_DIR,
        staticPath: LAZY_STATIC_PATHS.PREVIEWS
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], ThumbnailModel.prototype, "filename", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Number)
], ThumbnailModel.prototype, "height", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Number)
], ThumbnailModel.prototype, "width", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], ThumbnailModel.prototype, "type", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.COMMONS.URL.max)),
    __metadata("design:type", String)
], ThumbnailModel.prototype, "fileUrl", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Boolean)
], ThumbnailModel.prototype, "automaticallyGenerated", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], ThumbnailModel.prototype, "onDisk", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], ThumbnailModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], ThumbnailModel.prototype, "Video", void 0);
__decorate([
    ForeignKey(() => VideoPlaylistModel),
    Column,
    __metadata("design:type", Number)
], ThumbnailModel.prototype, "videoPlaylistId", void 0);
__decorate([
    BelongsTo(() => VideoPlaylistModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], ThumbnailModel.prototype, "VideoPlaylist", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], ThumbnailModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], ThumbnailModel.prototype, "updatedAt", void 0);
__decorate([
    BeforeCreate,
    BeforeUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ThumbnailModel, Object]),
    __metadata("design:returntype", void 0)
], ThumbnailModel, "removeOldFile", null);
__decorate([
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ThumbnailModel]),
    __metadata("design:returntype", void 0)
], ThumbnailModel, "removeFiles", null);
ThumbnailModel = ThumbnailModel_1 = __decorate([
    Table({
        tableName: 'thumbnail',
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: ['videoPlaylistId'],
                unique: true
            },
            {
                fields: ['filename', 'type'],
                unique: true
            }
        ]
    })
], ThumbnailModel);
export { ThumbnailModel };
//# sourceMappingURL=thumbnail.js.map