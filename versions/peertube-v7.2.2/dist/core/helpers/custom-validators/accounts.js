import { isUserDescriptionValid, isUserUsernameValid } from './users.js';
import { exists } from './misc.js';
function isAccountNameValid(value) {
    return isUserUsernameValid(value);
}
function isAccountIdValid(value) {
    return exists(value);
}
function isAccountDescriptionValid(value) {
    return isUserDescriptionValid(value);
}
export { isAccountIdValid, isAccountDescriptionValid, isAccountNameValid };
//# sourceMappingURL=accounts.js.map