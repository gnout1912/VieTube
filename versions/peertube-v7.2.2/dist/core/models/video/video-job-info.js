var VideoJobInfoModel_1;
import { __decorate, __metadata } from "tslib";
import { forceNumber } from '@peertube/peertube-core-utils';
import { Op, QueryTypes } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, Default, ForeignKey, IsInt, Table, Unique, UpdatedAt } from 'sequelize-typescript';
import { SequelizeModel } from '../shared/sequelize-type.js';
import { VideoModel } from './video.js';
let VideoJobInfoModel = VideoJobInfoModel_1 = class VideoJobInfoModel extends SequelizeModel {
    static load(videoId, transaction) {
        const where = {
            videoId
        };
        return VideoJobInfoModel_1.findOne({ where, transaction });
    }
    static async increaseOrCreate(videoUUID, column, amountArg = 1) {
        const options = { type: QueryTypes.SELECT, bind: { videoUUID } };
        const amount = forceNumber(amountArg);
        const [result] = await VideoJobInfoModel_1.sequelize.query(`
    INSERT INTO "videoJobInfo" ("videoId", "${column}", "createdAt", "updatedAt")
    SELECT
      "video"."id" AS "videoId", ${amount}, NOW(), NOW()
    FROM
      "video"
    WHERE
      "video"."uuid" = $videoUUID
    ON CONFLICT ("videoId") DO UPDATE
    SET
      "${column}" = "videoJobInfo"."${column}" + ${amount},
      "updatedAt" = NOW()
    RETURNING
      "${column}"
    `, options);
        return result[column];
    }
    static async decrease(videoUUID, column) {
        const options = { type: QueryTypes.SELECT, bind: { videoUUID } };
        const result = await VideoJobInfoModel_1.sequelize.query(`
    UPDATE
      "videoJobInfo"
    SET
      "${column}" = GREATEST("videoJobInfo"."${column}" - 1, 0),
      "updatedAt" = NOW()
    FROM "video"
    WHERE
      "video"."id" = "videoJobInfo"."videoId" AND "video"."uuid" = $videoUUID
    RETURNING
      "${column}";
    `, options);
        if (result.length === 0)
            return undefined;
        return result[0][column];
    }
    static async abortAllTasks(videoUUID, column) {
        const options = { type: QueryTypes.UPDATE, bind: { videoUUID } };
        await VideoJobInfoModel_1.sequelize.query(`
    UPDATE
      "videoJobInfo"
    SET
      "${column}" = 0,
      "updatedAt" = NOW()
    FROM "video"
    WHERE
      "video"."id" = "videoJobInfo"."videoId" AND "video"."uuid" = $videoUUID
    `, options);
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoJobInfoModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoJobInfoModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    IsInt,
    Column,
    __metadata("design:type", Number)
], VideoJobInfoModel.prototype, "pendingMove", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    IsInt,
    Column,
    __metadata("design:type", Number)
], VideoJobInfoModel.prototype, "pendingTranscode", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    IsInt,
    Column,
    __metadata("design:type", Number)
], VideoJobInfoModel.prototype, "pendingTranscription", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Unique,
    Column,
    __metadata("design:type", Number)
], VideoJobInfoModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoJobInfoModel.prototype, "Video", void 0);
VideoJobInfoModel = VideoJobInfoModel_1 = __decorate([
    Table({
        tableName: 'videoJobInfo',
        indexes: [
            {
                fields: ['videoId'],
                where: {
                    videoId: {
                        [Op.ne]: null
                    }
                }
            }
        ]
    })
], VideoJobInfoModel);
export { VideoJobInfoModel };
//# sourceMappingURL=video-job-info.js.map