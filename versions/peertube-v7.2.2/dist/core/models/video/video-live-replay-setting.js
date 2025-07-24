var VideoLiveReplaySettingModel_1;
import { __decorate, __metadata } from "tslib";
import { isVideoPrivacyValid } from '../../helpers/custom-validators/videos.js';
import { AllowNull, Column, CreatedAt, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { throwIfNotValid } from '../shared/sequelize-helpers.js';
import { SequelizeModel } from '../shared/index.js';
let VideoLiveReplaySettingModel = VideoLiveReplaySettingModel_1 = class VideoLiveReplaySettingModel extends SequelizeModel {
    static load(id, transaction) {
        return VideoLiveReplaySettingModel_1.findOne({
            where: { id },
            transaction
        });
    }
    static removeSettings(id) {
        return VideoLiveReplaySettingModel_1.destroy({
            where: { id }
        });
    }
    toFormattedJSON() {
        return {
            privacy: this.privacy
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], VideoLiveReplaySettingModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], VideoLiveReplaySettingModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Is('VideoPrivacy', value => throwIfNotValid(value, isVideoPrivacyValid, 'privacy')),
    Column,
    __metadata("design:type", Number)
], VideoLiveReplaySettingModel.prototype, "privacy", void 0);
VideoLiveReplaySettingModel = VideoLiveReplaySettingModel_1 = __decorate([
    Table({
        tableName: 'videoLiveReplaySetting'
    })
], VideoLiveReplaySettingModel);
export { VideoLiveReplaySettingModel };
//# sourceMappingURL=video-live-replay-setting.js.map