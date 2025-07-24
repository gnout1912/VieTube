var VideoLiveSessionModel_1;
import { __decorate, __metadata } from "tslib";
import { uuidToShort } from '@peertube/peertube-node-utils';
import { AllowNull, BeforeDestroy, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoLiveReplaySettingModel } from './video-live-replay-setting.js';
import { VideoModel } from './video.js';
import { SequelizeModel } from '../shared/index.js';
export var ScopeNames;
(function (ScopeNames) {
    ScopeNames["WITH_REPLAY"] = "WITH_REPLAY";
})(ScopeNames || (ScopeNames = {}));
let VideoLiveSessionModel = VideoLiveSessionModel_1 = class VideoLiveSessionModel extends SequelizeModel {
    static deleteReplaySetting(instance) {
        return VideoLiveReplaySettingModel.destroy({
            where: {
                id: instance.replaySettingId
            }
        });
    }
    static load(id) {
        return VideoLiveSessionModel_1.findOne({
            where: { id }
        });
    }
    static findSessionOfReplay(replayVideoId) {
        const query = {
            where: {
                replayVideoId
            }
        };
        return VideoLiveSessionModel_1.scope(ScopeNames.WITH_REPLAY).findOne(query);
    }
    static findCurrentSessionOf(videoUUID) {
        return VideoLiveSessionModel_1.findOne({
            where: {
                endDate: null
            },
            include: [
                {
                    model: VideoModel.unscoped(),
                    as: 'LiveVideo',
                    required: true,
                    where: {
                        uuid: videoUUID
                    }
                }
            ],
            order: [['startDate', 'DESC']]
        });
    }
    static findLatestSessionOf(videoId) {
        return VideoLiveSessionModel_1.findOne({
            where: {
                liveVideoId: videoId
            },
            order: [['startDate', 'DESC']]
        });
    }
    static listSessionsOfLiveForAPI(options) {
        const { videoId, count } = options;
        const query = {
            where: {
                liveVideoId: videoId
            },
            limit: count,
            order: [['startDate', 'ASC']]
        };
        return VideoLiveSessionModel_1.scope(ScopeNames.WITH_REPLAY).findAll(query);
    }
    toFormattedJSON() {
        const replayVideo = this.ReplayVideo
            ? {
                id: this.ReplayVideo.id,
                uuid: this.ReplayVideo.uuid,
                shortUUID: uuidToShort(this.ReplayVideo.uuid)
            }
            : undefined;
        const replaySettings = this.replaySettingId
            ? this.ReplaySetting.toFormattedJSON()
            : undefined;
        return {
            id: this.id,
            startDate: this.startDate.toISOString(),
            endDate: this.endDate
                ? this.endDate.toISOString()
                : null,
            endingProcessed: this.endingProcessed,
            saveReplay: this.saveReplay,
            replaySettings,
            replayVideo,
            error: this.error
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoLiveSessionModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoLiveSessionModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.DATE),
    __metadata("design:type", Date)
], VideoLiveSessionModel.prototype, "startDate", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.DATE),
    __metadata("design:type", Date)
], VideoLiveSessionModel.prototype, "endDate", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], VideoLiveSessionModel.prototype, "error", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoLiveSessionModel.prototype, "saveReplay", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoLiveSessionModel.prototype, "endingProcessed", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoLiveSessionModel.prototype, "replayVideoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: true,
            name: 'replayVideoId'
        },
        as: 'ReplayVideo',
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoLiveSessionModel.prototype, "ReplayVideo", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoLiveSessionModel.prototype, "liveVideoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: true,
            name: 'liveVideoId'
        },
        as: 'LiveVideo',
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoLiveSessionModel.prototype, "LiveVideo", void 0);
__decorate([
    ForeignKey(() => VideoLiveReplaySettingModel),
    Column,
    __metadata("design:type", Number)
], VideoLiveSessionModel.prototype, "replaySettingId", void 0);
__decorate([
    BelongsTo(() => VideoLiveReplaySettingModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoLiveSessionModel.prototype, "ReplaySetting", void 0);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoLiveSessionModel]),
    __metadata("design:returntype", void 0)
], VideoLiveSessionModel, "deleteReplaySetting", null);
VideoLiveSessionModel = VideoLiveSessionModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.WITH_REPLAY]: {
            include: [
                {
                    model: VideoModel.unscoped(),
                    as: 'ReplayVideo',
                    required: false
                },
                {
                    model: VideoLiveReplaySettingModel,
                    required: false
                }
            ]
        }
    })),
    Table({
        tableName: 'videoLiveSession',
        indexes: [
            {
                fields: ['replayVideoId'],
                unique: true
            },
            {
                fields: ['liveVideoId']
            },
            {
                fields: ['replaySettingId'],
                unique: true
            }
        ]
    })
], VideoLiveSessionModel);
export { VideoLiveSessionModel };
//# sourceMappingURL=video-live-session.js.map