import bytes from 'bytes';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { decacheModule } from '../helpers/decache.js';
import { buildPath, root } from '@peertube/peertube-node-utils';
import { parseBytes, parseDurationToMs } from '../helpers/core-utils.js';
const require = createRequire(import.meta.url);
let config = require('config');
const configChangedHandlers = [];
const CONFIG = {
    CUSTOM_FILE: getLocalConfigFilePath(),
    LISTEN: {
        PORT: config.get('listen.port'),
        HOSTNAME: config.get('listen.hostname')
    },
    SECRETS: {
        PEERTUBE: config.get('secrets.peertube')
    },
    DATABASE: {
        DBNAME: config.has('database.name') ? config.get('database.name') : 'peertube' + config.get('database.suffix'),
        HOSTNAME: config.get('database.hostname'),
        PORT: config.get('database.port'),
        SSL: config.get('database.ssl'),
        USERNAME: config.get('database.username'),
        PASSWORD: config.get('database.password'),
        POOL: {
            MAX: config.get('database.pool.max')
        }
    },
    REDIS: {
        HOSTNAME: config.has('redis.hostname') ? config.get('redis.hostname') : null,
        PORT: config.has('redis.port') ? config.get('redis.port') : null,
        SOCKET: config.has('redis.socket') ? config.get('redis.socket') : null,
        AUTH: config.has('redis.auth') ? config.get('redis.auth') : null,
        DB: config.has('redis.db') ? config.get('redis.db') : null,
        SENTINEL: {
            ENABLED: config.has('redis.sentinel.enabled') ? config.get('redis.sentinel.enabled') : false,
            ENABLE_TLS: config.has('redis.sentinel.enable_tls') ? config.get('redis.sentinel.enable_tls') : false,
            SENTINELS: config.has('redis.sentinel.sentinels') ? config.get('redis.sentinel.sentinels') : [],
            MASTER_NAME: config.has('redis.sentinel.master_name') ? config.get('redis.sentinel.master_name') : null
        }
    },
    SMTP: {
        TRANSPORT: config.has('smtp.transport') ? config.get('smtp.transport') : 'smtp',
        SENDMAIL: config.has('smtp.sendmail') ? config.get('smtp.sendmail') : null,
        HOSTNAME: config.get('smtp.hostname'),
        PORT: config.get('smtp.port'),
        USERNAME: config.get('smtp.username'),
        PASSWORD: config.get('smtp.password'),
        TLS: config.get('smtp.tls'),
        DISABLE_STARTTLS: config.get('smtp.disable_starttls'),
        CA_FILE: config.get('smtp.ca_file'),
        FROM_ADDRESS: config.get('smtp.from_address')
    },
    EMAIL: {
        BODY: {
            SIGNATURE: config.get('email.body.signature')
        },
        SUBJECT: {
            PREFIX: config.get('email.subject.prefix') + ' '
        }
    },
    NSFW_FLAGS_SETTINGS: {
        ENABLED: config.get('nsfw_flags_settings.enabled')
    },
    DOWNLOAD_GENERATE_VIDEO: {
        MAX_PARALLEL_DOWNLOADS: config.get('download_generate_video.max_parallel_downloads')
    },
    CLIENT: {
        VIDEOS: {
            MINIATURE: {
                get PREFER_AUTHOR_DISPLAY_NAME() {
                    return config.get('client.videos.miniature.prefer_author_display_name');
                }
            },
            RESUMABLE_UPLOAD: {
                get MAX_CHUNK_SIZE() {
                    return parseBytes(config.get('client.videos.resumable_upload.max_chunk_size') || 0);
                }
            }
        },
        MENU: {
            LOGIN: {
                get REDIRECT_ON_SINGLE_EXTERNAL_AUTH() {
                    return config.get('client.menu.login.redirect_on_single_external_auth');
                }
            }
        },
        OPEN_IN_APP: {
            ANDROID: {
                INTENT: {
                    get ENABLED() {
                        return config.get('client.open_in_app.android.intent.enabled');
                    },
                    get HOST() {
                        return config.get('client.open_in_app.android.intent.host');
                    },
                    get SCHEME() {
                        return config.get('client.open_in_app.android.intent.scheme');
                    },
                    get FALLBACK_URL() {
                        return config.get('client.open_in_app.android.intent.fallback_url');
                    }
                }
            },
            IOS: {
                get ENABLED() {
                    return config.get('client.open_in_app.ios.enabled');
                },
                get HOST() {
                    return config.get('client.open_in_app.ios.host');
                },
                get SCHEME() {
                    return config.get('client.open_in_app.ios.scheme');
                },
                get FALLBACK_URL() {
                    return config.get('client.open_in_app.ios.fallback_url');
                }
            }
        }
    },
    DEFAULTS: {
        PUBLISH: {
            DOWNLOAD_ENABLED: config.get('defaults.publish.download_enabled'),
            COMMENTS_POLICY: config.get('defaults.publish.comments_policy'),
            PRIVACY: config.get('defaults.publish.privacy'),
            LICENCE: config.get('defaults.publish.licence')
        },
        P2P: {
            WEBAPP: {
                ENABLED: config.get('defaults.p2p.webapp.enabled')
            },
            EMBED: {
                ENABLED: config.get('defaults.p2p.embed.enabled')
            }
        },
        PLAYER: {
            get AUTO_PLAY() {
                return config.get('defaults.player.auto_play');
            }
        }
    },
    STORAGE: {
        TMP_DIR: buildPath(config.get('storage.tmp')),
        TMP_PERSISTENT_DIR: buildPath(config.get('storage.tmp_persistent')),
        BIN_DIR: buildPath(config.get('storage.bin')),
        ACTOR_IMAGES_DIR: buildPath(config.get('storage.avatars')),
        LOG_DIR: buildPath(config.get('storage.logs')),
        WEB_VIDEOS_DIR: buildPath(config.get('storage.web_videos')),
        STREAMING_PLAYLISTS_DIR: buildPath(config.get('storage.streaming_playlists')),
        ORIGINAL_VIDEO_FILES_DIR: buildPath(config.get('storage.original_video_files')),
        REDUNDANCY_DIR: buildPath(config.get('storage.redundancy')),
        THUMBNAILS_DIR: buildPath(config.get('storage.thumbnails')),
        STORYBOARDS_DIR: buildPath(config.get('storage.storyboards')),
        PREVIEWS_DIR: buildPath(config.get('storage.previews')),
        CAPTIONS_DIR: buildPath(config.get('storage.captions')),
        TORRENTS_DIR: buildPath(config.get('storage.torrents')),
        CACHE_DIR: buildPath(config.get('storage.cache')),
        PLUGINS_DIR: buildPath(config.get('storage.plugins')),
        CLIENT_OVERRIDES_DIR: buildPath(config.get('storage.client_overrides')),
        WELL_KNOWN_DIR: buildPath(config.get('storage.well_known'))
    },
    STATIC_FILES: {
        PRIVATE_FILES_REQUIRE_AUTH: config.get('static_files.private_files_require_auth')
    },
    OBJECT_STORAGE: {
        ENABLED: config.get('object_storage.enabled'),
        MAX_UPLOAD_PART: bytes.parse(config.get('object_storage.max_upload_part')),
        MAX_REQUEST_ATTEMPTS: config.get('object_storage.max_request_attempts'),
        ENDPOINT: config.get('object_storage.endpoint'),
        REGION: config.get('object_storage.region'),
        UPLOAD_ACL: {
            PUBLIC: config.get('object_storage.upload_acl.public'),
            PRIVATE: config.get('object_storage.upload_acl.private')
        },
        CREDENTIALS: {
            ACCESS_KEY_ID: config.get('object_storage.credentials.access_key_id'),
            SECRET_ACCESS_KEY: config.get('object_storage.credentials.secret_access_key')
        },
        PROXY: {
            PROXIFY_PRIVATE_FILES: config.get('object_storage.proxy.proxify_private_files')
        },
        WEB_VIDEOS: {
            BUCKET_NAME: config.get('object_storage.web_videos.bucket_name'),
            PREFIX: config.get('object_storage.web_videos.prefix'),
            BASE_URL: config.get('object_storage.web_videos.base_url')
        },
        STREAMING_PLAYLISTS: {
            BUCKET_NAME: config.get('object_storage.streaming_playlists.bucket_name'),
            PREFIX: config.get('object_storage.streaming_playlists.prefix'),
            BASE_URL: config.get('object_storage.streaming_playlists.base_url'),
            STORE_LIVE_STREAMS: config.get('object_storage.streaming_playlists.store_live_streams')
        },
        USER_EXPORTS: {
            BUCKET_NAME: config.get('object_storage.user_exports.bucket_name'),
            PREFIX: config.get('object_storage.user_exports.prefix'),
            BASE_URL: config.get('object_storage.user_exports.base_url')
        },
        ORIGINAL_VIDEO_FILES: {
            BUCKET_NAME: config.get('object_storage.original_video_files.bucket_name'),
            PREFIX: config.get('object_storage.original_video_files.prefix'),
            BASE_URL: config.get('object_storage.original_video_files.base_url')
        },
        CAPTIONS: {
            BUCKET_NAME: config.get('object_storage.captions.bucket_name'),
            PREFIX: config.get('object_storage.captions.prefix'),
            BASE_URL: config.get('object_storage.captions.base_url')
        }
    },
    WEBSERVER: {
        SCHEME: config.get('webserver.https') === true ? 'https' : 'http',
        WS: config.get('webserver.https') === true ? 'wss' : 'ws',
        HOSTNAME: config.get('webserver.hostname'),
        PORT: config.get('webserver.port')
    },
    OAUTH2: {
        TOKEN_LIFETIME: {
            ACCESS_TOKEN: parseDurationToMs(config.get('oauth2.token_lifetime.access_token')),
            REFRESH_TOKEN: parseDurationToMs(config.get('oauth2.token_lifetime.refresh_token'))
        }
    },
    RATES_LIMIT: {
        API: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.api.window')),
            MAX: config.get('rates_limit.api.max')
        },
        SIGNUP: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.signup.window')),
            MAX: config.get('rates_limit.signup.max')
        },
        LOGIN: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.login.window')),
            MAX: config.get('rates_limit.login.max')
        },
        RECEIVE_CLIENT_LOG: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.receive_client_log.window')),
            MAX: config.get('rates_limit.receive_client_log.max')
        },
        ASK_SEND_EMAIL: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.ask_send_email.window')),
            MAX: config.get('rates_limit.ask_send_email.max')
        },
        PLUGINS: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.plugins.window')),
            MAX: config.get('rates_limit.plugins.max')
        },
        WELL_KNOWN: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.well_known.window')),
            MAX: config.get('rates_limit.well_known.max')
        },
        FEEDS: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.feeds.window')),
            MAX: config.get('rates_limit.feeds.max')
        },
        ACTIVITY_PUB: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.activity_pub.window')),
            MAX: config.get('rates_limit.activity_pub.max')
        },
        CLIENT: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.client.window')),
            MAX: config.get('rates_limit.client.max')
        },
        DOWNLOAD_GENERATE_VIDEO: {
            WINDOW_MS: parseDurationToMs(config.get('rates_limit.download_generate_video.window')),
            MAX: config.get('rates_limit.download_generate_video.max')
        }
    },
    TRUST_PROXY: config.get('trust_proxy'),
    LOG: {
        LEVEL: config.get('log.level'),
        ROTATION: {
            ENABLED: config.get('log.rotation.enabled'),
            MAX_FILE_SIZE: bytes.parse(config.get('log.rotation.max_file_size')),
            MAX_FILES: config.get('log.rotation.max_files')
        },
        ANONYMIZE_IP: config.get('log.anonymize_ip'),
        LOG_PING_REQUESTS: config.get('log.log_ping_requests'),
        LOG_TRACKER_UNKNOWN_INFOHASH: config.get('log.log_tracker_unknown_infohash'),
        LOG_HTTP_REQUESTS: config.get('log.log_http_requests'),
        PRETTIFY_SQL: config.get('log.prettify_sql'),
        ACCEPT_CLIENT_LOG: config.get('log.accept_client_log')
    },
    OPEN_TELEMETRY: {
        METRICS: {
            ENABLED: config.get('open_telemetry.metrics.enabled'),
            PLAYBACK_STATS_INTERVAL: parseDurationToMs(config.get('open_telemetry.metrics.playback_stats_interval')),
            HTTP_REQUEST_DURATION: {
                ENABLED: config.get('open_telemetry.metrics.http_request_duration.enabled')
            },
            PROMETHEUS_EXPORTER: {
                HOSTNAME: config.get('open_telemetry.metrics.prometheus_exporter.hostname'),
                PORT: config.get('open_telemetry.metrics.prometheus_exporter.port')
            }
        },
        TRACING: {
            ENABLED: config.get('open_telemetry.tracing.enabled'),
            JAEGER_EXPORTER: {
                ENDPOINT: config.get('open_telemetry.tracing.jaeger_exporter.endpoint')
            }
        }
    },
    TRENDING: {
        VIDEOS: {
            INTERVAL_DAYS: config.get('trending.videos.interval_days'),
            ALGORITHMS: {
                get ENABLED() {
                    return config.get('trending.videos.algorithms.enabled');
                },
                get DEFAULT() {
                    return config.get('trending.videos.algorithms.default');
                }
            }
        }
    },
    REDUNDANCY: {
        VIDEOS: {
            CHECK_INTERVAL: parseDurationToMs(config.get('redundancy.videos.check_interval')),
            STRATEGIES: buildVideosRedundancy(config.get('redundancy.videos.strategies'))
        }
    },
    REMOTE_REDUNDANCY: {
        VIDEOS: {
            ACCEPT_FROM: config.get('remote_redundancy.videos.accept_from')
        }
    },
    CSP: {
        ENABLED: config.get('csp.enabled'),
        REPORT_ONLY: config.get('csp.report_only'),
        REPORT_URI: config.get('csp.report_uri')
    },
    SECURITY: {
        FRAMEGUARD: {
            ENABLED: config.get('security.frameguard.enabled')
        },
        POWERED_BY_HEADER: {
            ENABLED: config.get('security.powered_by_header.enabled')
        }
    },
    TRACKER: {
        ENABLED: config.get('tracker.enabled'),
        PRIVATE: config.get('tracker.private'),
        REJECT_TOO_MANY_ANNOUNCES: config.get('tracker.reject_too_many_announces')
    },
    HISTORY: {
        VIDEOS: {
            MAX_AGE: parseDurationToMs(config.get('history.videos.max_age'))
        }
    },
    VIEWS: {
        VIDEOS: {
            REMOTE: {
                MAX_AGE: parseDurationToMs(config.get('views.videos.remote.max_age'))
            },
            LOCAL_BUFFER_UPDATE_INTERVAL: parseDurationToMs(config.get('views.videos.local_buffer_update_interval')),
            VIEW_EXPIRATION: parseDurationToMs(config.get('views.videos.view_expiration')),
            COUNT_VIEW_AFTER: parseDurationToMs(config.get('views.videos.count_view_after')),
            TRUST_VIEWER_SESSION_ID: config.get('views.videos.trust_viewer_session_id'),
            WATCHING_INTERVAL: {
                ANONYMOUS: parseDurationToMs(config.get('views.videos.watching_interval.anonymous')),
                USERS: parseDurationToMs(config.get('views.videos.watching_interval.users'))
            }
        }
    },
    GEO_IP: {
        ENABLED: config.get('geo_ip.enabled'),
        COUNTRY: {
            DATABASE_URL: config.get('geo_ip.country.database_url')
        },
        CITY: {
            DATABASE_URL: config.get('geo_ip.city.database_url')
        }
    },
    PLUGINS: {
        INDEX: {
            ENABLED: config.get('plugins.index.enabled'),
            CHECK_LATEST_VERSIONS_INTERVAL: parseDurationToMs(config.get('plugins.index.check_latest_versions_interval')),
            URL: config.get('plugins.index.url')
        }
    },
    FEDERATION: {
        ENABLED: config.get('federation.enabled'),
        PREVENT_SSRF: config.get('federation.prevent_ssrf'),
        VIDEOS: {
            FEDERATE_UNLISTED: config.get('federation.videos.federate_unlisted'),
            CLEANUP_REMOTE_INTERACTIONS: config.get('federation.videos.cleanup_remote_interactions')
        },
        SIGN_FEDERATED_FETCHES: config.get('federation.sign_federated_fetches')
    },
    PEERTUBE: {
        CHECK_LATEST_VERSION: {
            ENABLED: config.get('peertube.check_latest_version.enabled'),
            URL: config.get('peertube.check_latest_version.url')
        }
    },
    WEBADMIN: {
        CONFIGURATION: {
            EDITION: {
                ALLOWED: config.get('webadmin.configuration.edition.allowed')
            }
        }
    },
    FEEDS: {
        VIDEOS: {
            COUNT: config.get('feeds.videos.count')
        },
        COMMENTS: {
            COUNT: config.get('feeds.comments.count')
        }
    },
    REMOTE_RUNNERS: {
        STALLED_JOBS: {
            LIVE: parseDurationToMs(config.get('remote_runners.stalled_jobs.live')),
            VOD: parseDurationToMs(config.get('remote_runners.stalled_jobs.vod'))
        }
    },
    THUMBNAILS: {
        GENERATION_FROM_VIDEO: {
            FRAMES_TO_ANALYZE: config.get('thumbnails.generation_from_video.frames_to_analyze')
        },
        SIZES: config.get('thumbnails.sizes')
    },
    STATS: {
        REGISTRATION_REQUESTS: {
            ENABLED: config.get('stats.registration_requests.enabled')
        },
        ABUSES: {
            ENABLED: config.get('stats.abuses.enabled')
        },
        TOTAL_MODERATORS: {
            ENABLED: config.get('stats.total_moderators.enabled')
        },
        TOTAL_ADMINS: {
            ENABLED: config.get('stats.total_admins.enabled')
        }
    },
    WEBRTC: {
        STUN_SERVERS: config.get('webrtc.stun_servers')
    },
    ADMIN: {
        get EMAIL() {
            return config.get('admin.email');
        }
    },
    CONTACT_FORM: {
        get ENABLED() {
            return config.get('contact_form.enabled');
        }
    },
    SIGNUP: {
        get ENABLED() {
            return config.get('signup.enabled');
        },
        get REQUIRES_APPROVAL() {
            return config.get('signup.requires_approval');
        },
        get LIMIT() {
            return config.get('signup.limit');
        },
        get REQUIRES_EMAIL_VERIFICATION() {
            return config.get('signup.requires_email_verification');
        },
        get MINIMUM_AGE() {
            return config.get('signup.minimum_age');
        },
        FILTERS: {
            CIDR: {
                get WHITELIST() {
                    return config.get('signup.filters.cidr.whitelist');
                },
                get BLACKLIST() {
                    return config.get('signup.filters.cidr.blacklist');
                }
            }
        }
    },
    USER: {
        HISTORY: {
            VIDEOS: {
                get ENABLED() {
                    return config.get('user.history.videos.enabled');
                }
            }
        },
        get VIDEO_QUOTA() {
            return parseBytes(config.get('user.video_quota'));
        },
        get VIDEO_QUOTA_DAILY() {
            return parseBytes(config.get('user.video_quota_daily'));
        },
        get DEFAULT_CHANNEL_NAME() {
            return config.get('user.default_channel_name');
        }
    },
    VIDEO_CHANNELS: {
        get MAX_PER_USER() {
            return config.get('video_channels.max_per_user');
        }
    },
    TRANSCODING: {
        get ENABLED() {
            return config.get('transcoding.enabled');
        },
        ORIGINAL_FILE: {
            get KEEP() {
                return config.get('transcoding.original_file.keep');
            }
        },
        get ALLOW_ADDITIONAL_EXTENSIONS() {
            return config.get('transcoding.allow_additional_extensions');
        },
        get ALLOW_AUDIO_FILES() {
            return config.get('transcoding.allow_audio_files');
        },
        get THREADS() {
            return config.get('transcoding.threads');
        },
        get CONCURRENCY() {
            return config.get('transcoding.concurrency');
        },
        get PROFILE() {
            return config.get('transcoding.profile');
        },
        get ALWAYS_TRANSCODE_ORIGINAL_RESOLUTION() {
            return config.get('transcoding.always_transcode_original_resolution');
        },
        RESOLUTIONS: {
            get '0p'() {
                return config.get('transcoding.resolutions.0p');
            },
            get '144p'() {
                return config.get('transcoding.resolutions.144p');
            },
            get '240p'() {
                return config.get('transcoding.resolutions.240p');
            },
            get '360p'() {
                return config.get('transcoding.resolutions.360p');
            },
            get '480p'() {
                return config.get('transcoding.resolutions.480p');
            },
            get '720p'() {
                return config.get('transcoding.resolutions.720p');
            },
            get '1080p'() {
                return config.get('transcoding.resolutions.1080p');
            },
            get '1440p'() {
                return config.get('transcoding.resolutions.1440p');
            },
            get '2160p'() {
                return config.get('transcoding.resolutions.2160p');
            }
        },
        FPS: {
            get MAX() {
                return config.get('transcoding.fps.max');
            }
        },
        HLS: {
            get ENABLED() {
                return config.get('transcoding.hls.enabled');
            },
            get SPLIT_AUDIO_AND_VIDEO() {
                return config.get('transcoding.hls.split_audio_and_video');
            }
        },
        WEB_VIDEOS: {
            get ENABLED() {
                return config.get('transcoding.web_videos.enabled');
            }
        },
        REMOTE_RUNNERS: {
            get ENABLED() {
                return config.get('transcoding.remote_runners.enabled');
            }
        }
    },
    LIVE: {
        get ENABLED() {
            return config.get('live.enabled');
        },
        get MAX_DURATION() {
            return parseDurationToMs(config.get('live.max_duration'));
        },
        get MAX_INSTANCE_LIVES() {
            return config.get('live.max_instance_lives');
        },
        get MAX_USER_LIVES() {
            return config.get('live.max_user_lives');
        },
        get ALLOW_REPLAY() {
            return config.get('live.allow_replay');
        },
        LATENCY_SETTING: {
            get ENABLED() {
                return config.get('live.latency_setting.enabled');
            }
        },
        RTMP: {
            get ENABLED() {
                return config.get('live.rtmp.enabled');
            },
            get PORT() {
                return config.get('live.rtmp.port');
            },
            get HOSTNAME() {
                return config.get('live.rtmp.hostname');
            },
            get PUBLIC_HOSTNAME() {
                return config.get('live.rtmp.public_hostname');
            }
        },
        RTMPS: {
            get ENABLED() {
                return config.get('live.rtmps.enabled');
            },
            get PORT() {
                return config.get('live.rtmps.port');
            },
            get HOSTNAME() {
                return config.get('live.rtmps.hostname');
            },
            get PUBLIC_HOSTNAME() {
                return config.get('live.rtmps.public_hostname');
            },
            get KEY_FILE() {
                return config.get('live.rtmps.key_file');
            },
            get CERT_FILE() {
                return config.get('live.rtmps.cert_file');
            }
        },
        TRANSCODING: {
            get ENABLED() {
                return config.get('live.transcoding.enabled');
            },
            get THREADS() {
                return config.get('live.transcoding.threads');
            },
            get PROFILE() {
                return config.get('live.transcoding.profile');
            },
            get ALWAYS_TRANSCODE_ORIGINAL_RESOLUTION() {
                return config.get('live.transcoding.always_transcode_original_resolution');
            },
            RESOLUTIONS: {
                get '0p'() {
                    return config.get('live.transcoding.resolutions.0p');
                },
                get '144p'() {
                    return config.get('live.transcoding.resolutions.144p');
                },
                get '240p'() {
                    return config.get('live.transcoding.resolutions.240p');
                },
                get '360p'() {
                    return config.get('live.transcoding.resolutions.360p');
                },
                get '480p'() {
                    return config.get('live.transcoding.resolutions.480p');
                },
                get '720p'() {
                    return config.get('live.transcoding.resolutions.720p');
                },
                get '1080p'() {
                    return config.get('live.transcoding.resolutions.1080p');
                },
                get '1440p'() {
                    return config.get('live.transcoding.resolutions.1440p');
                },
                get '2160p'() {
                    return config.get('live.transcoding.resolutions.2160p');
                }
            },
            FPS: {
                get MAX() {
                    return config.get('live.transcoding.fps.max');
                }
            },
            REMOTE_RUNNERS: {
                get ENABLED() {
                    return config.get('live.transcoding.remote_runners.enabled');
                }
            }
        }
    },
    VIDEO_STUDIO: {
        get ENABLED() {
            return config.get('video_studio.enabled');
        },
        REMOTE_RUNNERS: {
            get ENABLED() {
                return config.get('video_studio.remote_runners.enabled');
            }
        }
    },
    VIDEO_FILE: {
        UPDATE: {
            get ENABLED() {
                return config.get('video_file.update.enabled');
            }
        }
    },
    VIDEO_TRANSCRIPTION: {
        get ENABLED() {
            return config.get('video_transcription.enabled');
        },
        get ENGINE() {
            return config.get('video_transcription.engine');
        },
        get ENGINE_PATH() {
            return config.get('video_transcription.engine_path');
        },
        get MODEL() {
            return config.get('video_transcription.model');
        },
        get MODEL_PATH() {
            return config.get('video_transcription.model_path');
        },
        REMOTE_RUNNERS: {
            get ENABLED() {
                return config.get('video_transcription.remote_runners.enabled');
            }
        }
    },
    IMPORT: {
        VIDEOS: {
            get CONCURRENCY() {
                return config.get('import.videos.concurrency');
            },
            get TIMEOUT() {
                return parseDurationToMs(config.get('import.videos.timeout'));
            },
            HTTP: {
                get ENABLED() {
                    return config.get('import.videos.http.enabled');
                },
                YOUTUBE_DL_RELEASE: {
                    get URL() {
                        return config.get('import.videos.http.youtube_dl_release.url');
                    },
                    get NAME() {
                        return config.get('import.videos.http.youtube_dl_release.name');
                    },
                    get PYTHON_PATH() {
                        return config.get('import.videos.http.youtube_dl_release.python_path');
                    }
                },
                get FORCE_IPV4() {
                    return config.get('import.videos.http.force_ipv4');
                },
                get PROXIES() {
                    return config.get('import.videos.http.proxies');
                }
            },
            TORRENT: {
                get ENABLED() {
                    return config.get('import.videos.torrent.enabled');
                }
            }
        },
        VIDEO_CHANNEL_SYNCHRONIZATION: {
            get ENABLED() {
                return config.get('import.video_channel_synchronization.enabled');
            },
            get MAX_PER_USER() {
                return config.get('import.video_channel_synchronization.max_per_user');
            },
            get CHECK_INTERVAL() {
                return parseDurationToMs(config.get('import.video_channel_synchronization.check_interval'));
            },
            get VIDEOS_LIMIT_PER_SYNCHRONIZATION() {
                return config.get('import.video_channel_synchronization.videos_limit_per_synchronization');
            },
            get FULL_SYNC_VIDEOS_LIMIT() {
                return config.get('import.video_channel_synchronization.full_sync_videos_limit');
            }
        },
        USERS: {
            get ENABLED() {
                return config.get('import.users.enabled');
            }
        }
    },
    EXPORT: {
        USERS: {
            get ENABLED() {
                return config.get('export.users.enabled');
            },
            get MAX_USER_VIDEO_QUOTA() {
                return parseBytes(config.get('export.users.max_user_video_quota'));
            },
            get EXPORT_EXPIRATION() {
                return parseDurationToMs(config.get('export.users.export_expiration'));
            }
        }
    },
    AUTO_BLACKLIST: {
        VIDEOS: {
            OF_USERS: {
                get ENABLED() {
                    return config.get('auto_blacklist.videos.of_users.enabled');
                }
            }
        }
    },
    CACHE: {
        PREVIEWS: {
            get SIZE() {
                return config.get('cache.previews.size');
            }
        },
        VIDEO_CAPTIONS: {
            get SIZE() {
                return config.get('cache.captions.size');
            }
        },
        TORRENTS: {
            get SIZE() {
                return config.get('cache.torrents.size');
            }
        },
        STORYBOARDS: {
            get SIZE() {
                return config.get('cache.storyboards.size');
            }
        }
    },
    INSTANCE: {
        get NAME() {
            return config.get('instance.name');
        },
        get SHORT_DESCRIPTION() {
            return config.get('instance.short_description');
        },
        get DESCRIPTION() {
            return config.get('instance.description');
        },
        get TERMS() {
            return config.get('instance.terms');
        },
        get CODE_OF_CONDUCT() {
            return config.get('instance.code_of_conduct');
        },
        get CREATION_REASON() {
            return config.get('instance.creation_reason');
        },
        get MODERATION_INFORMATION() {
            return config.get('instance.moderation_information');
        },
        get ADMINISTRATOR() {
            return config.get('instance.administrator');
        },
        get MAINTENANCE_LIFETIME() {
            return config.get('instance.maintenance_lifetime');
        },
        get BUSINESS_MODEL() {
            return config.get('instance.business_model');
        },
        get HARDWARE_INFORMATION() {
            return config.get('instance.hardware_information');
        },
        get LANGUAGES() {
            return config.get('instance.languages') || [];
        },
        get CATEGORIES() {
            return config.get('instance.categories') || [];
        },
        get IS_NSFW() {
            return config.get('instance.is_nsfw');
        },
        get DEFAULT_NSFW_POLICY() {
            return config.get('instance.default_nsfw_policy');
        },
        get SERVER_COUNTRY() {
            return config.get('instance.server_country');
        },
        SUPPORT: {
            get TEXT() {
                return config.get('instance.support.text');
            }
        },
        SOCIAL: {
            get EXTERNAL_LINK() {
                return config.get('instance.social.external_link');
            },
            get MASTODON_LINK() {
                return config.get('instance.social.mastodon_link');
            },
            get BLUESKY() {
                return config.get('instance.social.bluesky_link');
            }
        },
        get DEFAULT_CLIENT_ROUTE() {
            return config.get('instance.default_client_route');
        },
        CUSTOMIZATIONS: {
            get JAVASCRIPT() {
                return config.get('instance.customizations.javascript');
            },
            get CSS() {
                return config.get('instance.customizations.css');
            }
        },
        get ROBOTS() {
            return config.get('instance.robots');
        },
        get SECURITYTXT() {
            return config.get('instance.securitytxt');
        }
    },
    SERVICES: {
        TWITTER: {
            get USERNAME() {
                return config.get('services.twitter.username');
            }
        }
    },
    FOLLOWERS: {
        INSTANCE: {
            get ENABLED() {
                return config.get('followers.instance.enabled');
            },
            get MANUAL_APPROVAL() {
                return config.get('followers.instance.manual_approval');
            }
        }
    },
    FOLLOWINGS: {
        INSTANCE: {
            AUTO_FOLLOW_BACK: {
                get ENABLED() {
                    return config.get('followings.instance.auto_follow_back.enabled');
                }
            },
            AUTO_FOLLOW_INDEX: {
                get ENABLED() {
                    return config.get('followings.instance.auto_follow_index.enabled');
                },
                get INDEX_URL() {
                    return config.get('followings.instance.auto_follow_index.index_url');
                }
            }
        }
    },
    THEME: {
        get DEFAULT() {
            return config.get('theme.default');
        }
    },
    BROADCAST_MESSAGE: {
        get ENABLED() {
            return config.get('broadcast_message.enabled');
        },
        get MESSAGE() {
            return config.get('broadcast_message.message');
        },
        get LEVEL() {
            return config.get('broadcast_message.level');
        },
        get DISMISSABLE() {
            return config.get('broadcast_message.dismissable');
        }
    },
    SEARCH: {
        REMOTE_URI: {
            get USERS() {
                return config.get('search.remote_uri.users');
            },
            get ANONYMOUS() {
                return config.get('search.remote_uri.anonymous');
            }
        },
        SEARCH_INDEX: {
            get ENABLED() {
                return config.get('search.search_index.enabled');
            },
            get URL() {
                return config.get('search.search_index.url');
            },
            get DISABLE_LOCAL_SEARCH() {
                return config.get('search.search_index.disable_local_search');
            },
            get IS_DEFAULT_SEARCH() {
                return config.get('search.search_index.is_default_search');
            }
        }
    },
    STORYBOARDS: {
        get ENABLED() {
            return config.get('storyboards.enabled');
        }
    }
};
function registerConfigChangedHandler(fun) {
    configChangedHandlers.push(fun);
}
function isEmailEnabled() {
    if (CONFIG.SMTP.TRANSPORT === 'sendmail' && CONFIG.SMTP.SENDMAIL)
        return true;
    if (CONFIG.SMTP.TRANSPORT === 'smtp' && CONFIG.SMTP.HOSTNAME && CONFIG.SMTP.PORT)
        return true;
    return false;
}
function getLocalConfigFilePath() {
    const localConfigDir = getLocalConfigDir();
    let filename = 'local';
    if (process.env.NODE_ENV)
        filename += `-${process.env.NODE_ENV}`;
    if (process.env.NODE_APP_INSTANCE)
        filename += `-${process.env.NODE_APP_INSTANCE}`;
    return join(localConfigDir, filename + '.json');
}
function getConfigModule() {
    return config;
}
export { CONFIG, getConfigModule, getLocalConfigFilePath, registerConfigChangedHandler, isEmailEnabled };
function getLocalConfigDir() {
    if (process.env.PEERTUBE_LOCAL_CONFIG)
        return process.env.PEERTUBE_LOCAL_CONFIG;
    const configSources = config.util.getConfigSources();
    if (configSources.length === 0)
        throw new Error('Invalid config source.');
    return dirname(configSources[0].name);
}
function buildVideosRedundancy(objs) {
    if (!objs)
        return [];
    if (!Array.isArray(objs))
        return objs;
    return objs.map(obj => {
        return Object.assign({}, obj, {
            minLifetime: parseDurationToMs(obj.min_lifetime),
            size: bytes.parse(obj.size),
            minViews: obj.min_views
        });
    });
}
export function reloadConfig() {
    function getConfigDirectories() {
        if (process.env.NODE_CONFIG_DIR) {
            return process.env.NODE_CONFIG_DIR.split(':');
        }
        return [join(root(), 'config')];
    }
    function purge() {
        const directories = getConfigDirectories();
        for (const fileName in require.cache) {
            if (directories.some(dir => fileName.includes(dir)) === false) {
                continue;
            }
            delete require.cache[fileName];
        }
        decacheModule(require, 'config');
    }
    purge();
    config = require('config');
    for (const configChangedHandler of configChangedHandlers) {
        configChangedHandler();
    }
    return Promise.resolve();
}
//# sourceMappingURL=config.js.map