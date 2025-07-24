import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoModel } from '../video/video.js';
import { AbuseModel } from './abuse.js';
import { SequelizeModel } from '../shared/index.js';
let VideoAbuseModel = class VideoAbuseModel extends SequelizeModel {
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoAbuseModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoAbuseModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Number)
], VideoAbuseModel.prototype, "startAt", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Number)
], VideoAbuseModel.prototype, "endAt", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.JSONB),
    __metadata("design:type", Object)
], VideoAbuseModel.prototype, "deletedVideo", void 0);
__decorate([
    ForeignKey(() => AbuseModel),
    Column,
    __metadata("design:type", Number)
], VideoAbuseModel.prototype, "abuseId", void 0);
__decorate([
    BelongsTo(() => AbuseModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoAbuseModel.prototype, "Abuse", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoAbuseModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoAbuseModel.prototype, "Video", void 0);
VideoAbuseModel = __decorate([
    Table({
        tableName: 'videoAbuse',
        indexes: [
            {
                fields: ['abuseId']
            },
            {
                fields: ['videoId']
            }
        ]
    })
], VideoAbuseModel);
export { VideoAbuseModel };
//# sourceMappingURL=video-abuse.js.map