var ActorImageModel_1;
import { __decorate, __metadata } from "tslib";
import { ActorImageType } from '@peertube/peertube-models';
import { getLowercaseExtension } from '@peertube/peertube-node-utils';
import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { Op } from 'sequelize';
import { AfterDestroy, AllowNull, BelongsTo, Column, CreatedAt, Default, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { LAZY_STATIC_PATHS, MIMETYPES, WEBSERVER } from '../../initializers/constants.js';
import { SequelizeModel, buildSQLAttributes } from '../shared/index.js';
import { ActorModel } from './actor.js';
let ActorImageModel = ActorImageModel_1 = class ActorImageModel extends SequelizeModel {
    static removeFile(instance) {
        logger.info('Removing actor image file %s.', instance.filename);
        instance.removeImage()
            .catch(err => logger.error('Cannot remove actor image file %s.', instance.filename, { err }));
    }
    static getSQLAttributes(tableName, aliasPrefix = '') {
        return buildSQLAttributes({
            model: this,
            tableName,
            aliasPrefix
        });
    }
    static loadByFilename(filename) {
        const query = {
            where: {
                filename
            }
        };
        return ActorImageModel_1.findOne(query);
    }
    static listByActor(actor, type) {
        const query = {
            where: {
                actorId: actor.id,
                type
            }
        };
        return ActorImageModel_1.findAll(query);
    }
    static async listActorImages(actor) {
        const promises = [ActorImageType.AVATAR, ActorImageType.BANNER].map(type => ActorImageModel_1.listByActor(actor, type));
        const [avatars, banners] = await Promise.all(promises);
        return { avatars, banners };
    }
    static listRemoteOnDisk() {
        return this.findAll({
            where: {
                onDisk: true
            },
            include: [
                {
                    attributes: ['id'],
                    model: ActorModel.unscoped(),
                    required: true,
                    where: {
                        serverId: {
                            [Op.ne]: null
                        }
                    }
                }
            ]
        });
    }
    static getImageUrl(image) {
        if (!image)
            return undefined;
        return WEBSERVER.URL + image.getStaticPath();
    }
    toFormattedJSON() {
        return {
            width: this.width,
            path: this.getStaticPath(),
            fileUrl: ActorImageModel_1.getImageUrl(this),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    toActivityPubObject() {
        const extension = getLowercaseExtension(this.filename);
        return {
            type: 'Image',
            mediaType: MIMETYPES.IMAGE.EXT_MIMETYPE[extension],
            height: this.height,
            width: this.width,
            url: ActorImageModel_1.getImageUrl(this)
        };
    }
    getStaticPath() {
        switch (this.type) {
            case ActorImageType.AVATAR:
                return join(LAZY_STATIC_PATHS.AVATARS, this.filename);
            case ActorImageType.BANNER:
                return join(LAZY_STATIC_PATHS.BANNERS, this.filename);
            default:
                throw new Error('Unknown actor image type: ' + this.type);
        }
    }
    getPath() {
        return join(CONFIG.STORAGE.ACTOR_IMAGES_DIR, this.filename);
    }
    removeImage() {
        const imagePath = join(CONFIG.STORAGE.ACTOR_IMAGES_DIR, this.filename);
        return remove(imagePath);
    }
    isOwned() {
        return !this.fileUrl;
    }
};
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], ActorImageModel.prototype, "filename", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Number)
], ActorImageModel.prototype, "height", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column,
    __metadata("design:type", Number)
], ActorImageModel.prototype, "width", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], ActorImageModel.prototype, "fileUrl", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], ActorImageModel.prototype, "onDisk", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], ActorImageModel.prototype, "type", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], ActorImageModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], ActorImageModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => ActorModel),
    Column,
    __metadata("design:type", Number)
], ActorImageModel.prototype, "actorId", void 0);
__decorate([
    BelongsTo(() => ActorModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], ActorImageModel.prototype, "Actor", void 0);
__decorate([
    AfterDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ActorImageModel]),
    __metadata("design:returntype", void 0)
], ActorImageModel, "removeFile", null);
ActorImageModel = ActorImageModel_1 = __decorate([
    Table({
        tableName: 'actorImage',
        indexes: [
            {
                fields: ['filename'],
                unique: true
            },
            {
                fields: ['actorId', 'type', 'width'],
                unique: true
            }
        ]
    })
], ActorImageModel);
export { ActorImageModel };
//# sourceMappingURL=actor-image.js.map