var VideoChangeOwnershipModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, ForeignKey, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { AccountModel } from '../account/account.js';
import { SequelizeModel, getSort } from '../shared/index.js';
import { VideoModel, ScopeNames as VideoScopeNames } from './video.js';
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["WITH_ACCOUNTS"] = "WITH_ACCOUNTS";
    ScopeNames["WITH_VIDEO"] = "WITH_VIDEO";
})(ScopeNames || (ScopeNames = {}));
let VideoChangeOwnershipModel = VideoChangeOwnershipModel_1 = class VideoChangeOwnershipModel extends SequelizeModel {
    static listForApi(nextOwnerId, start, count, sort) {
        const query = {
            offset: start,
            limit: count,
            order: getSort(sort),
            where: {
                nextOwnerAccountId: nextOwnerId
            }
        };
        return Promise.all([
            VideoChangeOwnershipModel_1.count(query),
            VideoChangeOwnershipModel_1.scope([ScopeNames.WITH_ACCOUNTS, ScopeNames.WITH_VIDEO]).findAll(query)
        ]).then(([count, rows]) => ({ total: count, data: rows }));
    }
    static load(id) {
        return VideoChangeOwnershipModel_1.scope([ScopeNames.WITH_ACCOUNTS, ScopeNames.WITH_VIDEO])
            .findByPk(id);
    }
    toFormattedJSON() {
        return {
            id: this.id,
            status: this.status,
            initiatorAccount: this.Initiator.toFormattedJSON(),
            nextOwnerAccount: this.NextOwner.toFormattedJSON(),
            video: this.Video.toFormattedJSON(),
            createdAt: this.createdAt
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoChangeOwnershipModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoChangeOwnershipModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], VideoChangeOwnershipModel.prototype, "status", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], VideoChangeOwnershipModel.prototype, "initiatorAccountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            name: 'initiatorAccountId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoChangeOwnershipModel.prototype, "Initiator", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], VideoChangeOwnershipModel.prototype, "nextOwnerAccountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            name: 'nextOwnerAccountId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoChangeOwnershipModel.prototype, "NextOwner", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoChangeOwnershipModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoChangeOwnershipModel.prototype, "Video", void 0);
VideoChangeOwnershipModel = VideoChangeOwnershipModel_1 = __decorate([
    Table({
        tableName: 'videoChangeOwnership',
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: ['initiatorAccountId']
            },
            {
                fields: ['nextOwnerAccountId']
            }
        ]
    }),
    Scopes(() => ({
        [ScopeNames.WITH_ACCOUNTS]: {
            include: [
                {
                    model: AccountModel,
                    as: 'Initiator',
                    required: true
                },
                {
                    model: AccountModel,
                    as: 'NextOwner',
                    required: true
                }
            ]
        },
        [ScopeNames.WITH_VIDEO]: {
            include: [
                {
                    model: VideoModel.scope([
                        VideoScopeNames.WITH_THUMBNAILS,
                        VideoScopeNames.WITH_WEB_VIDEO_FILES,
                        VideoScopeNames.WITH_STREAMING_PLAYLISTS,
                        VideoScopeNames.WITH_ACCOUNT_DETAILS
                    ]),
                    required: true
                }
            ]
        }
    }))
], VideoChangeOwnershipModel);
export { VideoChangeOwnershipModel };
//# sourceMappingURL=video-change-ownership.js.map