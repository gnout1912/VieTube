import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, ForeignKey, Table } from 'sequelize-typescript';
import { SequelizeModel } from '../shared/index.js';
import { LocalVideoViewerModel } from './local-video-viewer.js';
let LocalVideoViewerWatchSectionModel = class LocalVideoViewerWatchSectionModel extends SequelizeModel {
    static async bulkCreateSections(options) {
        const { localVideoViewerId, watchSections, transaction } = options;
        const models = [];
        for (const section of watchSections) {
            const watchStart = section.start || 0;
            const watchEnd = section.end || 0;
            if (watchStart === watchEnd)
                continue;
            const model = await this.create({
                watchStart,
                watchEnd,
                localVideoViewerId
            }, { transaction });
            models.push(model);
        }
        return models;
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], LocalVideoViewerWatchSectionModel.prototype, "createdAt", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], LocalVideoViewerWatchSectionModel.prototype, "watchStart", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], LocalVideoViewerWatchSectionModel.prototype, "watchEnd", void 0);
__decorate([
    ForeignKey(() => LocalVideoViewerModel),
    Column,
    __metadata("design:type", Number)
], LocalVideoViewerWatchSectionModel.prototype, "localVideoViewerId", void 0);
__decorate([
    BelongsTo(() => LocalVideoViewerModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], LocalVideoViewerWatchSectionModel.prototype, "LocalVideoViewer", void 0);
LocalVideoViewerWatchSectionModel = __decorate([
    Table({
        tableName: 'localVideoViewerWatchSection',
        updatedAt: false,
        indexes: [
            {
                fields: ['localVideoViewerId']
            }
        ]
    })
], LocalVideoViewerWatchSectionModel);
export { LocalVideoViewerWatchSectionModel };
//# sourceMappingURL=local-video-viewer-watch-section.js.map