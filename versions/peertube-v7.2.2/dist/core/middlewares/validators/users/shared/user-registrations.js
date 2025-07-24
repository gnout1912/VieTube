import { UserRegistrationModel } from '../../../../models/user/user-registration.js';
import { forceNumber, pick } from '@peertube/peertube-core-utils';
import { HttpStatusCode } from '@peertube/peertube-models';
import { getByEmailPermissive } from '../../../../lib/user.js';
export function checkRegistrationIdExist(idArg, res) {
    const id = forceNumber(idArg);
    return checkRegistrationExist(() => UserRegistrationModel.load(id), res);
}
export function checkRegistrationEmailExistPermissive(email, res, abortResponse = true) {
    return checkRegistrationExist(async () => {
        const registrations = await UserRegistrationModel.listByEmailCaseInsensitive(email);
        return getByEmailPermissive(registrations, email);
    }, res, abortResponse);
}
export async function checkRegistrationHandlesDoNotAlreadyExist(options) {
    const { res } = options;
    const registrations = await UserRegistrationModel.listByEmailCaseInsensitiveOrHandle(pick(options, ['username', 'email', 'channelHandle']));
    if (registrations.length !== 0) {
        res.fail({
            status: HttpStatusCode.CONFLICT_409,
            message: 'Registration with this username, channel name or email already exists.'
        });
        return false;
    }
    return true;
}
export async function checkRegistrationExist(finder, res, abortResponse = true) {
    const registration = await finder();
    if (!registration) {
        if (abortResponse === true) {
            res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'User not found'
            });
        }
        return false;
    }
    res.locals.userRegistration = registration;
    return true;
}
//# sourceMappingURL=user-registrations.js.map