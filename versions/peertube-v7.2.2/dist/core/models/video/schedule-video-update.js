var ScheduleVideoUpdateModel_1;
import { __decorate, __metadata } from "tslib";
import { Op } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoModel } from './video.js';
import { SequelizeModel } from '../shared/index.js';
let ScheduleVideoUpdateModel = ScheduleVideoUpdateModel_1 = class ScheduleVideoUpdateModel extends SequelizeModel {
    static areVideosToUpdate() {
        const query = {
            logging: false,
            attributes: ['id'],
            where: {
                updateAt: {
                    [Op.lte]: new Date()
                }
            }
        };
        return ScheduleVideoUpdateModel_1.findOne(query)
            .then(res => !!res);
    }
    static listVideosToUpdate(transaction) {
        const query = {
            where: {
                updateAt: {
                    [Op.lte]: new Date()
                }
            },
            transaction
        };
        return ScheduleVideoUpdateModel_1.findAll(query);
    }
    static deleteByVideoId(videoId, t) {
        const query = {
            where: {
                videoId
            },
            transaction: t
        };
        return ScheduleVideoUpdateModel_1.destroy(query);
    }
    toFormattedJSON() {
        return {
            updateAt: this.updateAt,
            privacy: this.privacy || undefined
        };
    }
};
__decorate([
    AllowNull(false),
    Default(null),
    Column,
    __metadata("design:type", Date)
], ScheduleVideoUpdateModel.prototype, "updateAt", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.INTEGER),
    __metadata("design:type", Object)
], ScheduleVideoUpdateModel.prototype, "privacy", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], ScheduleVideoUpdateModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], ScheduleVideoUpdateModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], ScheduleVideoUpdateModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], ScheduleVideoUpdateModel.prototype, "Video", void 0);
ScheduleVideoUpdateModel = ScheduleVideoUpdateModel_1 = __decorate([
    Table({
        tableName: 'scheduleVideoUpdate',
        indexes: [
            {
                fields: ['videoId'],
                unique: true
            },
            {
                fields: ['updateAt']
            }
        ]
    })
], ScheduleVideoUpdateModel);
export { ScheduleVideoUpdateModel };
//# sourceMappingURL=schedule-video-update.js.map