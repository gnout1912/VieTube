import express from 'express';
import { FileStorage, HttpStatusCode, UserExportState } from '@peertube/peertube-models';
import { asyncMiddleware, authenticate, userExportDeleteValidator, userExportRequestValidator, userExportsListValidator } from '../../../middlewares/index.js';
import { UserExportModel } from '../../../models/user/user-export.js';
import { getFormattedObjects } from '../../../helpers/utils.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { JobQueue } from '../../../lib/job-queue/job-queue.js';
import { CONFIG } from '../../../initializers/config.js';
const userExportsRouter = express.Router();
userExportsRouter.post('/:userId/exports/request', authenticate, asyncMiddleware(userExportRequestValidator), asyncMiddleware(requestExport));
userExportsRouter.get('/:userId/exports', authenticate, asyncMiddleware(userExportsListValidator), asyncMiddleware(listUserExports));
userExportsRouter.delete('/:userId/exports/:id', authenticate, asyncMiddleware(userExportDeleteValidator), asyncMiddleware(deleteUserExport));
export { userExportsRouter };
async function requestExport(req, res) {
    const body = req.body;
    const exportModel = new UserExportModel({
        state: UserExportState.PENDING,
        withVideoFiles: body.withVideoFiles,
        storage: CONFIG.OBJECT_STORAGE.ENABLED
            ? FileStorage.OBJECT_STORAGE
            : FileStorage.FILE_SYSTEM,
        userId: res.locals.user.id,
        createdAt: new Date()
    });
    exportModel.generateAndSetFilename();
    await sequelizeTypescript.transaction(async (transaction) => {
        await exportModel.save({ transaction });
    });
    await JobQueue.Instance.createJob({ type: 'create-user-export', payload: { userExportId: exportModel.id } });
    return res.json({
        export: {
            id: exportModel.id
        }
    });
}
async function listUserExports(req, res) {
    const resultList = await UserExportModel.listForApi({
        start: req.query.start,
        count: req.query.count,
        user: res.locals.user
    });
    return res.json(getFormattedObjects(resultList.data, resultList.total));
}
async function deleteUserExport(req, res) {
    const userExport = res.locals.userExport;
    await sequelizeTypescript.transaction(async (transaction) => {
        await userExport.reload({ transaction });
        if (!userExport.canBeSafelyRemoved()) {
            return res.sendStatus(HttpStatusCode.CONFLICT_409);
        }
        await userExport.destroy({ transaction });
    });
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
//# sourceMappingURL=user-exports.js.map