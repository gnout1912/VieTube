import { __decorate, __metadata } from "tslib";
import { col, fn } from 'sequelize';
import { AllowNull, Column, HasMany, Table } from 'sequelize-typescript';
import { SequelizeModel } from '../shared/index.js';
import { AccountAutomaticTagPolicyModel } from './account-automatic-tag-policy.js';
import { CommentAutomaticTagModel } from './comment-automatic-tag.js';
import { VideoAutomaticTagModel } from './video-automatic-tag.js';
let AutomaticTagModel = class AutomaticTagModel extends SequelizeModel {
    static findOrCreateAutomaticTag(options) {
        const { tag, transaction } = options;
        const query = {
            where: {
                name: tag
            },
            defaults: {
                name: tag
            },
            transaction
        };
        return this.findOrCreate(query)
            .then(([tagInstance]) => tagInstance);
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], AutomaticTagModel.prototype, "name", void 0);
__decorate([
    HasMany(() => CommentAutomaticTagModel, {
        foreignKey: 'automaticTagId',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], AutomaticTagModel.prototype, "CommentAutomaticTags", void 0);
__decorate([
    HasMany(() => VideoAutomaticTagModel, {
        foreignKey: 'automaticTagId',
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], AutomaticTagModel.prototype, "VideoAutomaticTags", void 0);
__decorate([
    HasMany(() => AccountAutomaticTagPolicyModel, {
        foreignKey: {
            name: 'automaticTagId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], AutomaticTagModel.prototype, "AccountAutomaticTagPolicies", void 0);
AutomaticTagModel = __decorate([
    Table({
        tableName: 'automaticTag',
        timestamps: false,
        indexes: [
            {
                fields: ['name'],
                unique: true
            },
            {
                name: 'automatic_tag_lower_name',
                fields: [fn('lower', col('name'))]
            }
        ]
    })
], AutomaticTagModel);
export { AutomaticTagModel };
//# sourceMappingURL=automatic-tag.js.map