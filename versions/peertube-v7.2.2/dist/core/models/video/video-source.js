var VideoSourceModel_1;
import { __decorate, __metadata } from "tslib";
import { getResolutionLabel } from '@peertube/peertube-core-utils';
import { DOWNLOAD_PATHS, WEBSERVER } from '../../initializers/constants.js';
import { getVideoFileMimeType } from '../../lib/video-file.js';
import { extname, join } from 'path';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { SequelizeModel, doesExist, getSort } from '../shared/index.js';
import { VideoModel } from './video.js';
let VideoSourceModel = VideoSourceModel_1 = class VideoSourceModel extends SequelizeModel {
    static loadLatest(videoId, transaction) {
        return VideoSourceModel_1.findOne({
            where: { videoId },
            order: getSort('-createdAt'),
            transaction
        });
    }
    static loadByKeptOriginalFilename(keptOriginalFilename) {
        return VideoSourceModel_1.findOne({
            where: { keptOriginalFilename }
        });
    }
    static listAll(videoId, transaction) {
        return VideoSourceModel_1.findAll({
            where: { videoId },
            transaction
        });
    }
    static async doesOwnedFileExist(filename, storage) {
        const query = 'SELECT 1 FROM "videoSource" ' +
            'INNER JOIN "video" ON "video"."id" = "videoSource"."videoId" AND "video"."remote" IS FALSE ' +
            `WHERE "keptOriginalFilename" = $filename AND "storage" = $storage LIMIT 1`;
        return doesExist({ sequelize: this.sequelize, query, bind: { filename, storage } });
    }
    getFileDownloadUrl() {
        if (!this.keptOriginalFilename)
            return null;
        return WEBSERVER.URL + join(DOWNLOAD_PATHS.ORIGINAL_VIDEO_FILE, this.keptOriginalFilename);
    }
    toActivityPubObject() {
        const mimeType = getVideoFileMimeType(extname(this.inputFilename), false);
        return {
            type: 'Link',
            mediaType: mimeType,
            href: null,
            height: this.height || this.resolution,
            width: this.width,
            size: this.size,
            fps: this.fps,
            attachment: []
        };
    }
    toFormattedJSON() {
        return {
            filename: this.inputFilename,
            inputFilename: this.inputFilename,
            fileUrl: this.fileUrl,
            fileDownloadUrl: this.getFileDownloadUrl(),
            resolution: {
                id: this.resolution,
                label: this.resolution !== null
                    ? getResolutionLabel({ resolution: this.resolution, height: this.height, width: this.width })
                    : null
            },
            size: this.size,
            width: this.width,
            height: this.height,
            fps: this.fps,
            metadata: this.metadata,
            createdAt: this.createdAt.toISOString()
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoSourceModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoSourceModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], VideoSourceModel.prototype, "inputFilename", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoSourceModel.prototype, "keptOriginalFilename", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], VideoSourceModel.prototype, "resolution", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], VideoSourceModel.prototype, "width", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], VideoSourceModel.prototype, "height", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], VideoSourceModel.prototype, "fps", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.BIGINT),
    __metadata("design:type", Number)
], VideoSourceModel.prototype, "size", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.JSONB),
    __metadata("design:type", Object)
], VideoSourceModel.prototype, "metadata", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], VideoSourceModel.prototype, "storage", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], VideoSourceModel.prototype, "fileUrl", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoSourceModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoSourceModel.prototype, "Video", void 0);
VideoSourceModel = VideoSourceModel_1 = __decorate([
    Table({
        tableName: 'videoSource',
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: [{ name: 'createdAt', order: 'DESC' }]
            },
            {
                fields: ['keptOriginalFilename'],
                unique: true
            }
        ]
    })
], VideoSourceModel);
export { VideoSourceModel };
//# sourceMappingURL=video-source.js.map