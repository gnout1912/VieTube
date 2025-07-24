import { forceNumber } from '@peertube/peertube-core-utils';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import validator from 'validator';
async function doesExist(options) {
    const { sequelize, query, bind, transaction } = options;
    const queryOptions = {
        type: QueryTypes.SELECT,
        bind,
        raw: true,
        transaction
    };
    const results = await sequelize.query(query, queryOptions);
    return results.length === 1;
}
function createSimilarityAttribute(col, value) {
    return Sequelize.fn('similarity', searchTrigramNormalizeCol(col), searchTrigramNormalizeValue(value));
}
function buildWhereIdOrUUID(id) {
    return validator.default.isInt('' + id) ? { id } : { uuid: id };
}
function parseAggregateResult(result) {
    if (!result)
        return 0;
    const total = forceNumber(result);
    if (isNaN(total))
        return 0;
    return total;
}
function parseRowCountResult(result) {
    if (result.length !== 0)
        return result[0].total;
    return 0;
}
function createSafeIn(sequelize, toEscape, additionalUnescaped = []) {
    return toEscape.map(t => {
        return t === null
            ? null
            : sequelize.escape('' + t);
    }).concat(additionalUnescaped).join(', ');
}
function searchAttribute(sourceField, targetField) {
    if (!sourceField)
        return {};
    return {
        [targetField]: {
            [Op.iLike]: `%${sourceField}%`
        }
    };
}
export { buildWhereIdOrUUID, createSafeIn, createSimilarityAttribute, doesExist, parseAggregateResult, parseRowCountResult, searchAttribute };
function searchTrigramNormalizeValue(value) {
    return Sequelize.fn('lower', Sequelize.fn('immutable_unaccent', value));
}
function searchTrigramNormalizeCol(col) {
    return Sequelize.fn('lower', Sequelize.fn('immutable_unaccent', Sequelize.col(col)));
}
//# sourceMappingURL=query.js.map