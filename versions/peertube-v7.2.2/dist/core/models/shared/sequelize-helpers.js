import { Sequelize } from 'sequelize';
function isOutdated(model, refreshInterval) {
    if (!model.createdAt || !model.updatedAt) {
        throw new Error('Miss createdAt & updatedAt attributes to model');
    }
    const now = Date.now();
    const createdAtTime = model.createdAt.getTime();
    const updatedAtTime = model.updatedAt.getTime();
    return (now - createdAtTime) > refreshInterval && (now - updatedAtTime) > refreshInterval;
}
function throwIfNotValid(value, validator, fieldName = 'value', nullable = false) {
    if (nullable && (value === null || value === undefined))
        return;
    if (validator(value) === false) {
        throw new Error(`"${value}" is not a valid ${fieldName}.`);
    }
}
function buildTrigramSearchIndex(indexName, attribute) {
    return {
        name: indexName,
        fields: [Sequelize.literal('lower(immutable_unaccent(' + attribute + ')) gin_trgm_ops')],
        using: 'gin',
        operator: 'gin_trgm_ops'
    };
}
export { throwIfNotValid, buildTrigramSearchIndex, isOutdated };
//# sourceMappingURL=sequelize-helpers.js.map