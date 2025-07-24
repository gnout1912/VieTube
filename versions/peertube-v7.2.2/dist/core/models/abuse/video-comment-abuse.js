import { __decorate, __metadata } from "tslib";
import { BelongsTo, Column, CreatedAt, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoCommentModel } from '../video/video-comment.js';
import { AbuseModel } from './abuse.js';
import { SequelizeModel } from '../shared/index.js';
let VideoCommentAbuseModel = class VideoCommentAbuseModel extends SequelizeModel {
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoCommentAbuseModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoCommentAbuseModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => AbuseModel),
    Column,
    __metadata("design:type", Number)
], VideoCommentAbuseModel.prototype, "abuseId", void 0);
__decorate([
    BelongsTo(() => AbuseModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoCommentAbuseModel.prototype, "Abuse", void 0);
__decorate([
    ForeignKey(() => VideoCommentModel),
    Column,
    __metadata("design:type", Number)
], VideoCommentAbuseModel.prototype, "videoCommentId", void 0);
__decorate([
    BelongsTo(() => VideoCommentModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoCommentAbuseModel.prototype, "VideoComment", void 0);
VideoCommentAbuseModel = __decorate([
    Table({
        tableName: 'commentAbuse',
        indexes: [
            {
                fields: ['abuseId']
            },
            {
                fields: ['videoCommentId']
            }
        ]
    })
], VideoCommentAbuseModel);
export { VideoCommentAbuseModel };
//# sourceMappingURL=video-comment-abuse.js.map