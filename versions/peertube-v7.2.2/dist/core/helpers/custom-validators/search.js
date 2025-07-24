import validator from 'validator';
import { CONFIG } from '../../initializers/config.js';
import { exists, isArray } from './misc.js';
function isNumberArray(value) {
    return isArray(value) && value.every(v => validator.default.isInt('' + v));
}
function isStringArray(value) {
    return isArray(value) && value.every(v => typeof v === 'string');
}
function isBooleanBothQueryValid(value) {
    return value === 'true' || value === 'false' || value === 'both';
}
function isSearchTargetValid(value) {
    if (!exists(value))
        return true;
    const searchIndexConfig = CONFIG.SEARCH.SEARCH_INDEX;
    if (value === 'local')
        return true;
    if (value === 'search-index' && searchIndexConfig.ENABLED)
        return true;
    return false;
}
export { isNumberArray, isStringArray, isBooleanBothQueryValid, isSearchTargetValid };
//# sourceMappingURL=search.js.map