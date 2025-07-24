import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { UserImportModel } from '../../../models/user/user-import.js';
import { UserImporter } from '../../user-import-export/user-importer.js';
import { Emailer } from '../../emailer.js';
const lTags = loggerTagsFactory('user-import');
export async function processImportUserArchive(job) {
    const payload = job.data;
    const importModel = await UserImportModel.load(payload.userImportId);
    logger.info(`Processing importing user archive ${payload.userImportId} in job ${job.id}`, lTags());
    if (!importModel) {
        logger.info(`User import ${payload.userImportId} does not exist anymore, do not create import data.`, lTags());
        return;
    }
    const exporter = new UserImporter();
    await exporter.import(importModel);
    try {
        await Emailer.Instance.addUserImportSuccessJob(importModel);
        logger.info(`User import ${payload.userImportId} ended`, lTags());
    }
    catch (err) {
        await Emailer.Instance.addUserImportErroredJob(importModel);
        throw err;
    }
}
//# sourceMappingURL=import-user-archive.js.map