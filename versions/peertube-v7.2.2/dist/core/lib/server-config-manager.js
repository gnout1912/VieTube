import { VideoCommentPolicy } from '@peertube/peertube-models';
import { getServerCommit } from '../helpers/version.js';
import { CONFIG, isEmailEnabled } from '../initializers/config.js';
import { CONSTRAINTS_FIELDS, DEFAULT_THEME_NAME, PEERTUBE_VERSION } from '../initializers/constants.js';
import { isSignupAllowed, isSignupAllowedForCurrentIP } from './signup.js';
import { ActorCustomPageModel } from '../models/account/actor-custom-page.js';
import { getServerActor } from '../models/application/application.js';
import { PluginModel } from '../models/server/plugin.js';
import { Hooks } from './plugins/hooks.js';
import { PluginManager } from './plugins/plugin-manager.js';
import { getThemeOrDefault } from './plugins/theme-utils.js';
import { VideoTranscodingProfilesManager } from './transcoding/default-transcoding-profiles.js';
class ServerConfigManager {
    constructor() {
        this.homepageEnabled = false;
    }
    async init() {
        const instanceHomepage = await ActorCustomPageModel.loadInstanceHomepage();
        this.updateHomepageState(instanceHomepage === null || instanceHomepage === void 0 ? void 0 : instanceHomepage.content);
    }
    updateHomepageState(content) {
        this.homepageEnabled = !!content;
    }
    async getHTMLServerConfig() {
        if (this.serverCommit === undefined)
            this.serverCommit = await getServerCommit();
        const serverActor = await getServerActor();
        const defaultTheme = getThemeOrDefault(CONFIG.THEME.DEFAULT, DEFAULT_THEME_NAME);
        return {
            client: {
                videos: {
                    miniature: {
                        preferAuthorDisplayName: CONFIG.CLIENT.VIDEOS.MINIATURE.PREFER_AUTHOR_DISPLAY_NAME
                    },
                    resumableUpload: {
                        maxChunkSize: CONFIG.CLIENT.VIDEOS.RESUMABLE_UPLOAD.MAX_CHUNK_SIZE
                    }
                },
                menu: {
                    login: {
                        redirectOnSingleExternalAuth: CONFIG.CLIENT.MENU.LOGIN.REDIRECT_ON_SINGLE_EXTERNAL_AUTH
                    }
                },
                openInApp: {
                    android: {
                        intent: {
                            enabled: CONFIG.CLIENT.OPEN_IN_APP.ANDROID.INTENT.ENABLED,
                            host: CONFIG.CLIENT.OPEN_IN_APP.ANDROID.INTENT.HOST,
                            scheme: CONFIG.CLIENT.OPEN_IN_APP.ANDROID.INTENT.SCHEME,
                            fallbackUrl: CONFIG.CLIENT.OPEN_IN_APP.ANDROID.INTENT.FALLBACK_URL
                        }
                    },
                    ios: {
                        enabled: CONFIG.CLIENT.OPEN_IN_APP.IOS.ENABLED,
                        host: CONFIG.CLIENT.OPEN_IN_APP.IOS.HOST,
                        scheme: CONFIG.CLIENT.OPEN_IN_APP.IOS.SCHEME,
                        fallbackUrl: CONFIG.CLIENT.OPEN_IN_APP.IOS.FALLBACK_URL
                    }
                }
            },
            defaults: {
                publish: {
                    downloadEnabled: CONFIG.DEFAULTS.PUBLISH.DOWNLOAD_ENABLED,
                    commentsPolicy: CONFIG.DEFAULTS.PUBLISH.COMMENTS_POLICY,
                    commentsEnabled: CONFIG.DEFAULTS.PUBLISH.COMMENTS_POLICY !== VideoCommentPolicy.DISABLED,
                    privacy: CONFIG.DEFAULTS.PUBLISH.PRIVACY,
                    licence: CONFIG.DEFAULTS.PUBLISH.LICENCE
                },
                p2p: {
                    webapp: {
                        enabled: CONFIG.DEFAULTS.P2P.WEBAPP.ENABLED
                    },
                    embed: {
                        enabled: CONFIG.DEFAULTS.P2P.EMBED.ENABLED
                    }
                },
                player: {
                    autoPlay: CONFIG.DEFAULTS.PLAYER.AUTO_PLAY
                }
            },
            webadmin: {
                configuration: {
                    edition: {
                        allowed: CONFIG.WEBADMIN.CONFIGURATION.EDITION.ALLOWED
                    }
                }
            },
            instance: {
                name: CONFIG.INSTANCE.NAME,
                shortDescription: CONFIG.INSTANCE.SHORT_DESCRIPTION,
                isNSFW: CONFIG.INSTANCE.IS_NSFW,
                defaultNSFWPolicy: CONFIG.INSTANCE.DEFAULT_NSFW_POLICY,
                defaultClientRoute: CONFIG.INSTANCE.DEFAULT_CLIENT_ROUTE,
                serverCountry: CONFIG.INSTANCE.SERVER_COUNTRY,
                support: {
                    text: CONFIG.INSTANCE.SUPPORT.TEXT
                },
                social: {
                    blueskyLink: CONFIG.INSTANCE.SOCIAL.BLUESKY,
                    mastodonLink: CONFIG.INSTANCE.SOCIAL.MASTODON_LINK,
                    externalLink: CONFIG.INSTANCE.SOCIAL.EXTERNAL_LINK
                },
                customizations: {
                    javascript: CONFIG.INSTANCE.CUSTOMIZATIONS.JAVASCRIPT,
                    css: CONFIG.INSTANCE.CUSTOMIZATIONS.CSS
                },
                avatars: serverActor.Avatars.map(a => a.toFormattedJSON()),
                banners: serverActor.Banners.map(b => b.toFormattedJSON())
            },
            search: {
                remoteUri: {
                    users: CONFIG.SEARCH.REMOTE_URI.USERS,
                    anonymous: CONFIG.SEARCH.REMOTE_URI.ANONYMOUS
                },
                searchIndex: {
                    enabled: CONFIG.SEARCH.SEARCH_INDEX.ENABLED,
                    url: CONFIG.SEARCH.SEARCH_INDEX.URL,
                    disableLocalSearch: CONFIG.SEARCH.SEARCH_INDEX.DISABLE_LOCAL_SEARCH,
                    isDefaultSearch: CONFIG.SEARCH.SEARCH_INDEX.IS_DEFAULT_SEARCH
                }
            },
            plugin: {
                registered: this.getRegisteredPlugins(),
                registeredExternalAuths: this.getExternalAuthsPlugins(),
                registeredIdAndPassAuths: this.getIdAndPassAuthPlugins()
            },
            theme: {
                registered: this.getRegisteredThemes(),
                builtIn: this.getBuiltInThemes(),
                default: defaultTheme
            },
            email: {
                enabled: isEmailEnabled()
            },
            contactForm: {
                enabled: CONFIG.CONTACT_FORM.ENABLED
            },
            serverVersion: PEERTUBE_VERSION,
            serverCommit: this.serverCommit,
            transcoding: {
                remoteRunners: {
                    enabled: CONFIG.TRANSCODING.ENABLED && CONFIG.TRANSCODING.REMOTE_RUNNERS.ENABLED
                },
                hls: {
                    enabled: CONFIG.TRANSCODING.ENABLED && CONFIG.TRANSCODING.HLS.ENABLED
                },
                web_videos: {
                    enabled: CONFIG.TRANSCODING.ENABLED && CONFIG.TRANSCODING.WEB_VIDEOS.ENABLED
                },
                enabledResolutions: this.getEnabledResolutions('vod'),
                profile: CONFIG.TRANSCODING.PROFILE,
                availableProfiles: VideoTranscodingProfilesManager.Instance.getAvailableProfiles('vod')
            },
            live: {
                enabled: CONFIG.LIVE.ENABLED,
                allowReplay: CONFIG.LIVE.ALLOW_REPLAY,
                latencySetting: {
                    enabled: CONFIG.LIVE.LATENCY_SETTING.ENABLED
                },
                maxDuration: CONFIG.LIVE.MAX_DURATION,
                maxInstanceLives: CONFIG.LIVE.MAX_INSTANCE_LIVES,
                maxUserLives: CONFIG.LIVE.MAX_USER_LIVES,
                transcoding: {
                    enabled: CONFIG.LIVE.TRANSCODING.ENABLED,
                    remoteRunners: {
                        enabled: CONFIG.LIVE.TRANSCODING.ENABLED && CONFIG.LIVE.TRANSCODING.REMOTE_RUNNERS.ENABLED
                    },
                    enabledResolutions: this.getEnabledResolutions('live'),
                    profile: CONFIG.LIVE.TRANSCODING.PROFILE,
                    availableProfiles: VideoTranscodingProfilesManager.Instance.getAvailableProfiles('live')
                },
                rtmp: {
                    port: CONFIG.LIVE.RTMP.PORT
                }
            },
            videoStudio: {
                enabled: CONFIG.VIDEO_STUDIO.ENABLED,
                remoteRunners: {
                    enabled: CONFIG.VIDEO_STUDIO.REMOTE_RUNNERS.ENABLED
                }
            },
            videoFile: {
                update: {
                    enabled: CONFIG.VIDEO_FILE.UPDATE.ENABLED
                }
            },
            videoTranscription: {
                enabled: CONFIG.VIDEO_TRANSCRIPTION.ENABLED,
                remoteRunners: {
                    enabled: CONFIG.VIDEO_TRANSCRIPTION.ENABLED && CONFIG.VIDEO_TRANSCRIPTION.REMOTE_RUNNERS.ENABLED
                }
            },
            import: {
                videos: {
                    http: {
                        enabled: CONFIG.IMPORT.VIDEOS.HTTP.ENABLED
                    },
                    torrent: {
                        enabled: CONFIG.IMPORT.VIDEOS.TORRENT.ENABLED
                    }
                },
                videoChannelSynchronization: {
                    enabled: CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.ENABLED
                },
                users: {
                    enabled: CONFIG.IMPORT.USERS.ENABLED
                }
            },
            export: {
                users: {
                    enabled: CONFIG.EXPORT.USERS.ENABLED,
                    exportExpiration: CONFIG.EXPORT.USERS.EXPORT_EXPIRATION,
                    maxUserVideoQuota: CONFIG.EXPORT.USERS.MAX_USER_VIDEO_QUOTA
                }
            },
            autoBlacklist: {
                videos: {
                    ofUsers: {
                        enabled: CONFIG.AUTO_BLACKLIST.VIDEOS.OF_USERS.ENABLED
                    }
                }
            },
            avatar: {
                file: {
                    size: {
                        max: CONSTRAINTS_FIELDS.ACTORS.IMAGE.FILE_SIZE.max
                    },
                    extensions: CONSTRAINTS_FIELDS.ACTORS.IMAGE.EXTNAME
                }
            },
            banner: {
                file: {
                    size: {
                        max: CONSTRAINTS_FIELDS.ACTORS.IMAGE.FILE_SIZE.max
                    },
                    extensions: CONSTRAINTS_FIELDS.ACTORS.IMAGE.EXTNAME
                }
            },
            video: {
                image: {
                    extensions: CONSTRAINTS_FIELDS.VIDEOS.IMAGE.EXTNAME,
                    size: {
                        max: CONSTRAINTS_FIELDS.VIDEOS.IMAGE.FILE_SIZE.max
                    }
                },
                file: {
                    extensions: CONSTRAINTS_FIELDS.VIDEOS.EXTNAME
                }
            },
            videoCaption: {
                file: {
                    size: {
                        max: CONSTRAINTS_FIELDS.VIDEO_CAPTIONS.CAPTION_FILE.FILE_SIZE.max
                    },
                    extensions: CONSTRAINTS_FIELDS.VIDEO_CAPTIONS.CAPTION_FILE.EXTNAME
                }
            },
            user: {
                videoQuota: CONFIG.USER.VIDEO_QUOTA,
                videoQuotaDaily: CONFIG.USER.VIDEO_QUOTA_DAILY
            },
            videoChannels: {
                maxPerUser: CONFIG.VIDEO_CHANNELS.MAX_PER_USER
            },
            trending: {
                videos: {
                    intervalDays: CONFIG.TRENDING.VIDEOS.INTERVAL_DAYS,
                    algorithms: {
                        enabled: CONFIG.TRENDING.VIDEOS.ALGORITHMS.ENABLED,
                        default: CONFIG.TRENDING.VIDEOS.ALGORITHMS.DEFAULT
                    }
                }
            },
            tracker: {
                enabled: CONFIG.TRACKER.ENABLED
            },
            followings: {
                instance: {
                    autoFollowIndex: {
                        indexUrl: CONFIG.FOLLOWINGS.INSTANCE.AUTO_FOLLOW_INDEX.INDEX_URL
                    }
                }
            },
            federation: {
                enabled: CONFIG.FEDERATION.ENABLED
            },
            broadcastMessage: {
                enabled: CONFIG.BROADCAST_MESSAGE.ENABLED,
                message: CONFIG.BROADCAST_MESSAGE.MESSAGE,
                level: CONFIG.BROADCAST_MESSAGE.LEVEL,
                dismissable: CONFIG.BROADCAST_MESSAGE.DISMISSABLE
            },
            homepage: {
                enabled: this.homepageEnabled
            },
            openTelemetry: {
                metrics: {
                    enabled: CONFIG.OPEN_TELEMETRY.METRICS.ENABLED,
                    playbackStatsInterval: CONFIG.OPEN_TELEMETRY.METRICS.PLAYBACK_STATS_INTERVAL
                }
            },
            views: {
                videos: {
                    watchingInterval: {
                        anonymous: CONFIG.VIEWS.VIDEOS.WATCHING_INTERVAL.ANONYMOUS,
                        users: CONFIG.VIEWS.VIDEOS.WATCHING_INTERVAL.USERS
                    }
                }
            },
            storyboards: {
                enabled: CONFIG.STORYBOARDS.ENABLED
            },
            webrtc: {
                stunServers: CONFIG.WEBRTC.STUN_SERVERS
            },
            nsfwFlagsSettings: {
                enabled: CONFIG.NSFW_FLAGS_SETTINGS.ENABLED
            }
        };
    }
    async getServerConfig(ip) {
        const { allowed } = await Hooks.wrapPromiseFun(isSignupAllowed, {
            ip,
            signupMode: CONFIG.SIGNUP.REQUIRES_APPROVAL
                ? 'request-registration'
                : 'direct-registration'
        }, CONFIG.SIGNUP.REQUIRES_APPROVAL
            ? 'filter:api.user.request-signup.allowed.result'
            : 'filter:api.user.signup.allowed.result');
        const allowedForCurrentIP = isSignupAllowedForCurrentIP(ip);
        const signup = {
            allowed,
            allowedForCurrentIP,
            minimumAge: CONFIG.SIGNUP.MINIMUM_AGE,
            requiresApproval: CONFIG.SIGNUP.REQUIRES_APPROVAL,
            requiresEmailVerification: CONFIG.SIGNUP.REQUIRES_EMAIL_VERIFICATION
        };
        const htmlConfig = await this.getHTMLServerConfig();
        return Object.assign(Object.assign({}, htmlConfig), { signup });
    }
    getRegisteredThemes() {
        return PluginManager.Instance.getRegisteredThemes()
            .map(t => ({
            npmName: PluginModel.buildNpmName(t.name, t.type),
            name: t.name,
            version: t.version,
            description: t.description,
            css: t.css,
            clientScripts: t.clientScripts
        }));
    }
    getBuiltInThemes() {
        return [
            {
                name: 'peertube-core-dark-brown'
            },
            {
                name: 'peertube-core-light-beige'
            }
        ];
    }
    getRegisteredPlugins() {
        return PluginManager.Instance.getRegisteredPlugins()
            .map(p => ({
            npmName: PluginModel.buildNpmName(p.name, p.type),
            name: p.name,
            version: p.version,
            description: p.description,
            clientScripts: p.clientScripts
        }));
    }
    getEnabledResolutions(type) {
        const transcoding = type === 'vod'
            ? CONFIG.TRANSCODING
            : CONFIG.LIVE.TRANSCODING;
        return Object.keys(transcoding.RESOLUTIONS)
            .filter(key => transcoding.ENABLED && transcoding.RESOLUTIONS[key] === true)
            .map(r => parseInt(r, 10));
    }
    getIdAndPassAuthPlugins() {
        const result = [];
        for (const p of PluginManager.Instance.getIdAndPassAuths()) {
            for (const auth of p.idAndPassAuths) {
                result.push({
                    npmName: p.npmName,
                    name: p.name,
                    version: p.version,
                    authName: auth.authName,
                    weight: auth.getWeight()
                });
            }
        }
        return result;
    }
    getExternalAuthsPlugins() {
        const result = [];
        for (const p of PluginManager.Instance.getExternalAuths()) {
            for (const auth of p.externalAuths) {
                result.push({
                    npmName: p.npmName,
                    name: p.name,
                    version: p.version,
                    authName: auth.authName,
                    authDisplayName: auth.authDisplayName()
                });
            }
        }
        return result;
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { ServerConfigManager };
//# sourceMappingURL=server-config-manager.js.map