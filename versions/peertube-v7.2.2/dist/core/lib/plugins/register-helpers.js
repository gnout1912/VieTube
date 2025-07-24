import express from 'express';
import { serverHookObject } from '@peertube/peertube-models';
import { logger } from '../../helpers/logger.js';
import { onExternalUserAuthenticated } from '../auth/external-auth.js';
import { VideoConstantManagerFactory } from './video-constant-manager-factory.js';
import { PluginModel } from '../../models/server/plugin.js';
import { VideoTranscodingProfilesManager } from '../transcoding/default-transcoding-profiles.js';
import { buildPluginHelpers } from './plugin-helpers-builder.js';
export class RegisterHelpers {
    constructor(npmName, plugin, server, onHookAdded) {
        this.npmName = npmName;
        this.plugin = plugin;
        this.server = server;
        this.onHookAdded = onHookAdded;
        this.transcodingProfiles = {};
        this.transcodingEncoders = {};
        this.settings = [];
        this.idAndPassAuths = [];
        this.externalAuths = [];
        this.onSettingsChangeCallbacks = [];
        this.webSocketRoutes = [];
        this.router = express.Router();
        this.videoConstantManagerFactory = new VideoConstantManagerFactory(this.npmName);
    }
    buildRegisterHelpers() {
        const registerHook = this.buildRegisterHook();
        const registerSetting = this.buildRegisterSetting();
        const getRouter = this.buildGetRouter();
        const registerWebSocketRoute = this.buildRegisterWebSocketRoute();
        const settingsManager = this.buildSettingsManager();
        const storageManager = this.buildStorageManager();
        const videoLanguageManager = this.videoConstantManagerFactory.createVideoConstantManager('language');
        const videoLicenceManager = this.videoConstantManagerFactory.createVideoConstantManager('licence');
        const videoCategoryManager = this.videoConstantManagerFactory.createVideoConstantManager('category');
        const videoPrivacyManager = this.videoConstantManagerFactory.createVideoConstantManager('privacy');
        const playlistPrivacyManager = this.videoConstantManagerFactory.createVideoConstantManager('playlistPrivacy');
        const transcodingManager = this.buildTranscodingManager();
        const registerIdAndPassAuth = this.buildRegisterIdAndPassAuth();
        const registerExternalAuth = this.buildRegisterExternalAuth();
        const unregisterIdAndPassAuth = this.buildUnregisterIdAndPassAuth();
        const unregisterExternalAuth = this.buildUnregisterExternalAuth();
        const peertubeHelpers = buildPluginHelpers(this.server, this.plugin, this.npmName);
        return {
            registerHook,
            registerSetting,
            getRouter,
            registerWebSocketRoute,
            settingsManager,
            storageManager,
            videoLanguageManager: Object.assign(Object.assign({}, videoLanguageManager), { addLanguage: videoLanguageManager.addConstant, deleteLanguage: videoLanguageManager.deleteConstant }),
            videoCategoryManager: Object.assign(Object.assign({}, videoCategoryManager), { addCategory: videoCategoryManager.addConstant, deleteCategory: videoCategoryManager.deleteConstant }),
            videoLicenceManager: Object.assign(Object.assign({}, videoLicenceManager), { addLicence: videoLicenceManager.addConstant, deleteLicence: videoLicenceManager.deleteConstant }),
            videoPrivacyManager: Object.assign(Object.assign({}, videoPrivacyManager), { deletePrivacy: videoPrivacyManager.deleteConstant }),
            playlistPrivacyManager: Object.assign(Object.assign({}, playlistPrivacyManager), { deletePlaylistPrivacy: playlistPrivacyManager.deleteConstant }),
            transcodingManager,
            registerIdAndPassAuth,
            registerExternalAuth,
            unregisterIdAndPassAuth,
            unregisterExternalAuth,
            peertubeHelpers
        };
    }
    reinitVideoConstants(npmName) {
        this.videoConstantManagerFactory.resetVideoConstants(npmName);
    }
    reinitTranscodingProfilesAndEncoders(npmName) {
        const profiles = this.transcodingProfiles[npmName];
        if (Array.isArray(profiles)) {
            for (const profile of profiles) {
                VideoTranscodingProfilesManager.Instance.removeProfile(profile);
            }
        }
        const encoders = this.transcodingEncoders[npmName];
        if (Array.isArray(encoders)) {
            for (const o of encoders) {
                VideoTranscodingProfilesManager.Instance.removeEncoderPriority(o.type, o.streamType, o.encoder, o.priority);
            }
        }
    }
    getSettings() {
        return this.settings;
    }
    getRouter() {
        return this.router;
    }
    getIdAndPassAuths() {
        return this.idAndPassAuths;
    }
    getExternalAuths() {
        return this.externalAuths;
    }
    getOnSettingsChangedCallbacks() {
        return this.onSettingsChangeCallbacks;
    }
    getWebSocketRoutes() {
        return this.webSocketRoutes;
    }
    buildGetRouter() {
        return () => this.router;
    }
    buildRegisterWebSocketRoute() {
        return (options) => {
            this.webSocketRoutes.push(options);
        };
    }
    buildRegisterSetting() {
        return (options) => {
            this.settings = [
                ...this.settings.filter(s => !s.name || s.name !== options.name),
                options
            ];
        };
    }
    buildRegisterHook() {
        return (options) => {
            if (serverHookObject[options.target] !== true) {
                logger.warn('Unknown hook %s of plugin %s. Skipping.', options.target, this.npmName);
                return;
            }
            return this.onHookAdded(options);
        };
    }
    buildRegisterIdAndPassAuth() {
        return (options) => {
            if (!options.authName || typeof options.getWeight !== 'function' || typeof options.login !== 'function') {
                logger.error('Cannot register auth plugin %s: authName, getWeight or login are not valid.', this.npmName, { options });
                return;
            }
            this.idAndPassAuths.push(options);
        };
    }
    buildRegisterExternalAuth() {
        const self = this;
        return (options) => {
            if (!options.authName || typeof options.authDisplayName !== 'function' || typeof options.onAuthRequest !== 'function') {
                logger.error('Cannot register auth plugin %s: authName, authDisplayName or onAuthRequest are not valid.', this.npmName, { options });
                return;
            }
            this.externalAuths.push(options);
            return {
                userAuthenticated(result) {
                    onExternalUserAuthenticated({
                        npmName: self.npmName,
                        authName: options.authName,
                        authResult: result
                    }).catch(err => {
                        logger.error('Cannot execute onExternalUserAuthenticated.', { npmName: self.npmName, authName: options.authName, err });
                    });
                }
            };
        };
    }
    buildUnregisterExternalAuth() {
        return (authName) => {
            this.externalAuths = this.externalAuths.filter(a => a.authName !== authName);
        };
    }
    buildUnregisterIdAndPassAuth() {
        return (authName) => {
            this.idAndPassAuths = this.idAndPassAuths.filter(a => a.authName !== authName);
        };
    }
    buildSettingsManager() {
        return {
            getSetting: (name) => PluginModel.getSetting(this.plugin.name, this.plugin.type, name, this.settings),
            getSettings: (names) => PluginModel.getSettings(this.plugin.name, this.plugin.type, names, this.settings),
            setSetting: (name, value) => PluginModel.setSetting(this.plugin.name, this.plugin.type, name, value),
            onSettingsChange: (cb) => this.onSettingsChangeCallbacks.push(cb)
        };
    }
    buildStorageManager() {
        return {
            getData: (key) => PluginModel.getData(this.plugin.name, this.plugin.type, key),
            storeData: (key, data) => PluginModel.storeData(this.plugin.name, this.plugin.type, key, data)
        };
    }
    buildTranscodingManager() {
        const self = this;
        function addProfile(type, encoder, profile, builder) {
            if (profile === 'default') {
                logger.error('A plugin cannot add a default live transcoding profile');
                return false;
            }
            VideoTranscodingProfilesManager.Instance.addProfile({
                type,
                encoder,
                profile,
                builder
            });
            if (!self.transcodingProfiles[self.npmName])
                self.transcodingProfiles[self.npmName] = [];
            self.transcodingProfiles[self.npmName].push({ type, encoder, profile });
            return true;
        }
        function addEncoderPriority(type, streamType, encoder, priority) {
            VideoTranscodingProfilesManager.Instance.addEncoderPriority(type, streamType, encoder, priority);
            if (!self.transcodingEncoders[self.npmName])
                self.transcodingEncoders[self.npmName] = [];
            self.transcodingEncoders[self.npmName].push({ type, streamType, encoder, priority });
        }
        return {
            addLiveProfile(encoder, profile, builder) {
                return addProfile('live', encoder, profile, builder);
            },
            addVODProfile(encoder, profile, builder) {
                return addProfile('vod', encoder, profile, builder);
            },
            addLiveEncoderPriority(streamType, encoder, priority) {
                return addEncoderPriority('live', streamType, encoder, priority);
            },
            addVODEncoderPriority(streamType, encoder, priority) {
                return addEncoderPriority('vod', streamType, encoder, priority);
            },
            removeAllProfilesAndEncoderPriorities() {
                return self.reinitTranscodingProfilesAndEncoders(self.npmName);
            }
        };
    }
}
//# sourceMappingURL=register-helpers.js.map