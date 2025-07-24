var ApplicationModel_1;
import { __decorate, __metadata } from "tslib";
import { getNodeABIVersion } from '../../helpers/version.js';
import memoizee from 'memoizee';
import { AllowNull, Column, Default, DefaultScope, HasOne, IsInt, Table } from 'sequelize-typescript';
import { AccountModel } from '../account/account.js';
import { ActorImageModel } from '../actor/actor-image.js';
import { SequelizeModel } from '../shared/index.js';
export const getServerActor = memoizee(async function () {
    const application = await ApplicationModel.load();
    if (!application)
        throw Error('Could not load Application from database.');
    const actor = application.Account.Actor;
    actor.Account = application.Account;
    const { avatars, banners } = await ActorImageModel.listActorImages(actor);
    actor.Avatars = avatars;
    actor.Banners = banners;
    return actor;
}, { promise: true });
let ApplicationModel = ApplicationModel_1 = class ApplicationModel extends SequelizeModel {
    static countTotal() {
        return ApplicationModel_1.count();
    }
    static load() {
        return ApplicationModel_1.findOne();
    }
    static async nodeABIChanged() {
        const application = await this.load();
        return application.nodeABIVersion !== getNodeABIVersion();
    }
    static async updateNodeVersions() {
        const application = await this.load();
        application.nodeABIVersion = getNodeABIVersion();
        application.nodeVersion = process.version;
        await application.save();
    }
};
__decorate([
    AllowNull(false),
    Default(0),
    IsInt,
    Column,
    __metadata("design:type", Number)
], ApplicationModel.prototype, "migrationVersion", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], ApplicationModel.prototype, "latestPeerTubeVersion", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], ApplicationModel.prototype, "nodeVersion", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], ApplicationModel.prototype, "nodeABIVersion", void 0);
__decorate([
    HasOne(() => AccountModel, {
        foreignKey: {
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], ApplicationModel.prototype, "Account", void 0);
ApplicationModel = ApplicationModel_1 = __decorate([
    DefaultScope(() => ({
        include: [
            {
                model: AccountModel,
                required: true
            }
        ]
    })),
    Table({
        tableName: 'application',
        timestamps: false
    })
], ApplicationModel);
export { ApplicationModel };
//# sourceMappingURL=application.js.map