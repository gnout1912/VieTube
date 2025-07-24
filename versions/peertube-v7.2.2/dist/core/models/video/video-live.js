var VideoLiveModel_1;
import { __decorate, __metadata } from "tslib";
import { VideoState } from '@peertube/peertube-models';
import { CONFIG } from '../../initializers/config.js';
import { WEBSERVER } from '../../initializers/constants.js';
import { AllowNull, BeforeDestroy, BelongsTo, Column, CreatedAt, DataType, DefaultScope, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { VideoBlacklistModel } from './video-blacklist.js';
import { VideoLiveReplaySettingModel } from './video-live-replay-setting.js';
import { VideoModel } from './video.js';
import { SequelizeModel } from '../shared/index.js';
let VideoLiveModel = VideoLiveModel_1 = class VideoLiveModel extends SequelizeModel {
    static deleteReplaySetting(instance, options) {
        return VideoLiveReplaySettingModel.destroy({
            where: {
                id: instance.replaySettingId
            },
            transaction: options.transaction
        });
    }
    static loadByStreamKey(streamKey) {
        const query = {
            where: {
                streamKey
            },
            include: [
                {
                    model: VideoModel.unscoped(),
                    required: true,
                    where: {
                        state: VideoState.WAITING_FOR_LIVE
                    },
                    include: [
                        {
                            model: VideoBlacklistModel.unscoped(),
                            required: false
                        }
                    ]
                },
                {
                    model: VideoLiveReplaySettingModel.unscoped(),
                    required: false
                }
            ]
        };
        return VideoLiveModel_1.findOne(query);
    }
    static loadByVideoId(videoId) {
        const query = {
            where: {
                videoId
            }
        };
        return VideoLiveModel_1.findOne(query);
    }
    static loadByVideoIdWithSettings(videoId) {
        const query = {
            where: {
                videoId
            },
            include: [
                {
                    model: VideoLiveReplaySettingModel.unscoped(),
                    required: false
                }
            ]
        };
        return VideoLiveModel_1.findOne(query);
    }
    toFormattedJSON(canSeePrivateInformation) {
        let privateInformation = {};
        if (this.streamKey && canSeePrivateInformation === true) {
            privateInformation = {
                streamKey: this.streamKey,
                rtmpUrl: CONFIG.LIVE.RTMP.ENABLED
                    ? WEBSERVER.RTMP_BASE_LIVE_URL
                    : null,
                rtmpsUrl: CONFIG.LIVE.RTMPS.ENABLED
                    ? WEBSERVER.RTMPS_BASE_LIVE_URL
                    : null
            };
        }
        const replaySettings = this.replaySettingId
            ? this.ReplaySetting.toFormattedJSON()
            : undefined;
        return Object.assign(Object.assign({}, privateInformation), { permanentLive: this.permanentLive, saveReplay: this.saveReplay, replaySettings, latencyMode: this.latencyMode });
    }
};
__decorate([
    AllowNull(true),
    Column(DataType.STRING),
    __metadata("design:type", String)
], VideoLiveModel.prototype, "streamKey", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoLiveModel.prototype, "saveReplay", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoLiveModel.prototype, "permanentLive", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], VideoLiveModel.prototype, "latencyMode", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoLiveModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoLiveModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoLiveModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoLiveModel.prototype, "Video", void 0);
__decorate([
    ForeignKey(() => VideoLiveReplaySettingModel),
    Column,
    __metadata("design:type", Number)
], VideoLiveModel.prototype, "replaySettingId", void 0);
__decorate([
    BelongsTo(() => VideoLiveReplaySettingModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoLiveModel.prototype, "ReplaySetting", void 0);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoLiveModel, Object]),
    __metadata("design:returntype", void 0)
], VideoLiveModel, "deleteReplaySetting", null);
VideoLiveModel = VideoLiveModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: VideoModel,
                required: true,
                include: [
                    {
                        model: VideoBlacklistModel,
                        required: false
                    }
                ]
            },
            {
                model: VideoLiveReplaySettingModel,
                required: false
            }
        ]
    })),
    Table({
        tableName: 'videoLive',
        indexes: [
            {
                fields: ['videoId'],
                unique: true
            },
            {
                fields: ['replaySettingId'],
                unique: true
            }
        ]
    })
], VideoLiveModel);
export { VideoLiveModel };
//# sourceMappingURL=video-live.js.map