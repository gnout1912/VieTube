import { isStringArray } from '../../helpers/custom-validators/search.js';
import { AutomaticTagger } from '../../lib/automatic-tags/automatic-tagger.js';
import { body, param } from 'express-validator';
import { doesAccountHandleExist } from './shared/accounts.js';
import { areValidationErrors } from './shared/utils.js';
export const manageAccountAutomaticTagsValidator = [
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
export const updateAutomaticTagPoliciesValidator = [
    ...manageAccountAutomaticTagsValidator,
    body('review')
        .custom(isStringArray).withMessage('Should have a valid review array'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const body = req.body;
        const tagsObj = await AutomaticTagger.getAutomaticTagAvailable(res.locals.account);
        const available = new Set(tagsObj.available.map(({ name }) => name));
        for (const name of body.review) {
            if (!available.has(name)) {
                return res.fail({ message: `${name} is not an available automatic tag` });
            }
        }
        return next();
    }
];
//# sourceMappingURL=automatic-tags.js.map