var UserExportModel_1;
import { __decorate, __metadata } from "tslib";
import { FileStorage, UserExportState } from '@peertube/peertube-models';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { JWT_TOKEN_USER_EXPORT_FILE_LIFETIME, DOWNLOAD_PATHS, USER_EXPORT_FILE_PREFIX, USER_EXPORT_STATES, WEBSERVER } from '../../initializers/constants.js';
import { removeUserExportObjectStorage } from '../../lib/object-storage/user-export.js';
import { getFSUserExportFilePath } from '../../lib/paths.js';
import { remove } from 'fs-extra/esm';
import jwt from 'jsonwebtoken';
import { join } from 'path';
import { Op } from 'sequelize';
import { AllowNull, BeforeDestroy, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { doesExist } from '../shared/query.js';
import { SequelizeModel } from '../shared/sequelize-type.js';
import { getSort } from '../shared/sort.js';
import { UserModel } from './user.js';
let UserExportModel = UserExportModel_1 = class UserExportModel extends SequelizeModel {
    static removeFile(instance) {
        logger.info('Removing user export file %s.', instance.filename);
        if (instance.storage === FileStorage.FILE_SYSTEM) {
            remove(getFSUserExportFilePath(instance))
                .catch(err => logger.error('Cannot delete user export archive %s from filesystem.', instance.filename, { err }));
        }
        else {
            removeUserExportObjectStorage(instance)
                .catch(err => logger.error('Cannot delete user export archive %s from object storage.', instance.filename, { err }));
        }
        return undefined;
    }
    static listByUser(user) {
        const query = {
            where: {
                userId: user.id
            }
        };
        return UserExportModel_1.findAll(query);
    }
    static listExpired(expirationTimeMS) {
        const query = {
            where: {
                createdAt: {
                    [Op.lt]: new Date(new Date().getTime() - expirationTimeMS)
                }
            }
        };
        return UserExportModel_1.findAll(query);
    }
    static listForApi(options) {
        const { count, start, user } = options;
        const query = {
            offset: start,
            limit: count,
            order: getSort('createdAt'),
            where: {
                userId: user.id
            }
        };
        return Promise.all([
            UserExportModel_1.count(query),
            UserExportModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static load(id) {
        return UserExportModel_1.findByPk(id);
    }
    static loadByFilename(filename) {
        return UserExportModel_1.findOne({ where: { filename } });
    }
    static async doesOwnedFileExist(filename, storage) {
        const query = 'SELECT 1 FROM "userExport" ' +
            `WHERE "filename" = $filename AND "storage" = $storage LIMIT 1`;
        return doesExist({ sequelize: this.sequelize, query, bind: { filename, storage } });
    }
    generateAndSetFilename() {
        if (!this.userId)
            throw new Error('Cannot generate filename without userId');
        if (!this.createdAt)
            throw new Error('Cannot generate filename without createdAt');
        this.filename = `${USER_EXPORT_FILE_PREFIX}${this.userId}-${this.createdAt.toISOString()}.zip`;
    }
    canBeSafelyRemoved() {
        const supportedStates = new Set([UserExportState.COMPLETED, UserExportState.ERRORED, UserExportState.PENDING]);
        return supportedStates.has(this.state);
    }
    generateJWT() {
        return jwt.sign({
            userExportId: this.id
        }, CONFIG.SECRETS.PEERTUBE, {
            expiresIn: JWT_TOKEN_USER_EXPORT_FILE_LIFETIME,
            audience: this.filename,
            issuer: WEBSERVER.URL
        });
    }
    isJWTValid(jwtToken) {
        try {
            const payload = jwt.verify(jwtToken, CONFIG.SECRETS.PEERTUBE, {
                audience: this.filename,
                issuer: WEBSERVER.URL
            });
            if (payload.userExportId !== this.id)
                return false;
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    getFileDownloadUrl() {
        if (this.state !== UserExportState.COMPLETED)
            return null;
        return WEBSERVER.URL + join(DOWNLOAD_PATHS.USER_EXPORTS, this.filename) + '?jwt=' + this.generateJWT();
    }
    toFormattedJSON() {
        return {
            id: this.id,
            state: {
                id: this.state,
                label: USER_EXPORT_STATES[this.state]
            },
            size: this.size,
            fileUrl: this.fileUrl,
            privateDownloadUrl: this.getFileDownloadUrl(),
            createdAt: this.createdAt.toISOString(),
            expiresOn: new Date(this.createdAt.getTime() + CONFIG.EXPORT.USERS.EXPORT_EXPIRATION).toISOString()
        };
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], UserExportModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], UserExportModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], UserExportModel.prototype, "filename", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], UserExportModel.prototype, "withVideoFiles", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], UserExportModel.prototype, "state", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.TEXT),
    __metadata("design:type", String)
], UserExportModel.prototype, "error", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.BIGINT),
    __metadata("design:type", Number)
], UserExportModel.prototype, "size", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], UserExportModel.prototype, "storage", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], UserExportModel.prototype, "fileUrl", void 0);
__decorate([
    ForeignKey(() => UserModel),
    Column,
    __metadata("design:type", Number)
], UserExportModel.prototype, "userId", void 0);
__decorate([
    BelongsTo(() => UserModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], UserExportModel.prototype, "User", void 0);
__decorate([
    BeforeDestroy,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UserExportModel]),
    __metadata("design:returntype", void 0)
], UserExportModel, "removeFile", null);
UserExportModel = UserExportModel_1 = __decorate([
    Table({
        tableName: 'userExport',
        indexes: [
            {
                fields: ['userId']
            },
            {
                fields: ['filename'],
                unique: true
            }
        ]
    })
], UserExportModel);
export { UserExportModel };
//# sourceMappingURL=user-export.js.map