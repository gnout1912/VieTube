import { __decorate, __metadata } from "tslib";
import { Column, CreatedAt, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { TagModel } from './tag.js';
import { VideoModel } from './video.js';
import { SequelizeModel } from '../shared/index.js';
let VideoTagModel = class VideoTagModel extends SequelizeModel {
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoTagModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoTagModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoTagModel.prototype, "videoId", void 0);
__decorate([
    ForeignKey(() => TagModel),
    Column,
    __metadata("design:type", Number)
], VideoTagModel.prototype, "tagId", void 0);
VideoTagModel = __decorate([
    Table({
        tableName: 'videoTag',
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: ['tagId']
            }
        ]
    })
], VideoTagModel);
export { VideoTagModel };
//# sourceMappingURL=video-tag.js.map