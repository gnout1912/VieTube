import { HttpStatusCode } from '@peertube/peertube-models';
import { isIdValid } from '../../helpers/custom-validators/misc.js';
import { areWatchedWordsValid, isWatchedWordListNameValid } from '../../helpers/custom-validators/watched-words.js';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { WatchedWordsListModel } from '../../models/watched-words/watched-words-list.js';
import { body, param } from 'express-validator';
import { doesAccountHandleExist } from './shared/accounts.js';
import { areValidationErrors } from './shared/utils.js';
export const manageAccountWatchedWordsListValidator = [
    param('accountName')
        .exists(),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesAccountHandleExist({ handle: req.params.accountName, res, checkIsLocal: true, checkManage: true }))
            return;
        return next();
    }
];
export function getWatchedWordsListValidatorFactory(accountGetter) {
    return [
        param('listId')
            .custom(isIdValid),
        async (req, res, next) => {
            if (areValidationErrors(req, res))
                return;
            const watchedWordsList = await WatchedWordsListModel.load({ id: +req.params.listId, accountId: (await accountGetter(res)).id });
            if (!watchedWordsList) {
                return res.fail({
                    status: HttpStatusCode.NOT_FOUND_404,
                    message: 'Unknown watched words list id for this account'
                });
            }
            res.locals.watchedWordsList = watchedWordsList;
            return next();
        }
    ];
}
function buildUpdateOrAddValidators({ optional }) {
    const makeOptionalIfNeeded = (chain) => {
        if (optional)
            return chain.optional();
        return chain;
    };
    return [
        makeOptionalIfNeeded(body('listName'))
            .trim()
            .custom(isWatchedWordListNameValid).withMessage(`Should have a list name between ` +
            `${CONSTRAINTS_FIELDS.WATCHED_WORDS.LIST_NAME.min} and ${CONSTRAINTS_FIELDS.WATCHED_WORDS.LIST_NAME.max} characters long`),
        makeOptionalIfNeeded(body('words'))
            .custom(areWatchedWordsValid)
            .withMessage(`Should have an array of up to ${CONSTRAINTS_FIELDS.WATCHED_WORDS.WORDS.max} words between ` +
            `${CONSTRAINTS_FIELDS.WATCHED_WORDS.WORD.min} and ${CONSTRAINTS_FIELDS.WATCHED_WORDS.WORD.max} characters each`)
    ];
}
export function addWatchedWordsListValidatorFactory(accountGetter) {
    return [
        ...buildUpdateOrAddValidators({ optional: false }),
        async (req, res, next) => {
            if (areValidationErrors(req, res))
                return;
            const listName = req.body.listName;
            if (!await checkListNameIsUnique({ accountId: (await accountGetter(res)).id, listName, res }))
                return;
            return next();
        }
    ];
}
export function updateWatchedWordsListValidatorFactory(accountGetter) {
    return [
        ...buildUpdateOrAddValidators({ optional: true }),
        async (req, res, next) => {
            if (areValidationErrors(req, res))
                return;
            const currentList = res.locals.watchedWordsList;
            const listName = req.body.listName;
            if (listName && !await checkListNameIsUnique({ accountId: (await accountGetter(res)).id, listName, currentList, res }))
                return;
            return next();
        }
    ];
}
async function checkListNameIsUnique(options) {
    const { accountId, listName, currentList, res } = options;
    const existing = await WatchedWordsListModel.loadByListName({ accountId, listName });
    if (existing && (!currentList || currentList.id !== existing.id)) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: `Watched words list with name ${listName} already exists`
        });
        return false;
    }
    return true;
}
//# sourceMappingURL=watched-words.js.map