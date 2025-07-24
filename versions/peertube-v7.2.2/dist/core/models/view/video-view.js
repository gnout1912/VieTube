var VideoViewModel_1;
import { __decorate, __metadata } from "tslib";
import { literal, Op } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { VideoModel } from '../video/video.js';
import { SequelizeModel } from '../shared/index.js';
let VideoViewModel = VideoViewModel_1 = class VideoViewModel extends SequelizeModel {
    static removeOldRemoteViewsHistory(beforeDate) {
        const query = {
            where: {
                startDate: {
                    [Op.lt]: beforeDate
                },
                videoId: {
                    [Op.in]: literal('(SELECT "id" FROM "video" WHERE "remote" IS TRUE)')
                }
            }
        };
        return VideoViewModel_1.destroy(query);
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoViewModel.prototype, "createdAt", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.DATE),
    __metadata("design:type", Date)
], VideoViewModel.prototype, "startDate", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.DATE),
    __metadata("design:type", Date)
], VideoViewModel.prototype, "endDate", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], VideoViewModel.prototype, "views", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoViewModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoViewModel.prototype, "Video", void 0);
VideoViewModel = VideoViewModel_1 = __decorate([
    Table({
        tableName: 'videoView',
        updatedAt: false,
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: ['startDate']
            }
        ]
    })
], VideoViewModel);
export { VideoViewModel };
//# sourceMappingURL=video-view.js.map