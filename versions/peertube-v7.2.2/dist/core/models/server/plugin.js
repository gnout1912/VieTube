var PluginModel_1;
import { __decorate, __metadata } from "tslib";
import { PluginType } from '@peertube/peertube-models';
import { QueryTypes, json } from 'sequelize';
import { AllowNull, Column, CreatedAt, DataType, DefaultScope, Is, Table, UpdatedAt } from 'sequelize-typescript';
import { isPluginDescriptionValid, isPluginHomepage, isPluginNameValid, isPluginStableOrUnstableVersionValid, isPluginStableVersionValid, isPluginTypeValid } from '../../helpers/custom-validators/plugins.js';
import { SequelizeModel, getSort, throwIfNotValid } from '../shared/index.js';
let PluginModel = PluginModel_1 = class PluginModel extends SequelizeModel {
    static listEnabledPluginsAndThemes() {
        const query = {
            where: {
                enabled: true,
                uninstalled: false
            }
        };
        return PluginModel_1.findAll(query);
    }
    static loadByNpmName(npmName) {
        const name = this.normalizePluginName(npmName);
        const type = this.getTypeFromNpmName(npmName);
        const query = {
            where: {
                name,
                type
            }
        };
        return PluginModel_1.findOne(query);
    }
    static getSetting(pluginName, pluginType, settingName, registeredSettings) {
        const query = {
            attributes: ['settings'],
            where: {
                name: pluginName,
                type: pluginType
            }
        };
        return PluginModel_1.findOne(query)
            .then(p => {
            if (!(p === null || p === void 0 ? void 0 : p.settings) || p.settings === undefined) {
                const registered = registeredSettings.find(s => s.name === settingName);
                if (!registered || registered.default === undefined)
                    return undefined;
                return registered.default;
            }
            return p.settings[settingName];
        });
    }
    static getSettings(pluginName, pluginType, settingNames, registeredSettings) {
        const query = {
            attributes: ['settings'],
            where: {
                name: pluginName,
                type: pluginType
            }
        };
        return PluginModel_1.findOne(query)
            .then(p => {
            const result = {};
            for (const name of settingNames) {
                if (!(p === null || p === void 0 ? void 0 : p.settings) || p.settings[name] === undefined) {
                    const registered = registeredSettings.find(s => s.name === name);
                    if ((registered === null || registered === void 0 ? void 0 : registered.default) !== undefined) {
                        result[name] = registered.default;
                    }
                }
                else {
                    result[name] = p.settings[name];
                }
            }
            return result;
        });
    }
    static setSetting(pluginName, pluginType, settingName, settingValue) {
        const query = {
            where: {
                name: pluginName,
                type: pluginType
            }
        };
        const toSave = {
            [`settings.${settingName}`]: settingValue
        };
        return PluginModel_1.update(toSave, query)
            .then(() => undefined);
    }
    static getData(pluginName, pluginType, key) {
        const query = {
            raw: true,
            attributes: [[json('storage.' + key), 'value']],
            where: {
                name: pluginName,
                type: pluginType
            }
        };
        return PluginModel_1.findOne(query)
            .then((c) => {
            if (!c)
                return undefined;
            const value = c.value;
            try {
                return JSON.parse(value);
            }
            catch (_a) {
                return value;
            }
        });
    }
    static storeData(pluginName, pluginType, key, data) {
        const query = 'UPDATE "plugin" SET "storage" = jsonb_set(coalesce("storage", \'{}\'), :key, :data::jsonb) ' +
            'WHERE "name" = :pluginName AND "type" = :pluginType';
        const jsonPath = '{' + key + '}';
        const options = {
            replacements: { pluginName, pluginType, key: jsonPath, data: JSON.stringify(data) },
            type: QueryTypes.UPDATE
        };
        return PluginModel_1.sequelize.query(query, options)
            .then(() => undefined);
    }
    static listForApi(options) {
        const { uninstalled = false } = options;
        const query = {
            offset: options.start,
            limit: options.count,
            order: getSort(options.sort),
            where: {
                uninstalled
            }
        };
        if (options.pluginType)
            query.where['type'] = options.pluginType;
        return Promise.all([
            PluginModel_1.count(query),
            PluginModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static listInstalled() {
        const query = {
            where: {
                uninstalled: false
            }
        };
        return PluginModel_1.findAll(query);
    }
    static normalizePluginName(npmName) {
        return npmName.replace(/^peertube-((theme)|(plugin))-/, '');
    }
    static getTypeFromNpmName(npmName) {
        return npmName.startsWith('peertube-plugin-')
            ? PluginType.PLUGIN
            : PluginType.THEME;
    }
    static buildNpmName(name, type) {
        if (type === PluginType.THEME)
            return 'peertube-theme-' + name;
        return 'peertube-plugin-' + name;
    }
    getPublicSettings(registeredSettings) {
        var _a, _b;
        const result = {};
        const settings = this.settings || {};
        for (const r of registeredSettings) {
            if (r.private !== false)
                continue;
            result[r.name] = (_b = (_a = settings[r.name]) !== null && _a !== void 0 ? _a : r.default) !== null && _b !== void 0 ? _b : null;
        }
        return result;
    }
    toFormattedJSON() {
        return {
            name: this.name,
            type: this.type,
            version: this.version,
            latestVersion: this.latestVersion,
            enabled: this.enabled,
            uninstalled: this.uninstalled,
            peertubeEngine: this.peertubeEngine,
            description: this.description,
            homepage: this.homepage,
            settings: this.settings,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
};
__decorate([
    AllowNull(false),
    Is('PluginName', value => throwIfNotValid(value, isPluginNameValid, 'name')),
    Column,
    __metadata("design:type", String)
], PluginModel.prototype, "name", void 0);
__decorate([
    AllowNull(false),
    Is('PluginType', value => throwIfNotValid(value, isPluginTypeValid, 'type')),
    Column,
    __metadata("design:type", Number)
], PluginModel.prototype, "type", void 0);
__decorate([
    AllowNull(false),
    Is('PluginVersion', value => throwIfNotValid(value, isPluginStableOrUnstableVersionValid, 'version')),
    Column,
    __metadata("design:type", String)
], PluginModel.prototype, "version", void 0);
__decorate([
    AllowNull(true),
    Is('PluginLatestVersion', value => throwIfNotValid(value, isPluginStableVersionValid, 'version')),
    Column,
    __metadata("design:type", String)
], PluginModel.prototype, "latestVersion", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], PluginModel.prototype, "enabled", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Boolean)
], PluginModel.prototype, "uninstalled", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], PluginModel.prototype, "peertubeEngine", void 0);
__decorate([
    AllowNull(true),
    Is('PluginDescription', value => throwIfNotValid(value, isPluginDescriptionValid, 'description')),
    Column,
    __metadata("design:type", String)
], PluginModel.prototype, "description", void 0);
__decorate([
    AllowNull(false),
    Is('PluginHomepage', value => throwIfNotValid(value, isPluginHomepage, 'homepage')),
    Column,
    __metadata("design:type", String)
], PluginModel.prototype, "homepage", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.JSONB),
    __metadata("design:type", Object)
], PluginModel.prototype, "settings", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.JSONB),
    __metadata("design:type", Object)
], PluginModel.prototype, "storage", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], PluginModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], PluginModel.prototype, "updatedAt", void 0);
PluginModel = PluginModel_1 = __decorate([
    DefaultScope(() => ({
        attributes: {
            exclude: ['storage']
        }
    })),
    Table({
        tableName: 'plugin',
        indexes: [
            {
                fields: ['name', 'type'],
                unique: true
            }
        ]
    })
], PluginModel);
export { PluginModel };
//# sourceMappingURL=plugin.js.map