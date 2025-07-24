var TrackerModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsToMany, Column, CreatedAt, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoModel } from '../video/video.js';
import { VideoTrackerModel } from './video-tracker.js';
import { SequelizeModel } from '../shared/sequelize-type.js';
let TrackerModel = TrackerModel_1 = class TrackerModel extends SequelizeModel {
    static listUrlsByVideoId(videoId) {
        const query = {
            include: [
                {
                    attributes: ['id'],
                    model: VideoModel.unscoped(),
                    required: true,
                    where: { id: videoId }
                }
            ]
        };
        return TrackerModel_1.findAll(query)
            .then(rows => rows.map(rows => rows.url));
    }
    static findOrCreateTrackers(trackers, transaction) {
        if (trackers === null)
            return Promise.resolve([]);
        const tasks = [];
        trackers.forEach(tracker => {
            const query = {
                where: {
                    url: tracker
                },
                defaults: {
                    url: tracker
                },
                transaction
            };
            const promise = TrackerModel_1.findOrCreate(query)
                .then(([trackerInstance]) => trackerInstance);
            tasks.push(promise);
        });
        return Promise.all(tasks);
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], TrackerModel.prototype, "url", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], TrackerModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], TrackerModel.prototype, "updatedAt", void 0);
__decorate([
    BelongsToMany(() => VideoModel, {
        foreignKey: 'trackerId',
        through: () => VideoTrackerModel,
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], TrackerModel.prototype, "Videos", void 0);
TrackerModel = TrackerModel_1 = __decorate([
    Table({
        tableName: 'tracker',
        indexes: [
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], TrackerModel);
export { TrackerModel };
//# sourceMappingURL=tracker.js.map