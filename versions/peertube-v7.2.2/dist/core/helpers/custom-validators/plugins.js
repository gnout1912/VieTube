import validator from 'validator';
import { PluginType } from '@peertube/peertube-models';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { isUrlValid } from './activitypub/misc.js';
import { exists, isArray, isSafePath } from './misc.js';
const PLUGINS_CONSTRAINTS_FIELDS = CONSTRAINTS_FIELDS.PLUGINS;
function isPluginTypeValid(value) {
    return exists(value) &&
        (value === PluginType.PLUGIN || value === PluginType.THEME);
}
function isPluginNameValid(value) {
    return exists(value) &&
        validator.default.isLength(value, PLUGINS_CONSTRAINTS_FIELDS.NAME) &&
        validator.default.matches(value, /^[a-z-0-9]+$/);
}
function isNpmPluginNameValid(value) {
    return exists(value) &&
        validator.default.isLength(value, PLUGINS_CONSTRAINTS_FIELDS.NAME) &&
        validator.default.matches(value, /^[a-z\-._0-9]+$/) &&
        (value.startsWith('peertube-plugin-') || value.startsWith('peertube-theme-'));
}
function isPluginDescriptionValid(value) {
    return exists(value) && validator.default.isLength(value, PLUGINS_CONSTRAINTS_FIELDS.DESCRIPTION);
}
function isPluginStableVersionValid(value) {
    if (!exists(value))
        return false;
    const parts = (value + '').split('.');
    return parts.length === 3 && parts.every(p => validator.default.isInt(p));
}
function isPluginStableOrUnstableVersionValid(value) {
    if (!exists(value))
        return false;
    const [stable, suffix] = value.split('-');
    if (!isPluginStableVersionValid(stable))
        return false;
    const suffixRegex = /^(rc|alpha|beta)\.\d+$/;
    if (suffix && !suffixRegex.test(suffix))
        return false;
    return true;
}
function isPluginEngineValid(engine) {
    return exists(engine) && exists(engine.peertube);
}
function isPluginHomepage(value) {
    return exists(value) && (!value || isUrlValid(value));
}
function isPluginBugs(value) {
    return exists(value) && (!value || isUrlValid(value));
}
function areStaticDirectoriesValid(staticDirs) {
    if (!exists(staticDirs) || typeof staticDirs !== 'object')
        return false;
    for (const key of Object.keys(staticDirs)) {
        if (!isSafePath(staticDirs[key]))
            return false;
    }
    return true;
}
function areClientScriptsValid(clientScripts) {
    return isArray(clientScripts) &&
        clientScripts.every(c => {
            return isSafePath(c.script) && isArray(c.scopes);
        });
}
function areTranslationPathsValid(translations) {
    if (!exists(translations) || typeof translations !== 'object')
        return false;
    for (const key of Object.keys(translations)) {
        if (!isSafePath(translations[key]))
            return false;
    }
    return true;
}
function areCSSPathsValid(css) {
    return isArray(css) && css.every(c => isSafePath(c));
}
function isThemeNameValid(name) {
    return name && typeof name === 'string' &&
        (isPluginNameValid(name) || name.startsWith('peertube-core-'));
}
function isPackageJSONValid(packageJSON, pluginType) {
    let result = true;
    const badFields = [];
    if (!isNpmPluginNameValid(packageJSON.name)) {
        result = false;
        badFields.push('name');
    }
    if (!isPluginDescriptionValid(packageJSON.description)) {
        result = false;
        badFields.push('description');
    }
    if (!isPluginEngineValid(packageJSON.engine)) {
        result = false;
        badFields.push('engine');
    }
    if (!isPluginHomepage(packageJSON.homepage)) {
        result = false;
        badFields.push('homepage');
    }
    if (!exists(packageJSON.author)) {
        result = false;
        badFields.push('author');
    }
    if (!isPluginBugs(packageJSON.bugs)) {
        result = false;
        badFields.push('bugs');
    }
    if (pluginType === PluginType.PLUGIN && !isSafePath(packageJSON.library)) {
        result = false;
        badFields.push('library');
    }
    if (!areStaticDirectoriesValid(packageJSON.staticDirs)) {
        result = false;
        badFields.push('staticDirs');
    }
    if (!areCSSPathsValid(packageJSON.css)) {
        result = false;
        badFields.push('css');
    }
    if (!areClientScriptsValid(packageJSON.clientScripts)) {
        result = false;
        badFields.push('clientScripts');
    }
    if (!areTranslationPathsValid(packageJSON.translations)) {
        result = false;
        badFields.push('translations');
    }
    return { result, badFields };
}
function isLibraryCodeValid(library) {
    return typeof library.register === 'function' &&
        typeof library.unregister === 'function';
}
export { isPluginTypeValid, isPackageJSONValid, isThemeNameValid, isPluginHomepage, isPluginStableVersionValid, isPluginStableOrUnstableVersionValid, isPluginNameValid, isPluginDescriptionValid, isLibraryCodeValid, isNpmPluginNameValid };
//# sourceMappingURL=plugins.js.map