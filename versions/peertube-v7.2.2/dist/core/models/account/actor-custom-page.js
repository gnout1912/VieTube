var ActorCustomPageModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { ActorModel } from '../actor/actor.js';
import { getServerActor } from '../application/application.js';
import { SequelizeModel } from '../shared/index.js';
let ActorCustomPageModel = ActorCustomPageModel_1 = class ActorCustomPageModel extends SequelizeModel {
    static async updateInstanceHomepage(content) {
        const serverActor = await getServerActor();
        return ActorCustomPageModel_1.upsert({
            content,
            actorId: serverActor.id,
            type: 'homepage'
        });
    }
    static async loadInstanceHomepage() {
        const serverActor = await getServerActor();
        return ActorCustomPageModel_1.findOne({
            where: {
                actorId: serverActor.id
            }
        });
    }
    toFormattedJSON() {
        return {
            content: this.content
        };
    }
};
__decorate([
    AllowNull(true),
    Column(DataType.TEXT),
    __metadata("design:type", String)
], ActorCustomPageModel.prototype, "content", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], ActorCustomPageModel.prototype, "type", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], ActorCustomPageModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], ActorCustomPageModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => ActorModel),
    Column,
    __metadata("design:type", Number)
], ActorCustomPageModel.prototype, "actorId", void 0);
__decorate([
    BelongsTo(() => ActorModel, {
        foreignKey: {
            name: 'actorId',
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], ActorCustomPageModel.prototype, "Actor", void 0);
ActorCustomPageModel = ActorCustomPageModel_1 = __decorate([
    Table({
        tableName: 'actorCustomPage',
        indexes: [
            {
                fields: ['actorId', 'type'],
                unique: true
            }
        ]
    })
], ActorCustomPageModel);
export { ActorCustomPageModel };
//# sourceMappingURL=actor-custom-page.js.map