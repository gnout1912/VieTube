var VideoBlacklistModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isVideoBlacklistReasonValid, isVideoBlacklistTypeValid } from '../../helpers/custom-validators/video-blacklist.js';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { SequelizeModel, getBlacklistSort, searchAttribute, throwIfNotValid } from '../shared/index.js';
import { ThumbnailModel } from './thumbnail.js';
import { VideoChannelModel, ScopeNames as VideoChannelScopeNames } from './video-channel.js';
import { VideoModel } from './video.js';
let VideoBlacklistModel = VideoBlacklistModel_1 = class VideoBlacklistModel extends SequelizeModel {
    static listForApi(parameters) {
        const { start, count, sort, search, type } = parameters;
        function buildBaseQuery() {
            return {
                offset: start,
                limit: count,
                order: getBlacklistSort(sort)
            };
        }
        const countQuery = buildBaseQuery();
        const findQuery = buildBaseQuery();
        findQuery.include = [
            {
                model: VideoModel,
                required: true,
                where: searchAttribute(search, 'name'),
                include: [
                    {
                        model: VideoChannelModel.scope({ method: [VideoChannelScopeNames.SUMMARY, { withAccount: true }] }),
                        required: true
                    },
                    {
                        model: ThumbnailModel,
                        attributes: ['type', 'filename'],
                        required: false
                    }
                ]
            }
        ];
        if (type) {
            countQuery.where = { type };
            findQuery.where = { type };
        }
        return Promise.all([
            VideoBlacklistModel_1.count(countQuery),
            VideoBlacklistModel_1.findAll(findQuery)
        ]).then(([count, rows]) => {
            return {
                data: rows,
                total: count
            };
        });
    }
    static loadByVideoId(id) {
        const query = {
            where: {
                videoId: id
            }
        };
        return VideoBlacklistModel_1.findOne(query);
    }
    toFormattedJSON() {
        return {
            id: this.id,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            reason: this.reason,
            unfederated: this.unfederated,
            type: this.type,
            video: this.Video.toFormattedJSON()
        };
    }
};
__decorate([
    AllowNull(true),
    Is('VideoBlacklistReason', value => throwIfNotValid(value, isVideoBlacklistReasonValid, 'reason', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_BLACKLIST.REASON.max)),
    __metadata("design:type", String)
], VideoBlacklistModel.prototype, "reason", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], VideoBlacklistModel.prototype, "unfederated", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('VideoBlacklistType', value => throwIfNotValid(value, isVideoBlacklistTypeValid, 'type')),
    Column,
    __metadata("design:type", Number)
], VideoBlacklistModel.prototype, "type", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoBlacklistModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoBlacklistModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoBlacklistModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoBlacklistModel.prototype, "Video", void 0);
VideoBlacklistModel = VideoBlacklistModel_1 = __decorate([
    Table({
        tableName: 'videoBlacklist',
        indexes: [
            {
                fields: ['videoId'],
                unique: true
            }
        ]
    })
], VideoBlacklistModel);
export { VideoBlacklistModel };
//# sourceMappingURL=video-blacklist.js.map