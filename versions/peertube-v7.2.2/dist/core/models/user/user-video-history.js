var UserVideoHistoryModel_1;
import { __decorate, __metadata } from "tslib";
import { Op } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, ForeignKey, IsInt, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoModel } from '../video/video.js';
import { UserModel } from './user.js';
import { SequelizeModel } from '../shared/sequelize-type.js';
import { USER_EXPORT_MAX_ITEMS } from '../../initializers/constants.js';
import { getSort } from '../shared/sort.js';
let UserVideoHistoryModel = UserVideoHistoryModel_1 = class UserVideoHistoryModel extends SequelizeModel {
    static listForApi(user, start, count, search) {
        return VideoModel.listForApi({
            start,
            count,
            search,
            sort: '-"userVideoHistory"."updatedAt"',
            nsfw: null,
            displayOnlyForFollower: null,
            user,
            historyOfUser: user
        });
    }
    static async listForExport(user) {
        const rows = await UserVideoHistoryModel_1.findAll({
            attributes: ['createdAt', 'updatedAt', 'currentTime'],
            where: {
                userId: user.id
            },
            limit: USER_EXPORT_MAX_ITEMS,
            include: [
                {
                    attributes: ['url'],
                    model: VideoModel.unscoped(),
                    required: true
                }
            ],
            order: getSort('updatedAt')
        });
        return rows.map(r => ({ createdAt: r.createdAt, updatedAt: r.updatedAt, currentTime: r.currentTime, videoUrl: r.Video.url }));
    }
    static removeUserHistoryElement(user, videoId) {
        const query = {
            where: {
                userId: user.id,
                videoId
            }
        };
        return UserVideoHistoryModel_1.destroy(query);
    }
    static removeUserHistoryBefore(user, beforeDate, t) {
        const query = {
            where: {
                userId: user.id
            },
            transaction: t
        };
        if (beforeDate) {
            query.where['updatedAt'] = {
                [Op.lt]: beforeDate
            };
        }
        return UserVideoHistoryModel_1.destroy(query);
    }
    static removeOldHistory(beforeDate) {
        const query = {
            where: {
                updatedAt: {
                    [Op.lt]: beforeDate
                }
            }
        };
        return UserVideoHistoryModel_1.destroy(query);
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], UserVideoHistoryModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], UserVideoHistoryModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    IsInt,
    Column,
    __metadata("design:type", Number)
], UserVideoHistoryModel.prototype, "currentTime", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], UserVideoHistoryModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], UserVideoHistoryModel.prototype, "Video", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], UserVideoHistoryModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], UserVideoHistoryModel.prototype, "User", void 0);
UserVideoHistoryModel = UserVideoHistoryModel_1 = __decorate([
    Table({
        tableName: 'userVideoHistory',
        indexes: [
            {
                fields: ['userId', 'videoId'],
                unique: true
            },
            {
                fields: ['userId']
            },
            {
                fields: ['videoId']
            }
        ]
    })
], UserVideoHistoryModel);
export { UserVideoHistoryModel };
//# sourceMappingURL=user-video-history.js.map