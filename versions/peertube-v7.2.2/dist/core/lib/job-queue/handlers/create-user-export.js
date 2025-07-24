import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { UserExportModel } from '../../../models/user/user-export.js';
import { UserExporter } from '../../user-import-export/user-exporter.js';
import { Emailer } from '../../emailer.js';
const lTags = loggerTagsFactory('user-export');
export async function processCreateUserExport(job) {
    const payload = job.data;
    const exportModel = await UserExportModel.load(payload.userExportId);
    logger.info('Processing create user export %s in job %s.', payload.userExportId, job.id, lTags());
    if (!exportModel) {
        logger.info(`User export ${payload.userExportId} does not exist anymore, do not create user export.`, lTags());
        return;
    }
    const exporter = new UserExporter();
    try {
        await exporter.export(exportModel);
        await Emailer.Instance.addUserExportCompletedOrErroredJob(exportModel);
        logger.info(`User export ${payload.userExportId} has been created`, lTags());
    }
    catch (err) {
        await Emailer.Instance.addUserExportCompletedOrErroredJob(exportModel);
        throw err;
    }
}
//# sourceMappingURL=create-user-export.js.map