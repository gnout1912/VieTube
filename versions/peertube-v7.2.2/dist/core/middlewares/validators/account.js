import { UserRight } from '@peertube/peertube-models';
import { param } from 'express-validator';
import { areValidationErrors, checkUserCanManageAccount, doesAccountHandleExist } from './shared/index.js';
export const accountHandleGetValidatorFactory = (options) => {
    const { checkManage, checkIsLocal } = options;
    return [
        param('handle')
            .exists(),
        async (req, res, next) => {
            if (areValidationErrors(req, res))
                return;
            if (!await doesAccountHandleExist({ handle: req.params.handle, res, checkIsLocal, checkManage }))
                return;
            if (options.checkManage) {
                const user = res.locals.oauth.token.User;
                if (!checkUserCanManageAccount({ account: res.locals.account, user, res, specialRight: UserRight.MANAGE_USERS })) {
                    return false;
                }
            }
            return next();
        }
    ];
};
//# sourceMappingURL=account.js.map