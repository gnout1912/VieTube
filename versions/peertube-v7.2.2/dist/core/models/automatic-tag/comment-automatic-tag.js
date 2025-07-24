import { __decorate, __metadata } from "tslib";
import { BelongsTo, Column, CreatedAt, ForeignKey, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { AccountModel } from '../account/account.js';
import { SequelizeModel } from '../shared/index.js';
import { VideoCommentModel } from '../video/video-comment.js';
import { AutomaticTagModel } from './automatic-tag.js';
let CommentAutomaticTagModel = class CommentAutomaticTagModel extends SequelizeModel {
    static deleteAllOfAccountAndComment(options) {
        const { accountId, commentId, transaction } = options;
        return this.destroy({
            where: { accountId, commentId },
            transaction
        });
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], CommentAutomaticTagModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], CommentAutomaticTagModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => VideoCommentModel),
    PrimaryKey,
    Column,
    __metadata("design:type", Number)
], CommentAutomaticTagModel.prototype, "commentId", void 0);
__decorate([
    ForeignKey(() => AutomaticTagModel),
    PrimaryKey,
    Column,
    __metadata("design:type", Number)
], CommentAutomaticTagModel.prototype, "automaticTagId", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    PrimaryKey,
    Column,
    __metadata("design:type", Number)
], CommentAutomaticTagModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], CommentAutomaticTagModel.prototype, "Account", void 0);
__decorate([
    BelongsTo(() => AutomaticTagModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], CommentAutomaticTagModel.prototype, "AutomaticTag", void 0);
__decorate([
    BelongsTo(() => VideoCommentModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], CommentAutomaticTagModel.prototype, "VideoComment", void 0);
CommentAutomaticTagModel = __decorate([
    Table({
        tableName: 'commentAutomaticTag'
    })
], CommentAutomaticTagModel);
export { CommentAutomaticTagModel };
//# sourceMappingURL=comment-automatic-tag.js.map