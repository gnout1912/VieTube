import express from 'express';
import { asyncMiddleware, authenticate } from '../../../middlewares/index.js';
import { setupUploadResumableRoutes } from '../../../lib/uploadx.js';
import { getLatestImportStatusValidator, userImportRequestResumableInitValidator, userImportRequestResumableValidator } from '../../../middlewares/validators/users/user-import.js';
import { HttpStatusCode, UserImportState } from '@peertube/peertube-models';
import { logger } from '../../../helpers/logger.js';
import { UserImportModel } from '../../../models/user/user-import.js';
import { getFSUserImportFilePath } from '../../../lib/paths.js';
import { move } from 'fs-extra/esm';
import { JobQueue } from '../../../lib/job-queue/job-queue.js';
import { saveInTransactionWithRetries } from '../../../helpers/database-utils.js';
const userImportRouter = express.Router();
userImportRouter.get('/:userId/imports/latest', authenticate, asyncMiddleware(getLatestImportStatusValidator), asyncMiddleware(getLatestImport));
setupUploadResumableRoutes({
    routePath: '/:userId/imports/import-resumable',
    router: userImportRouter,
    uploadInitAfterMiddlewares: [asyncMiddleware(userImportRequestResumableInitValidator)],
    uploadedMiddlewares: [asyncMiddleware(userImportRequestResumableValidator)],
    uploadedController: asyncMiddleware(addUserImportResumable)
});
export { userImportRouter };
async function addUserImportResumable(req, res) {
    const file = res.locals.importUserFileResumable;
    const user = res.locals.user;
    const userImport = new UserImportModel({
        state: UserImportState.PENDING,
        userId: user.id,
        createdAt: new Date()
    });
    userImport.generateAndSetFilename();
    await move(file.path, getFSUserImportFilePath(userImport));
    await saveInTransactionWithRetries(userImport);
    await JobQueue.Instance.createJob({ type: 'import-user-archive', payload: { userImportId: userImport.id } });
    logger.info('User import request job created for user ' + user.username);
    return res.json({
        userImport: {
            id: userImport.id
        }
    });
}
async function getLatestImport(req, res) {
    const userImport = await UserImportModel.loadLatestByUserId(res.locals.user.id);
    if (!userImport)
        return res.sendStatus(HttpStatusCode.NOT_FOUND_404);
    return res.json(userImport.toFormattedJSON());
}
//# sourceMappingURL=user-imports.js.map