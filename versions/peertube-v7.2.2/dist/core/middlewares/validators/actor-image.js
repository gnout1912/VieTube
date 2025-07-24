import { body } from 'express-validator';
import { isActorImageFile } from '../../helpers/custom-validators/actor-images.js';
import { cleanUpReqFiles } from '../../helpers/express-utils.js';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { areValidationErrors } from './shared/index.js';
const updateActorImageValidatorFactory = (fieldname) => ([
    body(fieldname).custom((value, { req }) => isActorImageFile(req.files, fieldname)).withMessage('This file is not supported or too large. Please, make sure it is of the following type : ' +
        CONSTRAINTS_FIELDS.ACTORS.IMAGE.EXTNAME.join(', ')),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return cleanUpReqFiles(req);
        return next();
    }
]);
export const updateAvatarValidator = updateActorImageValidatorFactory('avatarfile');
export const updateBannerValidator = updateActorImageValidatorFactory('bannerfile');
//# sourceMappingURL=actor-image.js.map