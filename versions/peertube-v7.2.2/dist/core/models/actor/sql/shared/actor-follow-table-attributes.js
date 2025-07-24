import { __decorate, __metadata } from "tslib";
import { Memoize } from '../../../../helpers/memoize.js';
import { ServerModel } from '../../../server/server.js';
import { ActorModel } from '../../actor.js';
import { ActorFollowModel } from '../../actor-follow.js';
import { ActorImageModel } from '../../actor-image.js';
export class ActorFollowTableAttributes {
    getFollowAttributes() {
        return ActorFollowModel.getSQLAttributes('ActorFollowModel').join(', ');
    }
    getActorAttributes(actorTableName) {
        return ActorModel.getSQLAttributes(actorTableName, `${actorTableName}.`).join(', ');
    }
    getServerAttributes(actorTableName) {
        return ServerModel.getSQLAttributes(`${actorTableName}->Server`, `${actorTableName}.Server.`).join(', ');
    }
    getAvatarAttributes(actorTableName) {
        return ActorImageModel.getSQLAttributes(`${actorTableName}->Avatars`, `${actorTableName}.Avatars.`).join(', ');
    }
}
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ActorFollowTableAttributes.prototype, "getFollowAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActorFollowTableAttributes.prototype, "getActorAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActorFollowTableAttributes.prototype, "getServerAttributes", null);
__decorate([
    Memoize(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActorFollowTableAttributes.prototype, "getAvatarAttributes", null);
//# sourceMappingURL=actor-follow-table-attributes.js.map