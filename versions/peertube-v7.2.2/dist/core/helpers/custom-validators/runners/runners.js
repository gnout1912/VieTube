import validator from 'validator';
import { CONSTRAINTS_FIELDS } from '../../../initializers/constants.js';
import { exists } from '../misc.js';
const RUNNERS_CONSTRAINTS_FIELDS = CONSTRAINTS_FIELDS.RUNNERS;
function isRunnerRegistrationTokenValid(value) {
    return exists(value) && validator.default.isLength(value, RUNNERS_CONSTRAINTS_FIELDS.TOKEN);
}
function isRunnerTokenValid(value) {
    return exists(value) && validator.default.isLength(value, RUNNERS_CONSTRAINTS_FIELDS.TOKEN);
}
function isRunnerNameValid(value) {
    return exists(value) && validator.default.isLength(value, RUNNERS_CONSTRAINTS_FIELDS.NAME);
}
function isRunnerDescriptionValid(value) {
    return exists(value) && validator.default.isLength(value, RUNNERS_CONSTRAINTS_FIELDS.DESCRIPTION);
}
export { isRunnerRegistrationTokenValid, isRunnerTokenValid, isRunnerNameValid, isRunnerDescriptionValid };
//# sourceMappingURL=runners.js.map