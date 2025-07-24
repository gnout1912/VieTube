var VideoChapterModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoModel } from './video.js';
import { getSort } from '../shared/sort.js';
import { SequelizeModel } from '../shared/sequelize-type.js';
let VideoChapterModel = VideoChapterModel_1 = class VideoChapterModel extends SequelizeModel {
    static deleteChapters(videoId, transaction) {
        const query = {
            where: {
                videoId
            },
            transaction
        };
        return VideoChapterModel_1.destroy(query);
    }
    static listChaptersOfVideo(videoId, transaction) {
        const query = {
            where: {
                videoId
            },
            order: getSort('timecode'),
            transaction
        };
        return VideoChapterModel_1.findAll(query);
    }
    static hasVideoChapters(videoId, transaction) {
        return VideoChapterModel_1.findOne({
            where: { videoId },
            transaction
        }).then(c => !!c);
    }
    toActivityPubJSON(options) {
        return {
            name: this.title,
            startOffset: this.timecode,
            endOffset: options.nextChapter
                ? options.nextChapter.timecode
                : options.video.duration
        };
    }
    toFormattedJSON() {
        return {
            timecode: this.timecode,
            title: this.title
        };
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], VideoChapterModel.prototype, "timecode", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], VideoChapterModel.prototype, "title", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoChapterModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoChapterModel.prototype, "Video", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoChapterModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoChapterModel.prototype, "updatedAt", void 0);
VideoChapterModel = VideoChapterModel_1 = __decorate([
    Table({
        tableName: 'videoChapter',
        indexes: [
            {
                fields: ['videoId', 'timecode'],
                unique: true
            }
        ]
    })
], VideoChapterModel);
export { VideoChapterModel };
//# sourceMappingURL=video-chapter.js.map