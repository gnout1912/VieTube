import { __decorate, __metadata } from "tslib";
import { Memoize } from '../../../../helpers/memoize.js';
import { AccountModel } from '../../../account/account.js';
import { ActorImageModel } from '../../../actor/actor-image.js';
import { ActorModel } from '../../../actor/actor.js';
import { ServerModel } from '../../../server/server.js';
import { buildSQLAttributes } from '../../../shared/sql.js';
import { AutomaticTagModel } from '../../../automatic-tag/automatic-tag.js';
import { VideoCommentModel } from '../../video-comment.js';
import { CommentAutomaticTagModel } from '../../../automatic-tag/comment-automatic-tag.js';
export class VideoCommentTableAttributes {
    getVideoCommentAttributes() {
        return VideoCommentModel.getSQLAttributes('VideoCommentModel').join(', ');
    }
    getAccountAttributes() {
        return AccountModel.getSQLAttributes('Account', 'Account.').join(', ');
    }
    getVideoAttributes() {
        return [
            `"Video"."id" AS "Video.id"`,
            `"Video"."uuid" AS "Video.uuid"`,
            `"Video"."name" AS "Video.name"`
        ].join(', ');
    }
    getActorAttributes() {
        return ActorModel.getSQLAPIAttributes('Account->Actor', `Account.Actor.`).join(', ');
    }
    getServerAttributes() {
        return ServerModel.getSQLAttributes('Account->Actor->Server', `Account.Actor.Server.`).join(', ');
    }
    getAvatarAttributes() {
        return ActorImageModel.getSQLAttributes('Account->Actor->Avatars', 'Account.Actor.Avatars.').join(', ');
    }
    getCommentAutomaticTagAttributes() {
        return buildSQLAttributes({
            model: CommentAutomaticTagModel,
            tableName: 'CommentAutomaticTags',
            aliasPrefix: 'CommentAutomaticTags.',
            idBuilder: ['commentId', 'automaticTagId', 'accountId']
        }).join(', ');
    }
    getAutomaticTagAttributes() {
        return buildSQLAttributes({
            model: AutomaticTagModel,
            tableName: 'CommentAutomaticTags->AutomaticTag',
            aliasPrefix: 'CommentAutomaticTags.AutomaticTag.'
        }).join(', ');
    }
}
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VideoCommentTableAttributes.prototype, "getVideoCommentAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VideoCommentTableAttributes.prototype, "getAccountAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VideoCommentTableAttributes.prototype, "getVideoAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VideoCommentTableAttributes.prototype, "getActorAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VideoCommentTableAttributes.prototype, "getServerAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VideoCommentTableAttributes.prototype, "getAvatarAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VideoCommentTableAttributes.prototype, "getCommentAutomaticTagAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VideoCommentTableAttributes.prototype, "getAutomaticTagAttributes", null);
//# sourceMappingURL=video-comment-table-attributes.js.map