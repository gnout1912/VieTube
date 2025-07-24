import { __decorate, __metadata } from "tslib";
import { BelongsTo, Column, CreatedAt, ForeignKey, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { AccountModel } from '../account/account.js';
import { SequelizeModel } from '../shared/index.js';
import { VideoModel } from '../video/video.js';
import { AutomaticTagModel } from './automatic-tag.js';
let VideoAutomaticTagModel = class VideoAutomaticTagModel extends SequelizeModel {
    static deleteAllOfAccountAndVideo(options) {
        const { accountId, videoId, transaction } = options;
        return this.destroy({
            where: { accountId, videoId },
            transaction
        });
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoAutomaticTagModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoAutomaticTagModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    PrimaryKey,
    Column,
    __metadata("design:type", Number)
], VideoAutomaticTagModel.prototype, "videoId", void 0);
__decorate([
    ForeignKey(() => AutomaticTagModel),
    PrimaryKey,
    Column,
    __metadata("design:type", Number)
], VideoAutomaticTagModel.prototype, "automaticTagId", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    PrimaryKey,
    Column,
    __metadata("design:type", Number)
], VideoAutomaticTagModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoAutomaticTagModel.prototype, "Account", void 0);
__decorate([
    BelongsTo(() => AutomaticTagModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoAutomaticTagModel.prototype, "AutomaticTag", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], VideoAutomaticTagModel.prototype, "Video", void 0);
VideoAutomaticTagModel = __decorate([
    Table({
        tableName: 'videoAutomaticTag'
    })
], VideoAutomaticTagModel);
export { VideoAutomaticTagModel };
//# sourceMappingURL=video-automatic-tag.js.map