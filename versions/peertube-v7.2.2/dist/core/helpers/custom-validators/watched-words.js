import validator from 'validator';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { exists, isArray } from './misc.js';
export function isWatchedWordListNameValid(listName) {
    return exists(listName) && validator.default.isLength(listName, CONSTRAINTS_FIELDS.WATCHED_WORDS.LIST_NAME);
}
export function isWatchedWordValid(word) {
    return exists(word) && validator.default.isLength(word, CONSTRAINTS_FIELDS.WATCHED_WORDS.WORD);
}
export function areWatchedWordsValid(words) {
    return isArray(words) &&
        validator.default.isInt(words.length.toString(), CONSTRAINTS_FIELDS.WATCHED_WORDS.WORDS) &&
        words.every(word => isWatchedWordValid(word));
}
//# sourceMappingURL=watched-words.js.map