var VideoImportModel_1;
import { __decorate, __metadata } from "tslib";
import { VideoImportState } from '@peertube/peertube-models';
import { afterCommitIfTransaction } from '../../helpers/database-utils.js';
import { Op } from 'sequelize';
import { AfterUpdate, AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, DefaultScope, ForeignKey, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isVideoImportStateValid, isVideoImportTargetUrlValid } from '../../helpers/custom-validators/video-imports.js';
import { isVideoMagnetUriValid } from '../../helpers/custom-validators/videos.js';
import { CONSTRAINTS_FIELDS, VIDEO_IMPORT_STATES } from '../../initializers/constants.js';
import { SequelizeModel, getSort, searchAttribute, throwIfNotValid } from '../shared/index.js';
import { UserModel } from '../user/user.js';
import { VideoChannelSyncModel } from './video-channel-sync.js';
import { VideoModel, ScopeNames as VideoModelScopeNames } from './video.js';
const defaultVideoScope = () => {
    return VideoModel.scope([
        VideoModelScopeNames.WITH_ACCOUNT_DETAILS,
        VideoModelScopeNames.WITH_TAGS,
        VideoModelScopeNames.WITH_THUMBNAILS
    ]);
};
let VideoImportModel = VideoImportModel_1 = class VideoImportModel extends SequelizeModel {
    static deleteVideoIfFailed(instance, options) {
        if (instance.state === VideoImportState.FAILED) {
            return afterCommitIfTransaction(options.transaction, () => instance.Video.destroy());
        }
        return undefined;
    }
    static loadAndPopulateVideo(id) {
        return VideoImportModel_1.findByPk(id);
    }
    static listUserVideoImportsForApi(options) {
        const { userId, start, count, sort, targetUrl, videoChannelSyncId, search } = options;
        const where = [{ userId }];
        const include = [
            {
                attributes: ['id'],
                model: UserModel.unscoped(),
                required: true
            },
            {
                model: VideoChannelSyncModel.unscoped(),
                required: false
            }
        ];
        if (targetUrl)
            where.push({ targetUrl });
        if (videoChannelSyncId)
            where.push({ videoChannelSyncId });
        if (search) {
            include.push({
                model: defaultVideoScope(),
                required: false
            });
            where.push({
                [Op.or]: [
                    searchAttribute(search, '$Video.name$'),
                    searchAttribute(search, 'targetUrl'),
                    searchAttribute(search, 'torrentName'),
                    searchAttribute(search, 'magnetUri')
                ]
            });
        }
        else {
            include.push({
                model: defaultVideoScope(),
                required: false
            });
        }
        const query = {
            distinct: true,
            include,
            offset: start,
            limit: count,
            order: getSort(sort),
            where
        };
        return Promise.all([
            VideoImportModel_1.unscoped().count(query),
            VideoImportModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static async urlAlreadyImported(channelId, targetUrl) {
        const element = await VideoImportModel_1.unscoped().findOne({
            where: {
                targetUrl,
                state: {
                    [Op.in]: [VideoImportState.PENDING, VideoImportState.PROCESSING, VideoImportState.SUCCESS]
                },
                videoChannelSyncId: channelId
            }
        });
        return !!element;
    }
    getTargetIdentifier() {
        return this.targetUrl || this.magnetUri || this.torrentName;
    }
    toFormattedJSON() {
        const videoFormatOptions = {
            completeDescription: true,
            additionalAttributes: { state: true, waitTranscoding: true, scheduledUpdate: true }
        };
        const video = this.Video
            ? Object.assign(this.Video.toFormattedJSON(videoFormatOptions), { tags: this.Video.Tags.map(t => t.name) })
            : undefined;
        const videoChannelSync = this.VideoChannelSync
            ? { id: this.VideoChannelSync.id, externalChannelUrl: this.VideoChannelSync.externalChannelUrl }
            : undefined;
        return {
            id: this.id,
            targetUrl: this.targetUrl,
            magnetUri: this.magnetUri,
            torrentName: this.torrentName,
            state: {
                id: this.state,
                label: VideoImportModel_1.getStateLabel(this.state)
            },
            error: this.error,
            updatedAt: this.updatedAt.toISOString(),
            createdAt: this.createdAt.toISOString(),
            video,
            videoChannelSync
        };
    }
    static getStateLabel(id) {
        return VIDEO_IMPORT_STATES[id] || 'Unknown';
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoImportModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoImportModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('VideoImportTargetUrl', value => throwIfNotValid(value, isVideoImportTargetUrlValid, 'targetUrl', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_IMPORTS.URL.max)),
    __metadata("design:type", String)
], VideoImportModel.prototype, "targetUrl", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Is('VideoImportMagnetUri', value => throwIfNotValid(value, isVideoMagnetUriValid, 'magnetUri', true)),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_IMPORTS.URL.max)),
    __metadata("design:type", String)
], VideoImportModel.prototype, "magnetUri", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.VIDEO_IMPORTS.TORRENT_NAME.max)),
    __metadata("design:type", String)
], VideoImportModel.prototype, "torrentName", void 0);
__decorate([
    AllowNull(false),
    Default(null),
    Is('VideoImportState', value => throwIfNotValid(value, isVideoImportStateValid, 'state')),
    Column,
    __metadata("design:type", Number)
], VideoImportModel.prototype, "state", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.TEXT),
    __metadata("design:type", String)
], VideoImportModel.prototype, "error", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], VideoImportModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], VideoImportModel.prototype, "User", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], VideoImportModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoImportModel.prototype, "Video", void 0);
__decorate([
    ForeignKey(() => VideoChannelSyncModel),
    Column,
    __metadata("design:type", Number)
], VideoImportModel.prototype, "videoChannelSyncId", void 0);
__decorate([
    BelongsTo(() => VideoChannelSyncModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'set null'
    }),
    __metadata("design:type", Object)
], VideoImportModel.prototype, "VideoChannelSync", void 0);
__decorate([
    AfterUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoImportModel, Object]),
    __metadata("design:returntype", void 0)
], VideoImportModel, "deleteVideoIfFailed", null);
VideoImportModel = VideoImportModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: UserModel.unscoped(),
                required: true
            },
            {
                model: defaultVideoScope(),
                required: false
            },
            {
                model: VideoChannelSyncModel.unscoped(),
                required: false
            }
        ]
    })),
    Table({
        tableName: 'videoImport',
        indexes: [
            {
                fields: ['videoId'],
                unique: true
            },
            {
                fields: ['userId']
            }
        ]
    })
], VideoImportModel);
export { VideoImportModel };
//# sourceMappingURL=video-import.js.map