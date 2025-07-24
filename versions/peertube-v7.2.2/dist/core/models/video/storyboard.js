var StoryboardModel_1;
import { __decorate, __metadata } from "tslib";
import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { AfterDestroy, AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { CONFIG } from '../../initializers/config.js';
import { logger } from '../../helpers/logger.js';
import { CONSTRAINTS_FIELDS, LAZY_STATIC_PATHS, WEBSERVER } from '../../initializers/constants.js';
import { VideoModel } from './video.js';
import { SequelizeModel } from '../shared/index.js';
let StoryboardModel = StoryboardModel_1 = class StoryboardModel extends SequelizeModel {
    static removeInstanceFile(instance) {
        logger.info('Removing storyboard file %s.', instance.filename);
        instance.removeFile()
            .catch(err => logger.error('Cannot remove storyboard file %s.', instance.filename, { err }));
    }
    static loadByVideo(videoId, transaction) {
        const query = {
            where: {
                videoId
            },
            transaction
        };
        return StoryboardModel_1.findOne(query);
    }
    static loadByFilename(filename) {
        const query = {
            where: {
                filename
            }
        };
        return StoryboardModel_1.findOne(query);
    }
    static loadWithVideoByFilename(filename) {
        const query = {
            where: {
                filename
            },
            include: [
                {
                    model: VideoModel.unscoped(),
                    required: true
                }
            ]
        };
        return StoryboardModel_1.findOne(query);
    }
    static async listStoryboardsOf(video) {
        const query = {
            where: {
                videoId: video.id
            }
        };
        const storyboards = await StoryboardModel_1.findAll(query);
        return storyboards.map(s => Object.assign(s, { Video: video }));
    }
    getOriginFileUrl(video) {
        if (video.isOwned()) {
            return WEBSERVER.URL + this.getLocalStaticPath();
        }
        return this.fileUrl;
    }
    getFileUrl() {
        return WEBSERVER.URL + this.getLocalStaticPath();
    }
    getLocalStaticPath() {
        return LAZY_STATIC_PATHS.STORYBOARDS + this.filename;
    }
    getPath() {
        return join(CONFIG.STORAGE.STORYBOARDS_DIR, this.filename);
    }
    removeFile() {
        return remove(this.getPath());
    }
    toFormattedJSON() {
        return {
            fileUrl: this.getFileUrl(),
            storyboardPath: this.getLocalStaticPath(),
            totalHeight: this.totalHeight,
            totalWidth: this.totalWidth,
            spriteWidth: this.spriteWidth,
            spriteHeight: this.spriteHeight,
            spriteDuration: this.spriteDuration
        };
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], StoryboardModel.prototype, "filename", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], StoryboardModel.prototype, "totalHeight", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], StoryboardModel.prototype, "totalWidth", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], StoryboardModel.prototype, "spriteHeight", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], StoryboardModel.prototype, "spriteWidth", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], StoryboardModel.prototype, "spriteDuration", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.COMMONS.URL.max)),
    __metadata("design:type", String)
], StoryboardModel.prototype, "fileUrl", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], StoryboardModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], StoryboardModel.prototype, "Video", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], StoryboardModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], StoryboardModel.prototype, "updatedAt", void 0);
__decorate([
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [StoryboardModel]),
    __metadata("design:returntype", void 0)
], StoryboardModel, "removeInstanceFile", null);
StoryboardModel = StoryboardModel_1 = __decorate([
    Table({
        tableName: 'storyboard',
        indexes: [
            {
                fields: ['videoId'],
                unique: true
            },
            {
                fields: ['filename'],
                unique: true
            }
        ]
    })
], StoryboardModel);
export { StoryboardModel };
//# sourceMappingURL=storyboard.js.map