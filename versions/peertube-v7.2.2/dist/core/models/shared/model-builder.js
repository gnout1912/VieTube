import { logger } from '../../helpers/logger.js';
import isPlainObject from 'lodash-es/isPlainObject.js';
export class ModelBuilder {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.modelRegistry = new Map();
    }
    createModels(jsonArray, baseModelName) {
        const result = [];
        for (const json of jsonArray) {
            const { created, model } = this.createModel(json, baseModelName, json.id + '.' + baseModelName);
            if (created)
                result.push(model);
        }
        return result;
    }
    createModel(json, modelName, keyPath) {
        if (!json.id)
            return { created: false, model: null };
        const { created, model } = this.createOrFindModel(json, modelName, keyPath);
        for (const key of Object.keys(json)) {
            const value = json[key];
            if (!value)
                continue;
            if (isPlainObject(value)) {
                const { created, model: subModel } = this.createModel(value, key, `${keyPath}.${json.id}.${key}`);
                if (!created || !subModel)
                    continue;
                const Model = this.findModelBuilder(modelName);
                const association = Model.associations[key];
                if (!association) {
                    logger.error('Cannot find association %s of model %s', key, modelName, { associations: Object.keys(Model.associations) });
                    continue;
                }
                if (association.isMultiAssociation) {
                    if (!Array.isArray(model[key]))
                        model[key] = [];
                    model[key].push(subModel);
                }
                else {
                    model[key] = subModel;
                }
            }
        }
        return { created, model };
    }
    createOrFindModel(json, modelName, keyPath) {
        const registryKey = this.getModelRegistryKey(json, keyPath);
        if (this.modelRegistry.has(registryKey)) {
            return {
                created: false,
                model: this.modelRegistry.get(registryKey)
            };
        }
        const Model = this.findModelBuilder(modelName);
        if (!Model) {
            logger.error('Cannot build model %s that does not exist', this.buildSequelizeModelName(modelName), { existing: this.sequelize.modelManager.all.map(m => m.name) });
            return { created: false, model: null };
        }
        const model = Model.build(json, { raw: true, isNewRecord: false });
        this.modelRegistry.set(registryKey, model);
        return { created: true, model };
    }
    findModelBuilder(modelName) {
        return this.sequelize.modelManager.getModel(this.buildSequelizeModelName(modelName));
    }
    buildSequelizeModelName(modelName) {
        if (modelName === 'Avatars')
            return 'ActorImageModel';
        if (modelName === 'ActorFollowing')
            return 'ActorModel';
        if (modelName === 'ActorFollower')
            return 'ActorModel';
        if (modelName === 'FlaggedAccount')
            return 'AccountModel';
        if (modelName === 'CommentAutomaticTags')
            return 'CommentAutomaticTagModel';
        return modelName + 'Model';
    }
    getModelRegistryKey(json, keyPath) {
        return keyPath + json.id;
    }
}
//# sourceMappingURL=model-builder.js.map