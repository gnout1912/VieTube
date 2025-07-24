import { sanitizeUrl } from '../../helpers/core-utils.js';
import { logger } from '../../helpers/logger.js';
import { doJSONRequest } from '../../helpers/requests.js';
import { CONFIG } from '../../initializers/config.js';
import { PEERTUBE_VERSION } from '../../initializers/constants.js';
import { PluginModel } from '../../models/server/plugin.js';
import { PluginManager } from './plugin-manager.js';
export async function listAvailablePluginsFromIndex(options) {
    const { start = 0, count = 20, search, sort = 'npmName', pluginType } = options;
    const searchParams = {
        start,
        count,
        sort,
        pluginType,
        search,
        currentPeerTubeEngine: options.currentPeerTubeEngine || PEERTUBE_VERSION
    };
    const uri = CONFIG.PLUGINS.INDEX.URL + '/api/v1/plugins';
    try {
        const { body } = await doJSONRequest(uri, { searchParams, preventSSRF: false });
        logger.debug('Got result from PeerTube index.', { body });
        addInstanceInformation(body);
        return body;
    }
    catch (err) {
        logger.error('Cannot list available plugins from index %s.', uri, { err });
        return undefined;
    }
}
function addInstanceInformation(result) {
    for (const d of result.data) {
        d.installed = PluginManager.Instance.isRegistered(d.npmName);
        d.name = PluginModel.normalizePluginName(d.npmName);
    }
    return result;
}
export async function getLatestPluginsVersion(npmNames) {
    const bodyRequest = {
        npmNames,
        currentPeerTubeEngine: PEERTUBE_VERSION
    };
    const uri = sanitizeUrl(CONFIG.PLUGINS.INDEX.URL) + '/api/v1/plugins/latest-version';
    const { body } = await doJSONRequest(uri, { json: bodyRequest, method: 'POST', preventSSRF: false });
    return body;
}
export async function getLatestPluginVersion(npmName) {
    const results = await getLatestPluginsVersion([npmName]);
    if (Array.isArray(results) === false || results.length !== 1) {
        logger.warn(`Cannot get latest supported plugin version of ${npmName}`, { results });
        return undefined;
    }
    return results[0].latestVersion;
}
//# sourceMappingURL=plugin-index.js.map