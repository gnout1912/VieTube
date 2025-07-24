import { readdir } from 'fs/promises';
import { join } from 'path';
import { QueryTypes } from 'sequelize';
import { currentDir } from '@peertube/peertube-node-utils';
import { logger } from '../helpers/logger.js';
import { LAST_MIGRATION_VERSION } from './constants.js';
import { sequelizeTypescript } from './database.js';
async function migrate() {
    var _a;
    const tables = await sequelizeTypescript.getQueryInterface().showAllTables();
    if (tables.length === 0)
        return;
    let actualVersion = null;
    const query = 'SELECT "migrationVersion" FROM "application"';
    const options = {
        type: QueryTypes.SELECT
    };
    const rows = await sequelizeTypescript.query(query, options);
    if ((_a = rows === null || rows === void 0 ? void 0 : rows[0]) === null || _a === void 0 ? void 0 : _a.migrationVersion) {
        actualVersion = rows[0].migrationVersion;
    }
    if (actualVersion === null) {
        await sequelizeTypescript.query('INSERT INTO "application" ("migrationVersion") VALUES (0)');
        actualVersion = 0;
    }
    if (actualVersion >= LAST_MIGRATION_VERSION)
        return;
    logger.info('Begin migrations.');
    const migrationScripts = await getMigrationScripts();
    for (const migrationScript of migrationScripts) {
        try {
            await executeMigration(actualVersion, migrationScript);
        }
        catch (err) {
            logger.error('Cannot execute migration %s.', migrationScript.version, { err });
            process.exit(-1);
        }
    }
    logger.info('Migrations finished. New migration version schema: %s', LAST_MIGRATION_VERSION);
}
export { migrate };
async function getMigrationScripts() {
    const files = await readdir(join(currentDir(import.meta.url), 'migrations'));
    const filesToMigrate = [];
    files
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
        const version = file.split('-')[0];
        filesToMigrate.push({
            version,
            script: file
        });
    });
    return filesToMigrate;
}
async function executeMigration(actualVersion, entity) {
    const versionScript = parseInt(entity.version, 10);
    if (versionScript <= actualVersion)
        return undefined;
    const migrationScriptName = entity.script;
    logger.info('Executing %s migration script.', migrationScriptName);
    const migrationScript = await import(join(currentDir(import.meta.url), 'migrations', migrationScriptName));
    return sequelizeTypescript.transaction(async (t) => {
        const options = {
            transaction: t,
            queryInterface: sequelizeTypescript.getQueryInterface(),
            sequelize: sequelizeTypescript
        };
        await migrationScript.up(options);
        await sequelizeTypescript.query('UPDATE "application" SET "migrationVersion" = ' + versionScript, { transaction: t });
    });
}
//# sourceMappingURL=migrator.js.map