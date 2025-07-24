import { forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { AccountModel } from '../../../models/account/account.js';
import { checkUserCanManageAccount } from './users.js';
export async function doesAccountIdExist(options) {
    const { id, res, checkIsLocal, checkManage } = options;
    const account = await AccountModel.load(forceNumber(id));
    return doesAccountExist({ account, res, checkIsLocal, checkManage });
}
export async function doesAccountHandleExist(options) {
    const { handle, res, checkIsLocal, checkManage } = options;
    const account = await AccountModel.loadByHandle(handle);
    return doesAccountExist({ account, res, checkIsLocal, checkManage });
}
function doesAccountExist(options) {
    const { account, res, checkIsLocal, checkManage } = options;
    if (!account) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Account not found'
        });
        return false;
    }
    if (checkManage) {
        const user = res.locals.oauth.token.User;
        if (!checkUserCanManageAccount({ account, user, res, specialRight: UserRight.MANAGE_USERS })) {
            return false;
        }
    }
    if (checkIsLocal && account.Actor.isOwned() === false) {
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'This account is not owned.'
        });
        return false;
    }
    res.locals.account = account;
    return true;
}
//# sourceMappingURL=accounts.js.map