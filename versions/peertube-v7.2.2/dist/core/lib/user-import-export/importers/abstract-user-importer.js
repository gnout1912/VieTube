import { getFileSize } from '@peertube/peertube-node-utils';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { pathExists, readJSON, remove } from 'fs-extra/esm';
import { dirname, resolve } from 'path';
const lTags = loggerTagsFactory('user-import');
export class AbstractUserImporter {
    constructor(options) {
        this.user = options.user;
        this.extractedDirectory = options.extractedDirectory;
        this.jsonFilePath = options.jsonFilePath;
    }
    getJSONFilePath() {
        return this.jsonFilePath;
    }
    getSafeArchivePathOrThrow(path) {
        if (!path)
            return undefined;
        const resolved = resolve(dirname(this.jsonFilePath), path);
        if (resolved.startsWith(this.extractedDirectory) !== true) {
            throw new Error(`Static file path ${resolved} is outside the archive directory ${this.extractedDirectory}`);
        }
        return resolved;
    }
    async cleanupImportedStaticFilePaths(archiveFiles) {
        if (!archiveFiles || typeof archiveFiles !== 'object')
            return;
        for (const file of Object.values(archiveFiles)) {
            if (!file)
                continue;
            try {
                if (typeof file === 'string') {
                    await remove(this.getSafeArchivePathOrThrow(file));
                }
                else {
                    for (const subFile of Object.values(file)) {
                        await remove(this.getSafeArchivePathOrThrow(subFile));
                    }
                }
            }
            catch (err) {
                logger.error(`Cannot remove file ${file} after successful import`, Object.assign({ err }, lTags()));
            }
        }
    }
    async isFileValidOrLog(filePath, maxSize) {
        if (!await pathExists(filePath)) {
            logger.warn(`Do not import file ${filePath} that do not exist in zip`, lTags());
            return false;
        }
        const size = await getFileSize(filePath);
        if (size > maxSize) {
            logger.warn(`Do not import too big file ${filePath} (${size} > ${maxSize})`, lTags());
            return false;
        }
        return true;
    }
    async import() {
        const importData = await readJSON(this.jsonFilePath);
        const summary = {
            duplicates: 0,
            success: 0,
            errors: 0
        };
        for (const importObject of this.getImportObjects(importData)) {
            try {
                const sanitized = this.sanitize(importObject);
                if (!sanitized) {
                    logger.warn('Do not import object after invalid sanitization', Object.assign({ importObject }, lTags()));
                    summary.errors++;
                    continue;
                }
                const result = await this.importObject(sanitized);
                await this.cleanupImportedStaticFilePaths(importObject.archiveFiles);
                if (result.duplicate === true)
                    summary.duplicates++;
                else
                    summary.success++;
            }
            catch (err) {
                logger.error('Cannot import object from ' + this.jsonFilePath, Object.assign({ err, importObject }, lTags()));
                summary.errors++;
            }
        }
        return summary;
    }
}
//# sourceMappingURL=abstract-user-importer.js.map