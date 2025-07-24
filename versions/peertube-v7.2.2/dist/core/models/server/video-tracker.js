import { __decorate, __metadata } from "tslib";
import { Column, CreatedAt, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoModel } from '../video/video.js';
import { TrackerModel } from './tracker.js';
import { SequelizeModel } from '../shared/index.js';
let VideoTrackerModel = class VideoTrackerModel extends SequelizeModel {
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoTrackerModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoTrackerModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoTrackerModel.prototype, "videoId", void 0);
__decorate([
    ForeignKey(() => TrackerModel),
    Column,
    __metadata("design:type", Number)
], VideoTrackerModel.prototype, "trackerId", void 0);
VideoTrackerModel = __decorate([
    Table({
        tableName: 'videoTracker',
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: ['trackerId']
            }
        ]
    })
], VideoTrackerModel);
export { VideoTrackerModel };
//# sourceMappingURL=video-tracker.js.map