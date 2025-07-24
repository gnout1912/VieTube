import { program } from 'commander';
import { initDatabaseModels } from '../../core/initializers/database.js';
import { PluginManager } from '../../core/lib/plugins/plugin-manager.js';
program
    .option('-n, --npm-name [npmName]', 'Package name to install')
    .parse(process.argv);
const options = program.opts();
if (!options.npmName) {
    console.error('You need to specify the plugin name.');
    process.exit(-1);
}
run()
    .then(() => process.exit(0))
    .catch(err => {
    console.error(err);
    process.exit(-1);
});
async function run() {
    await initDatabaseModels(true);
    const toUninstall = options.npmName;
    await PluginManager.Instance.uninstall({ npmName: toUninstall, unregister: false });
}
//# sourceMappingURL=uninstall.js.map