var ServerModel_1;
import { __decorate, __metadata } from "tslib";
import { AllowNull, Column, CreatedAt, Default, HasMany, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isHostValid } from '../../helpers/custom-validators/servers.js';
import { ActorModel } from '../actor/actor.js';
import { SequelizeModel, buildSQLAttributes, throwIfNotValid } from '../shared/index.js';
import { ServerBlocklistModel } from './server-blocklist.js';
let ServerModel = ServerModel_1 = class ServerModel extends SequelizeModel {
    static getSQLAttributes(tableName, aliasPrefix = '') {
        return buildSQLAttributes({
            model: this,
            tableName,
            aliasPrefix
        });
    }
    static load(id, transaction) {
        const query = {
            where: {
                id
            },
            transaction
        };
        return ServerModel_1.findOne(query);
    }
    static loadByHost(host) {
        const query = {
            where: {
                host
            }
        };
        return ServerModel_1.findOne(query);
    }
    static async loadOrCreateByHost(host) {
        let server = await ServerModel_1.loadByHost(host);
        if (!server)
            server = await ServerModel_1.create({ host });
        return server;
    }
    isBlocked() {
        return this.BlockedBy && this.BlockedBy.length !== 0;
    }
    toFormattedJSON() {
        return {
            host: this.host
        };
    }
};
__decorate([
    AllowNull(false),
    Is('Host', value => throwIfNotValid(value, isHostValid, 'valid host')),
    Column,
    __metadata("design:type", String)
], ServerModel.prototype, "host", void 0);
__decorate([
    AllowNull(false),
    Default(false),
    Column,
    __metadata("design:type", Boolean)
], ServerModel.prototype, "redundancyAllowed", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], ServerModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], ServerModel.prototype, "updatedAt", void 0);
__decorate([
    HasMany(() => ActorModel, {
        foreignKey: {
            name: 'serverId',
            allowNull: true
        },
        onDelete: 'CASCADE',
        hooks: true
    }),
    __metadata("design:type", Array)
], ServerModel.prototype, "Actors", void 0);
__decorate([
    HasMany(() => ServerBlocklistModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], ServerModel.prototype, "BlockedBy", void 0);
ServerModel = ServerModel_1 = __decorate([
    Table({
        tableName: 'server',
        indexes: [
            {
                fields: ['host'],
                unique: true
            }
        ]
    })
], ServerModel);
export { ServerModel };
//# sourceMappingURL=server.js.map