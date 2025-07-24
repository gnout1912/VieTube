import validator from 'validator';
import { UserNotificationSettingValue } from '@peertube/peertube-models';
import { exists } from './misc.js';
function isUserNotificationTypeValid(value) {
    return exists(value) && validator.default.isInt('' + value);
}
function isUserNotificationSettingValid(value) {
    return exists(value) &&
        validator.default.isInt('' + value) &&
        (value === UserNotificationSettingValue.NONE ||
            value === UserNotificationSettingValue.WEB ||
            value === UserNotificationSettingValue.EMAIL ||
            value === (UserNotificationSettingValue.WEB | UserNotificationSettingValue.EMAIL));
}
export { isUserNotificationSettingValid, isUserNotificationTypeValid };
//# sourceMappingURL=user-notifications.js.map