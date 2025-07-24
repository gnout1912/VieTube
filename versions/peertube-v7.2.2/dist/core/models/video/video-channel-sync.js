var VideoChannelSyncModel_1;
import { __decorate, __metadata } from "tslib";
import { VideoChannelSyncState } from '@peertube/peertube-models';
import { isUrlValid } from '../../helpers/custom-validators/activitypub/misc.js';
import { isVideoChannelSyncStateValid } from '../../helpers/custom-validators/video-channel-syncs.js';
import { CONSTRAINTS_FIELDS, VIDEO_CHANNEL_SYNC_STATE } from '../../initializers/constants.js';
import { Op } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, DefaultScope, ForeignKey, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { AccountModel } from '../account/account.js';
import { SequelizeModel, getChannelSyncSort, throwIfNotValid } from '../shared/index.js';
import { UserModel } from '../user/user.js';
import { VideoChannelModel } from './video-channel.js';
let VideoChannelSyncModel = VideoChannelSyncModel_1 = class VideoChannelSyncModel extends SequelizeModel {
    static listByAccountForAPI(options) {
        const getQuery = (forCount) => {
            const videoChannelModel = forCount
                ? VideoChannelModel.unscoped()
                : VideoChannelModel;
            return {
                offset: options.start,
                limit: options.count,
                order: getChannelSyncSort(options.sort),
                include: [
                    {
                        model: videoChannelModel,
                        required: true,
                        where: {
                            accountId: options.accountId
                        }
                    }
                ]
            };
        };
        return Promise.all([
            VideoChannelSyncModel_1.unscoped().count(getQuery(true)),
            VideoChannelSyncModel_1.unscoped().findAll(getQuery(false))
        ]).then(([total, data]) => ({ total, data }));
    }
    static countByAccount(accountId) {
        const query = {
            include: [
                {
                    model: VideoChannelModel.unscoped(),
                    required: true,
                    where: {
                        accountId
                    }
                }
            ]
        };
        return VideoChannelSyncModel_1.unscoped().count(query);
    }
    static loadWithChannel(id) {
        return VideoChannelSyncModel_1.findByPk(id);
    }
    static async listSyncs() {
        const query = {
            include: [
                {
                    model: VideoChannelModel.unscoped(),
                    required: true,
                    include: [
                        {
                            model: AccountModel.unscoped(),
                            required: true,
                            include: [{
                                    attributes: [],
                                    model: UserModel.unscoped(),
                                    required: true,
                                    where: {
                                        videoQuota: {
                                            [Op.ne]: 0
                                        },
                                        videoQuotaDaily: {
                                            [Op.ne]: 0
                                        }
                                    }
                                }]
                        }
                    ]
                }
            ]
        };
        return VideoChannelSyncModel_1.unscoped().findAll(query);
    }
    toFormattedJSON() {
        var _a;
        return {
            id: this.id,
            state: {
                id: this.state,
                label: VIDEO_CHANNEL_SYNC_STATE[this.state]
            },
            externalChannelUrl: this.externalChannelUrl,
            createdAt: this.createdAt.toISOString(),
            channel: this.VideoChannel.toFormattedSummaryJSON(),
            lastSyncAt: (_a = this.lastSyncAt) === null || _a === void 0 ? void 0 : _a.toISOString()
        };
    }
};
__decorate([
    AllowNull(false),
    Default(null),
    Is('VideoChannelExternalChannelUrl', value => throwIfNotValid(value, isUrlValid, 'externalChannelUrl', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_CHANNEL_SYNCS.EXTERNAL_CHANNEL_URL.max)),
    __metadata("design:type", String)
], VideoChannelSyncModel.prototype, "externalChannelUrl", void 0);
__decorate([
    AllowNull(false),
    Default(VideoChannelSyncState.WAITING_FIRST_RUN),
    Is('VideoChannelSyncState', value => throwIfNotValid(value, isVideoChannelSyncStateValid, 'state')),
    Column,
    __metadata("design:type", Number)
], VideoChannelSyncModel.prototype, "state", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.DATE),
    __metadata("design:type", Date)
], VideoChannelSyncModel.prototype, "lastSyncAt", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoChannelSyncModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoChannelSyncModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoChannelModel),
    Column,
    __metadata("design:type", Number)
], VideoChannelSyncModel.prototype, "videoChannelId", void 0);
__decorate([
    BelongsTo(() => VideoChannelModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoChannelSyncModel.prototype, "VideoChannel", void 0);
VideoChannelSyncModel = VideoChannelSyncModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: VideoChannelModel,
                required: true
            }
        ]
    })),
    Table({
        tableName: 'videoChannelSync',
        indexes: [
            {
                fields: ['videoChannelId']
            }
        ]
    })
], VideoChannelSyncModel);
export { VideoChannelSyncModel };
//# sourceMappingURL=video-channel-sync.js.map