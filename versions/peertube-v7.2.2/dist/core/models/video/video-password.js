var VideoPasswordModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, DefaultScope, ForeignKey, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoModel } from './video.js';
import { SequelizeModel, getSort, throwIfNotValid } from '../shared/index.js';
import { isPasswordValid } from '../../helpers/custom-validators/videos.js';
import { pick } from '@peertube/peertube-core-utils';
let VideoPasswordModel = VideoPasswordModel_1 = class VideoPasswordModel extends SequelizeModel {
    static async countByVideoId(videoId, t) {
        const query = {
            where: {
                videoId
            },
            transaction: t
        };
        return VideoPasswordModel_1.count(query);
    }
    static async loadByIdAndVideo(options) {
        const { id, videoId, t } = options;
        const query = {
            where: {
                id,
                videoId
            },
            transaction: t
        };
        return VideoPasswordModel_1.findOne(query);
    }
    static async listPasswords(options) {
        const { start, count, sort, videoId } = options;
        const { count: total, rows: data } = await VideoPasswordModel_1.findAndCountAll({
            where: { videoId },
            order: getSort(sort),
            offset: start,
            limit: count
        });
        return { total, data };
    }
    static async addPasswords(passwords, videoId, transaction) {
        for (const password of passwords) {
            await VideoPasswordModel_1.create({
                password,
                videoId
            }, { transaction });
        }
    }
    static async deleteAllPasswords(videoId, transaction) {
        await VideoPasswordModel_1.destroy({
            where: { videoId },
            transaction
        });
    }
    static async deletePassword(passwordId, transaction) {
        await VideoPasswordModel_1.destroy({
            where: { id: passwordId },
            transaction
        });
    }
    static async isACorrectPassword(options) {
        const query = {
            where: pick(options, ['videoId', 'password'])
        };
        return VideoPasswordModel_1.findOne(query);
    }
    toFormattedJSON() {
        return {
            id: this.id,
            password: this.password,
            videoId: this.videoId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
};
__decorate([
    AllowNull(false),
    Is('VideoPassword', value => throwIfNotValid(value, isPasswordValid, 'videoPassword')),
    Column,
    __metadata("design:type", String)
], VideoPasswordModel.prototype, "password", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoPasswordModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoPasswordModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoPasswordModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoPasswordModel.prototype, "Video", void 0);
VideoPasswordModel = VideoPasswordModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: VideoModel.unscoped(),
                required: true
            }
        ]
    })),
    Table({
        tableName: 'videoPassword',
        indexes: [
            {
                fields: ['videoId', 'password'],
                unique: true
            }
        ]
    })
], VideoPasswordModel);
export { VideoPasswordModel };
//# sourceMappingURL=video-password.js.map