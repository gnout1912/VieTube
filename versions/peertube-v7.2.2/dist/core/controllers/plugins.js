import express from 'express';
import { join } from 'path';
import { getCompleteLocale, is18nLocale } from '@peertube/peertube-core-utils';
import { HttpStatusCode, PluginType } from '@peertube/peertube-models';
import { isProdInstance } from '@peertube/peertube-node-utils';
import { logger } from '../helpers/logger.js';
import { CONFIG } from '../initializers/config.js';
import { optionalAuthenticate } from '../middlewares/auth.js';
import { buildRateLimiter } from '../middlewares/index.js';
import { PLUGIN_GLOBAL_CSS_PATH } from '../initializers/constants.js';
import { PluginManager } from '../lib/plugins/plugin-manager.js';
import { getExternalAuthValidator, getPluginValidator, pluginStaticDirectoryValidator } from '../middlewares/validators/plugins.js';
import { serveThemeCSSValidator } from '../middlewares/validators/themes.js';
const sendFileOptions = {
    maxAge: '30 days',
    immutable: isProdInstance()
};
const pluginsRouter = express.Router();
const pluginsRateLimiter = buildRateLimiter({
    windowMs: CONFIG.RATES_LIMIT.PLUGINS.WINDOW_MS,
    max: CONFIG.RATES_LIMIT.PLUGINS.MAX
});
pluginsRouter.get('/plugins/global.css', pluginsRateLimiter, servePluginGlobalCSS);
pluginsRouter.get('/plugins/translations/:locale.json', pluginsRateLimiter, getPluginTranslations);
pluginsRouter.get('/plugins/:pluginName/:pluginVersion/auth/:authName', pluginsRateLimiter, getPluginValidator(PluginType.PLUGIN), getExternalAuthValidator, handleAuthInPlugin);
pluginsRouter.get('/plugins/:pluginName/:pluginVersion/static/:staticEndpoint(*)', pluginsRateLimiter, getPluginValidator(PluginType.PLUGIN), pluginStaticDirectoryValidator, servePluginStaticDirectory);
pluginsRouter.get('/plugins/:pluginName/:pluginVersion/client-scripts/:staticEndpoint(*)', pluginsRateLimiter, getPluginValidator(PluginType.PLUGIN), pluginStaticDirectoryValidator, servePluginClientScripts);
pluginsRouter.use('/plugins/:pluginName/router', pluginsRateLimiter, getPluginValidator(PluginType.PLUGIN, false), optionalAuthenticate, servePluginCustomRoutes);
pluginsRouter.use('/plugins/:pluginName/:pluginVersion/router', pluginsRateLimiter, getPluginValidator(PluginType.PLUGIN), optionalAuthenticate, servePluginCustomRoutes);
pluginsRouter.get('/themes/:pluginName/:pluginVersion/static/:staticEndpoint(*)', pluginsRateLimiter, getPluginValidator(PluginType.THEME), pluginStaticDirectoryValidator, servePluginStaticDirectory);
pluginsRouter.get('/themes/:pluginName/:pluginVersion/client-scripts/:staticEndpoint(*)', pluginsRateLimiter, getPluginValidator(PluginType.THEME), pluginStaticDirectoryValidator, servePluginClientScripts);
pluginsRouter.get('/themes/:themeName/:themeVersion/css/:staticEndpoint(*)', pluginsRateLimiter, serveThemeCSSValidator, serveThemeCSSDirectory);
export { pluginsRouter };
function servePluginGlobalCSS(req, res) {
    const globalCSSOptions = req.query.hash
        ? sendFileOptions
        : {};
    return res.sendFile(PLUGIN_GLOBAL_CSS_PATH, globalCSSOptions);
}
function getPluginTranslations(req, res) {
    const locale = req.params.locale;
    if (is18nLocale(locale)) {
        const completeLocale = getCompleteLocale(locale);
        const json = PluginManager.Instance.getTranslations(completeLocale);
        return res.json(json);
    }
    return res.status(HttpStatusCode.NOT_FOUND_404).end();
}
function servePluginStaticDirectory(req, res) {
    const plugin = res.locals.registeredPlugin;
    const staticEndpoint = req.params.staticEndpoint;
    const [directory, ...file] = staticEndpoint.split('/');
    const staticPath = plugin.staticDirs[directory];
    if (!staticPath)
        return res.status(HttpStatusCode.NOT_FOUND_404).end();
    const filepath = file.join('/');
    return res.sendFile(join(plugin.path, staticPath, filepath), sendFileOptions);
}
function servePluginCustomRoutes(req, res, next) {
    const plugin = res.locals.registeredPlugin;
    const router = PluginManager.Instance.getRouter(plugin.npmName);
    if (!router)
        return res.status(HttpStatusCode.NOT_FOUND_404).end();
    return router(req, res, next);
}
function servePluginClientScripts(req, res) {
    const plugin = res.locals.registeredPlugin;
    const staticEndpoint = req.params.staticEndpoint;
    const file = plugin.clientScripts[staticEndpoint];
    if (!file)
        return res.status(HttpStatusCode.NOT_FOUND_404).end();
    return res.sendFile(join(plugin.path, staticEndpoint), sendFileOptions);
}
function serveThemeCSSDirectory(req, res) {
    const plugin = res.locals.registeredPlugin;
    const staticEndpoint = req.params.staticEndpoint;
    if (plugin.css.includes(staticEndpoint) === false) {
        return res.status(HttpStatusCode.NOT_FOUND_404).end();
    }
    return res.sendFile(join(plugin.path, staticEndpoint), sendFileOptions);
}
function handleAuthInPlugin(req, res) {
    const authOptions = res.locals.externalAuth;
    try {
        logger.debug('Forwarding auth plugin request in %s of plugin %s.', authOptions.authName, res.locals.registeredPlugin.npmName);
        authOptions.onAuthRequest(req, res);
    }
    catch (err) {
        logger.error('Forward request error in auth %s of plugin %s.', authOptions.authName, res.locals.registeredPlugin.npmName, { err });
    }
}
//# sourceMappingURL=plugins.js.map