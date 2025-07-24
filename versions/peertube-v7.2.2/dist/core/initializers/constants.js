var _a;
import { maxBy, minBy, randomInt } from '@peertube/peertube-core-utils';
import { AbuseState, ActorImageType, RunnerJobState, UserExportState, UserImportState, UserRegistrationState, VideoChannelSyncState, VideoCommentPolicy, VideoImportState, VideoPlaylistPrivacy, VideoPlaylistType, VideoPrivacy, VideoResolution, VideoState } from '@peertube/peertube-models';
import { isTestInstance, isTestOrDevInstance, root } from '@peertube/peertube-node-utils';
import { randomBytes } from 'crypto';
import { readJsonSync } from 'fs-extra/esm';
import invert from 'lodash-es/invert.js';
import { join } from 'path';
import { cpus } from 'os';
import { parseDurationToMs, sanitizeHost, sanitizeUrl } from '../helpers/core-utils.js';
import { CONFIG, registerConfigChangedHandler } from './config.js';
export const LAST_MIGRATION_VERSION = 895;
export const API_VERSION = 'v1';
export const PEERTUBE_VERSION = readJsonSync(join(root(), 'package.json')).version;
export const PAGINATION = {
    GLOBAL: {
        COUNT: {
            DEFAULT: 15,
            MAX: 100
        }
    },
    OUTBOX: {
        COUNT: {
            MAX: 50
        }
    }
};
export const WEBSERVER = {
    URL: '',
    HOST: '',
    SCHEME: '',
    WS: '',
    HOSTNAME: '',
    PORT: 0,
    RTMP_URL: '',
    RTMPS_URL: '',
    RTMP_BASE_LIVE_URL: '',
    RTMPS_BASE_LIVE_URL: ''
};
export const SORTABLE_COLUMNS = {
    ADMIN_USERS: ['id', 'username', 'videoQuotaUsed', 'createdAt', 'lastLoginDate', 'role'],
    USER_SUBSCRIPTIONS: ['id', 'createdAt', 'channelUpdatedAt'],
    ACCOUNTS: ['createdAt'],
    JOBS: ['createdAt'],
    VIDEO_CHANNELS: ['id', 'name', 'updatedAt', 'createdAt'],
    VIDEO_IMPORTS: ['createdAt'],
    VIDEO_CHANNEL_SYNCS: ['externalChannelUrl', 'videoChannel', 'createdAt', 'lastSyncAt', 'state'],
    VIDEO_COMMENT_THREADS: ['createdAt', 'totalReplies'],
    VIDEO_COMMENTS: ['createdAt'],
    VIDEO_PASSWORDS: ['createdAt'],
    VIDEO_RATES: ['createdAt'],
    BLACKLISTS: ['id', 'name', 'duration', 'views', 'likes', 'dislikes', 'uuid', 'createdAt'],
    INSTANCE_FOLLOWERS: ['createdAt', 'state', 'score'],
    INSTANCE_FOLLOWING: ['createdAt', 'redundancyAllowed', 'state'],
    ACCOUNT_FOLLOWERS: ['createdAt'],
    CHANNEL_FOLLOWERS: ['createdAt'],
    USER_REGISTRATIONS: ['createdAt', 'state'],
    RUNNERS: ['createdAt'],
    RUNNER_REGISTRATION_TOKENS: ['createdAt'],
    RUNNER_JOBS: ['updatedAt', 'createdAt', 'priority', 'state', 'progress'],
    VIDEOS: [
        'name',
        'duration',
        'createdAt',
        'publishedAt',
        'originallyPublishedAt',
        'views',
        'likes',
        'comments',
        'trending',
        'hot',
        'best',
        'localVideoFilesSize',
        'match'
    ],
    VIDEOS_SEARCH: ['name', 'duration', 'createdAt', 'publishedAt', 'originallyPublishedAt', 'views', 'likes', 'match', 'hot'],
    VIDEO_CHANNELS_SEARCH: ['match', 'displayName', 'createdAt'],
    VIDEO_PLAYLISTS_SEARCH: ['match', 'displayName', 'createdAt'],
    ABUSES: ['id', 'createdAt', 'state'],
    ACCOUNTS_BLOCKLIST: ['createdAt'],
    SERVERS_BLOCKLIST: ['createdAt'],
    WATCHED_WORDS_LISTS: ['createdAt', 'updatedAt', 'listName'],
    USER_NOTIFICATIONS: ['createdAt', 'read'],
    VIDEO_PLAYLISTS: ['name', 'displayName', 'createdAt', 'updatedAt'],
    PLUGINS: ['name', 'createdAt', 'updatedAt'],
    AVAILABLE_PLUGINS: ['npmName', 'popularity', 'trending'],
    VIDEO_REDUNDANCIES: ['name']
};
export const ROUTE_CACHE_LIFETIME = {
    FEEDS: '15 minutes',
    ROBOTS: '2 hours',
    SITEMAP: '1 day',
    SECURITYTXT: '2 hours',
    NODEINFO: '10 minutes',
    DNT_POLICY: '1 week',
    ACTIVITY_PUB: {
        VIDEOS: '1 second'
    },
    STATS: '4 hours',
    WELL_KNOWN: '1 day'
};
export const ACTOR_FOLLOW_SCORE = {
    PENALTY: -10,
    BONUS: 10,
    BASE: 1000,
    MAX: 10000
};
export const FOLLOW_STATES = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected'
};
export const REMOTE_SCHEME = {
    HTTP: 'https',
    WS: 'wss'
};
export const JOB_ATTEMPTS = {
    'activitypub-http-broadcast': 1,
    'activitypub-http-broadcast-parallel': 1,
    'activitypub-http-unicast': 1,
    'activitypub-http-fetcher': 2,
    'activitypub-follow': 5,
    'activitypub-cleaner': 1,
    'video-file-import': 1,
    'video-transcoding': 1,
    'video-import': 1,
    'email': 5,
    'actor-keys': 3,
    'videos-views-stats': 1,
    'activitypub-refresher': 1,
    'video-redundancy': 1,
    'video-live-ending': 1,
    'video-studio-edition': 1,
    'manage-video-torrent': 1,
    'video-channel-import': 1,
    'after-video-channel-import': 1,
    'move-to-object-storage': 3,
    'move-to-file-system': 3,
    'transcoding-job-builder': 1,
    'generate-video-storyboard': 1,
    'notify': 1,
    'federate-video': 1,
    'create-user-export': 1,
    'import-user-archive': 1,
    'video-transcription': 2
};
export const JOB_CONCURRENCY = {
    'activitypub-http-broadcast': 1,
    'activitypub-http-broadcast-parallel': 30,
    'activitypub-http-unicast': 30,
    'activitypub-http-fetcher': 3,
    'activitypub-cleaner': 1,
    'activitypub-follow': 1,
    'video-file-import': 1,
    'email': 5,
    'actor-keys': 1,
    'videos-views-stats': 1,
    'activitypub-refresher': 1,
    'video-redundancy': 1,
    'video-live-ending': 10,
    'video-studio-edition': 1,
    'manage-video-torrent': 1,
    'move-to-object-storage': 1,
    'move-to-file-system': 1,
    'video-channel-import': 1,
    'after-video-channel-import': 1,
    'transcoding-job-builder': 1,
    'generate-video-storyboard': 1,
    'notify': 5,
    'federate-video': 3,
    'create-user-export': 1,
    'import-user-archive': 1,
    'video-transcription': 1
};
export const JOB_TTL = {
    'activitypub-http-broadcast': 60000 * 10,
    'activitypub-http-broadcast-parallel': 60000 * 10,
    'activitypub-http-unicast': 60000 * 10,
    'activitypub-http-fetcher': 1000 * 3600 * 10,
    'activitypub-follow': 60000 * 10,
    'activitypub-cleaner': 1000 * 3600,
    'video-file-import': 1000 * 3600,
    'video-transcoding': 1000 * 3600 * 48,
    'video-studio-edition': 1000 * 3600 * 10,
    'video-import': CONFIG.IMPORT.VIDEOS.TIMEOUT,
    'email': 60000 * 10,
    'actor-keys': 60000 * 20,
    'videos-views-stats': undefined,
    'activitypub-refresher': 60000 * 10,
    'video-redundancy': 1000 * 3600 * 3,
    'video-live-ending': 1000 * 60 * 10,
    'generate-video-storyboard': 1000 * 3600 * 6,
    'manage-video-torrent': 1000 * 3600 * 3,
    'move-to-object-storage': 1000 * 60 * 60 * 3,
    'move-to-file-system': 1000 * 60 * 60 * 3,
    'video-channel-import': 1000 * 60 * 60 * 4,
    'after-video-channel-import': 60000 * 5,
    'transcoding-job-builder': 60000,
    'notify': 60000 * 5,
    'federate-video': 60000 * 5,
    'create-user-export': 60000 * 60 * 24,
    'import-user-archive': 60000 * 60 * 24,
    'video-transcription': 1000 * 3600 * 6
};
export const REPEAT_JOBS = {
    'videos-views-stats': {
        pattern: randomInt(1, 20) + ' * * * *'
    },
    'activitypub-cleaner': {
        pattern: '30 5 * * ' + randomInt(0, 7)
    }
};
export const JOB_PRIORITY = {
    TRANSCODING: 100,
    VIDEO_STUDIO: 150,
    TRANSCRIPTION: 200
};
export const JOB_REMOVAL_OPTIONS = {
    COUNT: 10000,
    SUCCESS: {
        'DEFAULT': parseDurationToMs('2 days'),
        'activitypub-http-broadcast-parallel': parseDurationToMs('10 minutes'),
        'activitypub-http-unicast': parseDurationToMs('1 hour'),
        'videos-views-stats': parseDurationToMs('3 hours'),
        'activitypub-refresher': parseDurationToMs('10 hours')
    },
    FAILURE: {
        DEFAULT: parseDurationToMs('7 days')
    }
};
export const VIDEO_IMPORT_TIMEOUT = Math.floor(JOB_TTL['video-import'] * 0.9);
export const RUNNER_JOBS = {
    MAX_FAILURES: 5,
    LAST_CONTACT_UPDATE_INTERVAL: 30000
};
export const BROADCAST_CONCURRENCY = 30;
export const CRAWL_REQUEST_CONCURRENCY = 1;
export const AP_CLEANER = {
    CONCURRENCY: 10,
    UNAVAILABLE_TRESHOLD: 3,
    PERIOD: parseDurationToMs('1 week')
};
export const REQUEST_TIMEOUTS = {
    DEFAULT: 7000,
    FILE: 30000,
    VIDEO_FILE: 60000,
    REDUNDANCY: JOB_TTL['video-redundancy']
};
export const SCHEDULER_INTERVALS_MS = {
    RUNNER_JOB_WATCH_DOG: Math.min(CONFIG.REMOTE_RUNNERS.STALLED_JOBS.VOD, CONFIG.REMOTE_RUNNERS.STALLED_JOBS.LIVE),
    ACTOR_FOLLOW_SCORES: 60000 * 60,
    REMOVE_OLD_JOBS: 60000 * 60,
    UPDATE_VIDEOS: 60000,
    YOUTUBE_DL_UPDATE: 60000 * 60 * 24,
    GEO_IP_UPDATE: 60000 * 60 * 24,
    VIDEO_VIEWS_BUFFER_UPDATE: CONFIG.VIEWS.VIDEOS.LOCAL_BUFFER_UPDATE_INTERVAL,
    CHECK_PLUGINS: CONFIG.PLUGINS.INDEX.CHECK_LATEST_VERSIONS_INTERVAL,
    CHECK_PEERTUBE_VERSION: 60000 * 60 * 24,
    AUTO_FOLLOW_INDEX_INSTANCES: 60000 * 60 * 24,
    REMOVE_OLD_VIEWS: 60000 * 60 * 24,
    REMOVE_OLD_HISTORY: 60000 * 60 * 24,
    REMOVE_EXPIRED_USER_EXPORTS: 1000 * 3600,
    UPDATE_INBOX_STATS: 1000 * 60,
    REMOVE_DANGLING_RESUMABLE_UPLOADS: 60000 * 60,
    CHANNEL_SYNC_CHECK_INTERVAL: CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.CHECK_INTERVAL
};
export const CONSTRAINTS_FIELDS = {
    USERS: {
        NAME: { min: 1, max: 120 },
        DESCRIPTION: { min: 3, max: 1000 },
        USERNAME: { min: 1, max: 50 },
        PASSWORD: { min: 6, max: 255 },
        VIDEO_QUOTA: { min: -1 },
        VIDEO_QUOTA_DAILY: { min: -1 },
        VIDEO_LANGUAGES: { max: 500 },
        BLOCKED_REASON: { min: 3, max: 250 }
    },
    ABUSES: {
        REASON: { min: 2, max: 3000 },
        MODERATION_COMMENT: { min: 2, max: 3000 }
    },
    ABUSE_MESSAGES: {
        MESSAGE: { min: 2, max: 3000 }
    },
    USER_REGISTRATIONS: {
        REASON_MESSAGE: { min: 2, max: 3000 },
        MODERATOR_MESSAGE: { min: 2, max: 3000 }
    },
    VIDEO_BLACKLIST: {
        REASON: { min: 2, max: 300 }
    },
    VIDEO_CHANNELS: {
        NAME: { min: 1, max: 120 },
        DESCRIPTION: { min: 3, max: 1000 },
        SUPPORT: { min: 3, max: 1000 },
        EXTERNAL_CHANNEL_URL: { min: 3, max: 2000 },
        URL: { min: 3, max: 2000 }
    },
    VIDEO_CHANNEL_SYNCS: {
        EXTERNAL_CHANNEL_URL: { min: 3, max: 2000 }
    },
    VIDEO_CAPTIONS: {
        CAPTION_FILE: {
            EXTNAME: ['.vtt', '.srt'],
            FILE_SIZE: {
                max: 20 * 1024 * 1024
            }
        }
    },
    VIDEO_IMPORTS: {
        URL: { min: 3, max: 2000 },
        TORRENT_NAME: { min: 3, max: 255 },
        TORRENT_FILE: {
            EXTNAME: ['.torrent'],
            FILE_SIZE: {
                max: 1024 * 200
            }
        }
    },
    VIDEOS_REDUNDANCY: {
        URL: { min: 3, max: 2000 }
    },
    VIDEO_RATES: {
        URL: { min: 3, max: 2000 }
    },
    VIDEOS: {
        NAME: { min: 3, max: 120 },
        LANGUAGE: { min: 1, max: 10 },
        TRUNCATED_DESCRIPTION: { min: 3, max: 250 },
        DESCRIPTION: { min: 3, max: 10000 },
        NSFW_SUMMARY: { min: 3, max: 250 },
        SUPPORT: { min: 3, max: 1000 },
        IMAGE: {
            EXTNAME: ['.png', '.jpg', '.jpeg', '.webp'],
            FILE_SIZE: {
                max: 8 * 1024 * 1024
            }
        },
        EXTNAME: [],
        INFO_HASH: { min: 10, max: 100 },
        DURATION: { min: 0 },
        TAGS: { min: 0, max: 5 },
        TAG: { min: 2, max: 30 },
        VIEWS: { min: 0 },
        LIKES: { min: 0 },
        DISLIKES: { min: 0 },
        FILE_SIZE: { min: -1 },
        PARTIAL_UPLOAD_SIZE: { max: 50 * 1024 * 1024 * 1024 },
        URL: { min: 3, max: 2000 }
    },
    VIDEO_SOURCE: {
        FILENAME: { min: 1, max: 1000 }
    },
    VIDEO_PLAYLISTS: {
        NAME: { min: 1, max: 120 },
        DESCRIPTION: { min: 3, max: 1000 },
        URL: { min: 3, max: 2000 },
        IMAGE: {
            EXTNAME: ['.jpg', '.jpeg'],
            FILE_SIZE: {
                max: 8 * 1024 * 1024
            }
        }
    },
    ACTORS: {
        PUBLIC_KEY: { min: 10, max: 5000 },
        PRIVATE_KEY: { min: 10, max: 5000 },
        URL: { min: 3, max: 2000 },
        IMAGE: {
            EXTNAME: ['.png', '.jpeg', '.jpg', '.gif', '.webp'],
            FILE_SIZE: {
                max: 8 * 1024 * 1024
            }
        }
    },
    VIDEO_EVENTS: {
        COUNT: { min: 0 }
    },
    VIDEO_COMMENTS: {
        TEXT: { min: 1, max: 10000 },
        URL: { min: 3, max: 2000 }
    },
    VIDEO_SHARE: {
        URL: { min: 3, max: 2000 }
    },
    CONTACT_FORM: {
        FROM_NAME: { min: 1, max: 120 },
        BODY: { min: 3, max: 5000 }
    },
    PLUGINS: {
        NAME: { min: 1, max: 214 },
        DESCRIPTION: { min: 1, max: 20000 }
    },
    COMMONS: {
        URL: { min: 5, max: 2000 }
    },
    VIDEO_STUDIO: {
        TASKS: { min: 1, max: 10 },
        CUT_TIME: { min: 0 }
    },
    LOGS: {
        CLIENT_MESSAGE: { min: 1, max: 1000 },
        CLIENT_STACK_TRACE: { min: 1, max: 15000 },
        CLIENT_META: { min: 1, max: 15000 },
        CLIENT_USER_AGENT: { min: 1, max: 200 }
    },
    RUNNERS: {
        TOKEN: { min: 1, max: 1000 },
        NAME: { min: 1, max: 100 },
        DESCRIPTION: { min: 1, max: 1000 }
    },
    RUNNER_JOBS: {
        TOKEN: { min: 1, max: 1000 },
        REASON: { min: 1, max: 5000 },
        ERROR_MESSAGE: { min: 1, max: 5000 },
        PROGRESS: { min: 0, max: 100 }
    },
    VIDEO_PASSWORD: {
        LENGTH: { min: 2, max: 100 }
    },
    VIDEO_CHAPTERS: {
        TITLE: { min: 1, max: 100 }
    },
    WATCHED_WORDS: {
        LIST_NAME: { min: 1, max: 100 },
        WORDS: { min: 1, max: 500 },
        WORD: { min: 1, max: 100 }
    },
    VIDEO_VIEW: {
        UA_INFO: { min: 1, max: 200 }
    }
};
export const VIEW_LIFETIME = {
    VIEW: CONFIG.VIEWS.VIDEOS.VIEW_EXPIRATION,
    VIEWER_COUNTER: 60000 * 2,
    VIEWER_STATS: 60000 * 60
};
export let VIEWER_SYNC_REDIS = 30000;
export const MAX_LOCAL_VIEWER_WATCH_SECTIONS = 100;
export let CONTACT_FORM_LIFETIME = 60000 * 60;
export const DEFAULT_AUDIO_RESOLUTION = VideoResolution.H_480P;
export const DEFAULT_AUDIO_MERGE_RESOLUTION = 25;
export const VIDEO_RATE_TYPES = {
    LIKE: 'like',
    DISLIKE: 'dislike'
};
export const USER_IMPORT = {
    MAX_PLAYLIST_ELEMENTS: 1000
};
export const FFMPEG_NICE = {
    LIVE: 5,
    THUMBNAIL: 10,
    VOD: 15
};
export const VIDEO_CATEGORIES = {
    1: 'Music',
    2: 'Films',
    3: 'Vehicles',
    4: 'Art',
    5: 'Sports',
    6: 'Travels',
    7: 'Gaming',
    8: 'People',
    9: 'Comedy',
    10: 'Entertainment',
    11: 'News & Politics',
    12: 'How To',
    13: 'Education',
    14: 'Activism',
    15: 'Science & Technology',
    16: 'Animals',
    17: 'Kids',
    18: 'Food'
};
export const VIDEO_LICENCES = {
    1: 'Attribution',
    2: 'Attribution - Share Alike',
    3: 'Attribution - No Derivatives',
    4: 'Attribution - Non Commercial',
    5: 'Attribution - Non Commercial - Share Alike',
    6: 'Attribution - Non Commercial - No Derivatives',
    7: 'Public Domain Dedication'
};
export const VIDEO_LANGUAGES = {};
export const VIDEO_PRIVACIES = {
    [VideoPrivacy.PUBLIC]: 'Public',
    [VideoPrivacy.UNLISTED]: 'Unlisted',
    [VideoPrivacy.PRIVATE]: 'Private',
    [VideoPrivacy.INTERNAL]: 'Internal',
    [VideoPrivacy.PASSWORD_PROTECTED]: 'Password protected'
};
export const VIDEO_STATES = {
    [VideoState.PUBLISHED]: 'Published',
    [VideoState.TO_TRANSCODE]: 'To transcode',
    [VideoState.TO_IMPORT]: 'To import',
    [VideoState.WAITING_FOR_LIVE]: 'Waiting for livestream',
    [VideoState.LIVE_ENDED]: 'Livestream ended',
    [VideoState.TO_MOVE_TO_EXTERNAL_STORAGE]: 'To move to an external storage',
    [VideoState.TRANSCODING_FAILED]: 'Transcoding failed',
    [VideoState.TO_MOVE_TO_EXTERNAL_STORAGE_FAILED]: 'External storage move failed',
    [VideoState.TO_EDIT]: 'To edit',
    [VideoState.TO_MOVE_TO_FILE_SYSTEM]: 'To move to file system',
    [VideoState.TO_MOVE_TO_FILE_SYSTEM_FAILED]: 'Move to file system failed'
};
export const VIDEO_IMPORT_STATES = {
    [VideoImportState.FAILED]: 'Failed',
    [VideoImportState.PENDING]: 'Pending',
    [VideoImportState.SUCCESS]: 'Success',
    [VideoImportState.REJECTED]: 'Rejected',
    [VideoImportState.CANCELLED]: 'Cancelled',
    [VideoImportState.PROCESSING]: 'Processing'
};
export const VIDEO_CHANNEL_SYNC_STATE = {
    [VideoChannelSyncState.FAILED]: 'Failed',
    [VideoChannelSyncState.SYNCED]: 'Synchronized',
    [VideoChannelSyncState.PROCESSING]: 'Processing',
    [VideoChannelSyncState.WAITING_FIRST_RUN]: 'Waiting first run'
};
export const ABUSE_STATES = {
    [AbuseState.PENDING]: 'Pending',
    [AbuseState.REJECTED]: 'Rejected',
    [AbuseState.ACCEPTED]: 'Accepted'
};
export const USER_REGISTRATION_STATES = {
    [UserRegistrationState.PENDING]: 'Pending',
    [UserRegistrationState.REJECTED]: 'Rejected',
    [UserRegistrationState.ACCEPTED]: 'Accepted'
};
export const VIDEO_PLAYLIST_PRIVACIES = {
    [VideoPlaylistPrivacy.PUBLIC]: 'Public',
    [VideoPlaylistPrivacy.UNLISTED]: 'Unlisted',
    [VideoPlaylistPrivacy.PRIVATE]: 'Private'
};
export const VIDEO_PLAYLIST_TYPES = {
    [VideoPlaylistType.REGULAR]: 'Regular',
    [VideoPlaylistType.WATCH_LATER]: 'Watch later'
};
export const RUNNER_JOB_STATES = {
    [RunnerJobState.PROCESSING]: 'Processing',
    [RunnerJobState.COMPLETED]: 'Completed',
    [RunnerJobState.COMPLETING]: 'Completing',
    [RunnerJobState.PENDING]: 'Pending',
    [RunnerJobState.ERRORED]: 'Errored',
    [RunnerJobState.WAITING_FOR_PARENT_JOB]: 'Waiting for parent job to finish',
    [RunnerJobState.CANCELLED]: 'Cancelled',
    [RunnerJobState.PARENT_ERRORED]: 'Parent job failed',
    [RunnerJobState.PARENT_CANCELLED]: 'Parent job cancelled'
};
export const USER_EXPORT_STATES = {
    [UserExportState.PENDING]: 'Pending',
    [UserExportState.PROCESSING]: 'Processing',
    [UserExportState.COMPLETED]: 'Completed',
    [UserExportState.ERRORED]: 'Failed'
};
export const USER_IMPORT_STATES = {
    [UserImportState.PENDING]: 'Pending',
    [UserImportState.PROCESSING]: 'Processing',
    [UserImportState.COMPLETED]: 'Completed',
    [UserImportState.ERRORED]: 'Failed'
};
export const VIDEO_COMMENTS_POLICY = {
    [VideoCommentPolicy.DISABLED]: 'Disabled',
    [VideoCommentPolicy.ENABLED]: 'Enabled',
    [VideoCommentPolicy.REQUIRES_APPROVAL]: 'Requires approval'
};
export const MIMETYPES = {
    AUDIO: {
        MIMETYPE_EXT: {
            'audio/mpeg': '.mp3',
            'audio/mp3': '.mp3',
            'application/ogg': '.ogg',
            'audio/ogg': '.ogg',
            'audio/x-ms-wma': '.wma',
            'audio/wav': '.wav',
            'audio/x-wav': '.wav',
            'audio/x-flac': '.flac',
            'audio/flac': '.flac',
            'audio/vnd.dlna.adts': '.aac',
            'audio/aac': '.aac',
            'audio/m4a': '.m4a',
            'audio/x-m4a': '.m4a',
            'audio/mp4': '.m4a',
            'audio/vnd.dolby.dd-raw': '.ac3',
            'audio/ac3': '.ac3'
        },
        EXT_MIMETYPE: null
    },
    VIDEO: {
        MIMETYPE_EXT: null,
        MIMETYPES_REGEX: null,
        EXT_MIMETYPE: null
    },
    IMAGE: {
        MIMETYPE_EXT: {
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/jpg': '.jpg',
            'image/jpeg': '.jpg'
        },
        EXT_MIMETYPE: null
    },
    VIDEO_CAPTIONS: {
        MIMETYPE_EXT: {
            'text/vtt': '.vtt',
            'application/x-subrip': '.srt',
            'text/plain': '.srt'
        },
        EXT_MIMETYPE: null
    },
    TORRENT: {
        MIMETYPE_EXT: {
            'application/x-bittorrent': '.torrent'
        }
    },
    M3U8: {
        MIMETYPE_EXT: {
            'application/vnd.apple.mpegurl': '.m3u8'
        }
    },
    AP_VIDEO: {
        MIMETYPE_EXT: {
            'video/mp4': '.mp4',
            'video/ogg': '.ogv',
            'video/webm': '.webm',
            'audio/mp4': '.mp4'
        }
    },
    AP_TORRENT: {
        MIMETYPE_EXT: {
            'application/x-bittorrent': '.torrent'
        }
    },
    AP_MAGNET: {
        MIMETYPE_EXT: {
            'application/x-bittorrent;x-scheme-handler/magnet': '.magnet'
        }
    }
};
MIMETYPES.AUDIO.EXT_MIMETYPE = invert(MIMETYPES.AUDIO.MIMETYPE_EXT);
MIMETYPES.IMAGE.EXT_MIMETYPE = invert(MIMETYPES.IMAGE.MIMETYPE_EXT);
MIMETYPES.VIDEO_CAPTIONS.EXT_MIMETYPE = invert(MIMETYPES.VIDEO_CAPTIONS.MIMETYPE_EXT);
export const BINARY_CONTENT_TYPES = new Set([
    'binary/octet-stream',
    'application/octet-stream',
    'application/x-binary'
]);
export const OVERVIEWS = {
    VIDEOS: {
        SAMPLE_THRESHOLD: 6,
        SAMPLES_COUNT: 20
    }
};
export const SERVER_ACTOR_NAME = 'peertube';
export const ACTIVITY_PUB = {
    POTENTIAL_ACCEPT_HEADERS: [
        'application/activity+json',
        'application/ld+json',
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
    ],
    ACCEPT_HEADER: 'application/activity+json, application/ld+json',
    COLLECTION_ITEMS_PER_PAGE: 10,
    FETCH_PAGE_LIMIT: 2000,
    MAX_RECURSION_COMMENTS: 100,
    ACTOR_REFRESH_INTERVAL: 3600 * 24 * 1000 * 2,
    VIDEO_REFRESH_INTERVAL: 3600 * 24 * 1000 * 2,
    VIDEO_PLAYLIST_REFRESH_INTERVAL: 3600 * 24 * 1000 * 2
};
export const ACTIVITY_PUB_ACTOR_TYPES = {
    GROUP: 'Group',
    PERSON: 'Person',
    APPLICATION: 'Application',
    ORGANIZATION: 'Organization',
    SERVICE: 'Service'
};
export const HTTP_SIGNATURE = {
    HEADER_NAME: 'signature',
    ALGORITHM: 'rsa-sha256',
    HEADERS_TO_SIGN_WITH_PAYLOAD: ['(request-target)', 'host', 'date', 'digest'],
    HEADERS_TO_SIGN_WITHOUT_PAYLOAD: ['(request-target)', 'host', 'date'],
    CLOCK_SKEW_SECONDS: 1800
};
export let PRIVATE_RSA_KEY_SIZE = 2048;
export const BCRYPT_SALT_SIZE = 10;
export const ENCRYPTION = {
    ALGORITHM: 'aes-256-cbc',
    IV: 16,
    SALT: 'peertube',
    ENCODING: 'hex'
};
export const USER_PASSWORD_RESET_LIFETIME = 60000 * 60;
export const USER_PASSWORD_CREATE_LIFETIME = 60000 * 60 * 24 * 7;
export const TWO_FACTOR_AUTH_REQUEST_TOKEN_LIFETIME = 60000 * 10;
export let JWT_TOKEN_USER_EXPORT_FILE_LIFETIME = '15 minutes';
export const EMAIL_VERIFY_LIFETIME = 60000 * 60;
export const NSFW_POLICY_TYPES = {
    DO_NOT_LIST: 'do_not_list',
    WARN: 'warn',
    BLUR: 'blur',
    DISPLAY: 'display'
};
export const USER_EXPORT_MAX_ITEMS = 1000;
export const USER_EXPORT_FILE_PREFIX = 'user-export-';
export const STATIC_PATHS = {
    LEGACY_WEB_VIDEOS: '/static/webseed/',
    WEB_VIDEOS: '/static/web-videos/',
    LEGACY_PRIVATE_WEB_VIDEOS: '/static/webseed/private/',
    PRIVATE_WEB_VIDEOS: '/static/web-videos/private/',
    REDUNDANCY: '/static/redundancy/',
    STREAMING_PLAYLISTS: {
        HLS: '/static/streaming-playlists/hls',
        PRIVATE_HLS: '/static/streaming-playlists/hls/private/'
    }
};
export const DOWNLOAD_PATHS = {
    TORRENTS: '/download/torrents/',
    GENERATE_VIDEO: '/download/videos/generate/',
    WEB_VIDEOS: '/download/web-videos/',
    HLS_VIDEOS: '/download/streaming-playlists/hls/videos/',
    USER_EXPORTS: '/download/user-exports/',
    ORIGINAL_VIDEO_FILE: '/download/original-video-files/'
};
export const LAZY_STATIC_PATHS = {
    THUMBNAILS: '/lazy-static/thumbnails/',
    BANNERS: '/lazy-static/banners/',
    AVATARS: '/lazy-static/avatars/',
    PREVIEWS: '/lazy-static/previews/',
    VIDEO_CAPTIONS: '/lazy-static/video-captions/',
    TORRENTS: '/lazy-static/torrents/',
    STORYBOARDS: '/lazy-static/storyboards/'
};
export const OBJECT_STORAGE_PROXY_PATHS = {
    LEGACY_PRIVATE_WEB_VIDEOS: '/object-storage-proxy/webseed/private/',
    PRIVATE_WEB_VIDEOS: '/object-storage-proxy/web-videos/private/',
    STREAMING_PLAYLISTS: {
        PRIVATE_HLS: '/object-storage-proxy/streaming-playlists/hls/private/'
    }
};
export const STATIC_MAX_AGE = {
    SERVER: '2h',
    LAZY_SERVER: '2d',
    CLIENT: '30d'
};
export const THUMBNAILS_SIZE = {
    width: minBy(CONFIG.THUMBNAILS.SIZES, 'width').width,
    height: minBy(CONFIG.THUMBNAILS.SIZES, 'width').height,
    minRemoteWidth: 150
};
export const PREVIEWS_SIZE = {
    width: maxBy(CONFIG.THUMBNAILS.SIZES, 'width').width,
    height: maxBy(CONFIG.THUMBNAILS.SIZES, 'width').height,
    minRemoteWidth: 400
};
export const ACTOR_IMAGES_SIZE = {
    [ActorImageType.AVATAR]: [
        {
            width: 1500,
            height: 1500
        },
        {
            width: 600,
            height: 600
        },
        {
            width: 120,
            height: 120
        },
        {
            width: 48,
            height: 48
        }
    ],
    [ActorImageType.BANNER]: [
        {
            width: 1920,
            height: 317
        },
        {
            width: 600,
            height: 100
        }
    ]
};
export const STORYBOARD = {
    SPRITE_MAX_SIZE: 192,
    SPRITES_MAX_EDGE_COUNT: 11
};
export const EMBED_SIZE = {
    width: 560,
    height: 315
};
export const FILES_CACHE = {
    PREVIEWS: {
        DIRECTORY: join(CONFIG.STORAGE.CACHE_DIR, 'previews'),
        MAX_AGE: 1000 * 3600 * 3
    },
    STORYBOARDS: {
        DIRECTORY: join(CONFIG.STORAGE.CACHE_DIR, 'storyboards'),
        MAX_AGE: 1000 * 3600 * 24
    },
    VIDEO_CAPTIONS: {
        DIRECTORY: join(CONFIG.STORAGE.CACHE_DIR, 'video-captions'),
        MAX_AGE: 1000 * 3600 * 3
    },
    TORRENTS: {
        DIRECTORY: join(CONFIG.STORAGE.CACHE_DIR, 'torrents'),
        MAX_AGE: 1000 * 3600 * 3
    }
};
export const LRU_CACHE = {
    USER_TOKENS: {
        MAX_SIZE: 1000
    },
    FILENAME_TO_PATH_PERMANENT_FILE_CACHE: {
        MAX_SIZE: 1000
    },
    STATIC_VIDEO_FILES_RIGHTS_CHECK: {
        MAX_SIZE: 5000,
        TTL: parseDurationToMs('10 seconds')
    },
    VIDEO_TOKENS: {
        MAX_SIZE: 100000,
        TTL: parseDurationToMs('8 hours')
    },
    WATCHED_WORDS_REGEX: {
        MAX_SIZE: 100,
        TTL: parseDurationToMs('24 hours')
    },
    TRACKER_IPS: {
        MAX_SIZE: 100000
    }
};
export const DIRECTORIES = {
    RESUMABLE_UPLOAD: join(CONFIG.STORAGE.TMP_DIR, 'resumable-uploads'),
    HLS_STREAMING_PLAYLIST: {
        PUBLIC: join(CONFIG.STORAGE.STREAMING_PLAYLISTS_DIR, 'hls'),
        PRIVATE: join(CONFIG.STORAGE.STREAMING_PLAYLISTS_DIR, 'hls', 'private')
    },
    WEB_VIDEOS: {
        PUBLIC: CONFIG.STORAGE.WEB_VIDEOS_DIR,
        PRIVATE: join(CONFIG.STORAGE.WEB_VIDEOS_DIR, 'private')
    },
    ORIGINAL_VIDEOS: CONFIG.STORAGE.ORIGINAL_VIDEO_FILES_DIR,
    HLS_REDUNDANCY: join(CONFIG.STORAGE.REDUNDANCY_DIR, 'hls'),
    LOCAL_PIP_DIRECTORY: join(CONFIG.STORAGE.BIN_DIR, 'pip')
};
export const RESUMABLE_UPLOAD_SESSION_LIFETIME = SCHEDULER_INTERVALS_MS.REMOVE_DANGLING_RESUMABLE_UPLOADS;
export const VIDEO_LIVE = {
    EXTENSION: '.ts',
    CLEANUP_DELAY: 1000 * 60 * 5,
    SEGMENT_TIME_SECONDS: {
        DEFAULT_LATENCY: 4,
        SMALL_LATENCY: 2
    },
    SEGMENTS_LIST_SIZE: 15,
    REPLAY_DIRECTORY: 'replay',
    EDGE_LIVE_DELAY_SEGMENTS_NOTIFICATION: 4,
    MAX_SOCKET_WAITING_DATA: 1024 * 1000 * 100,
    RTMP: {
        CHUNK_SIZE: 60000,
        GOP_CACHE: true,
        PING: 60,
        PING_TIMEOUT: 30,
        BASE_PATH: 'live'
    }
};
export const MEMOIZE_TTL = {
    OVERVIEWS_SAMPLE: 1000 * 3600 * 4,
    INFO_HASH_EXISTS: 1000 * 60,
    VIDEO_DURATION: 1000 * 10,
    LIVE_ABLE_TO_UPLOAD: 1000 * 60,
    LIVE_CHECK_SOCKET_HEALTH: 1000 * 60,
    GET_STATS_FOR_OPEN_TELEMETRY_METRICS: 1000 * 60,
    EMBED_HTML: 1000 * 10
};
export const MEMOIZE_LENGTH = {
    INFO_HASH_EXISTS: 200,
    VIDEO_DURATION: 200
};
export const totalCPUs = Math.max(cpus().length, 1);
export const WORKER_THREADS = {
    IDLE_TIMEOUT: 1000 * 10,
    DOWNLOAD_IMAGE: {
        CONCURRENCY: 3,
        MAX_THREADS: 1
    },
    PROCESS_IMAGE: {
        CONCURRENCY: 1,
        MAX_THREADS: Math.min(totalCPUs, 5)
    },
    GET_IMAGE_SIZE: {
        CONCURRENCY: 1,
        MAX_THREADS: Math.min(totalCPUs, 5)
    },
    SIGN_JSON_LD_OBJECT: {
        CONCURRENCY: 1,
        MAX_THREADS: 1
    },
    BUILD_DIGEST: {
        CONCURRENCY: 1,
        MAX_THREADS: 1
    }
};
export const REDUNDANCY = {
    VIDEOS: {
        RANDOMIZED_FACTOR: 5
    }
};
export const ACCEPT_HEADERS = ['html', 'application/json'].concat(ACTIVITY_PUB.POTENTIAL_ACCEPT_HEADERS);
export const OTP = {
    HEADER_NAME: 'x-peertube-otp',
    HEADER_REQUIRED_VALUE: 'required; app'
};
export const ASSETS_PATH = {
    DEFAULT_AUDIO_BACKGROUND: join(root(), 'dist', 'core', 'assets', 'default-audio-background.jpg'),
    DEFAULT_LIVE_BACKGROUND: join(root(), 'dist', 'core', 'assets', 'default-live-background.jpg')
};
export const CUSTOM_HTML_TAG_COMMENTS = {
    TITLE: '<!-- title tag -->',
    DESCRIPTION: '<!-- description tag -->',
    CUSTOM_CSS: '<!-- custom css tag -->',
    META_TAGS: '<!-- meta tags -->',
    SERVER_CONFIG: '<!-- server config -->'
};
export const MAX_LOGS_OUTPUT_CHARACTERS = 10 * 1000 * 1000;
export const LOG_FILENAME = 'peertube.log';
export const AUDIT_LOG_FILENAME = 'peertube-audit.log';
export const TRACKER_RATE_LIMITS = {
    INTERVAL: 60000 * 5,
    ANNOUNCES_PER_IP_PER_INFOHASH: 15,
    ANNOUNCES_PER_IP: 30,
    BLOCK_IP_LIFETIME: parseDurationToMs('3 minutes')
};
export const P2P_MEDIA_LOADER_PEER_VERSION = -2;
export const PLUGIN_GLOBAL_CSS_FILE_NAME = 'plugins-global.css';
export const PLUGIN_GLOBAL_CSS_PATH = join(CONFIG.STORAGE.TMP_DIR, PLUGIN_GLOBAL_CSS_FILE_NAME);
export let PLUGIN_EXTERNAL_AUTH_TOKEN_LIFETIME = 1000 * 60 * 5;
export const DEFAULT_THEME_NAME = 'default';
export const DEFAULT_USER_THEME_NAME = 'instance-default';
export const SEARCH_INDEX = {
    ROUTES: {
        VIDEOS: '/api/v1/search/videos',
        VIDEO_CHANNELS: '/api/v1/search/video-channels'
    }
};
export const STATS_TIMESERIE = {
    MAX_DAYS: 365 * 10
};
if (process.env.PRODUCTION_CONSTANTS !== 'true') {
    if (isTestOrDevInstance()) {
        PRIVATE_RSA_KEY_SIZE = 1024;
        ACTOR_FOLLOW_SCORE.BASE = 20;
        REMOTE_SCHEME.HTTP = 'http';
        REMOTE_SCHEME.WS = 'ws';
        STATIC_MAX_AGE.SERVER = '0';
        SCHEDULER_INTERVALS_MS.ACTOR_FOLLOW_SCORES = 1000;
        SCHEDULER_INTERVALS_MS.REMOVE_OLD_JOBS = 10000;
        SCHEDULER_INTERVALS_MS.REMOVE_OLD_HISTORY = 5000;
        SCHEDULER_INTERVALS_MS.REMOVE_OLD_VIEWS = 5000;
        SCHEDULER_INTERVALS_MS.UPDATE_VIDEOS = 5000;
        SCHEDULER_INTERVALS_MS.AUTO_FOLLOW_INDEX_INSTANCES = 5000;
        SCHEDULER_INTERVALS_MS.UPDATE_INBOX_STATS = 5000;
        SCHEDULER_INTERVALS_MS.CHECK_PEERTUBE_VERSION = 2000;
        REPEAT_JOBS['videos-views-stats'] = { every: 5000 };
        REPEAT_JOBS['activitypub-cleaner'] = { every: 5000 };
        AP_CLEANER.PERIOD = 5000;
        REDUNDANCY.VIDEOS.RANDOMIZED_FACTOR = 1;
        CONTACT_FORM_LIFETIME = 1000;
        JOB_ATTEMPTS['email'] = 1;
        FILES_CACHE.VIDEO_CAPTIONS.MAX_AGE = 3000;
        MEMOIZE_TTL.OVERVIEWS_SAMPLE = 3000;
        MEMOIZE_TTL.LIVE_ABLE_TO_UPLOAD = 3000;
        MEMOIZE_TTL.EMBED_HTML = 1;
        OVERVIEWS.VIDEOS.SAMPLE_THRESHOLD = 2;
        PLUGIN_EXTERNAL_AUTH_TOKEN_LIFETIME = 5000;
        JOB_REMOVAL_OPTIONS.SUCCESS['videos-views-stats'] = 10000;
        VIEWER_SYNC_REDIS = 1000;
    }
    if (isTestInstance()) {
        ACTIVITY_PUB.COLLECTION_ITEMS_PER_PAGE = 2;
        ACTIVITY_PUB.ACTOR_REFRESH_INTERVAL = 10 * 1000;
        ACTIVITY_PUB.VIDEO_REFRESH_INTERVAL = 10 * 1000;
        ACTIVITY_PUB.VIDEO_PLAYLIST_REFRESH_INTERVAL = 10 * 1000;
        CONSTRAINTS_FIELDS.ACTORS.IMAGE.FILE_SIZE.max = 100 * 1024;
        CONSTRAINTS_FIELDS.VIDEOS.IMAGE.FILE_SIZE.max = 400 * 1024;
        VIEW_LIFETIME.VIEWER_COUNTER = 1000 * 5;
        VIEW_LIFETIME.VIEWER_STATS = 1000 * 5;
        VIDEO_LIVE.CLEANUP_DELAY = (_a = getIntEnv('PEERTUBE_TEST_CONSTANTS_VIDEO_LIVE_CLEANUP_DELAY')) !== null && _a !== void 0 ? _a : 5000;
        VIDEO_LIVE.SEGMENT_TIME_SECONDS.DEFAULT_LATENCY = 2;
        VIDEO_LIVE.SEGMENT_TIME_SECONDS.SMALL_LATENCY = 1;
        VIDEO_LIVE.EDGE_LIVE_DELAY_SEGMENTS_NOTIFICATION = 1;
        RUNNER_JOBS.LAST_CONTACT_UPDATE_INTERVAL = 2000;
        JWT_TOKEN_USER_EXPORT_FILE_LIFETIME = '2 seconds';
    }
}
updateWebserverUrls();
updateWebserverConfig();
registerConfigChangedHandler(() => {
    updateWebserverUrls();
    updateWebserverConfig();
});
export async function loadLanguages() {
    if (Object.keys(VIDEO_LANGUAGES).length !== 0)
        return;
    Object.assign(VIDEO_LANGUAGES, await buildLanguages());
}
export const FILES_CONTENT_HASH = {
    MANIFEST: generateContentHash(),
    FAVICON: generateContentHash(),
    LOGO: generateContentHash()
};
export const VIDEO_FILTERS = {
    WATERMARK: {
        SIZE_RATIO: 1 / 10,
        HORIZONTAL_MARGIN_RATIO: 1 / 20,
        VERTICAL_MARGIN_RATIO: 1 / 20
    }
};
export async function buildLanguages() {
    const { iso6393 } = await import('iso-639-3');
    const languages = {};
    const additionalLanguages = {
        sgn: true,
        ase: true,
        asq: true,
        sdl: true,
        bfi: true,
        bzs: true,
        csl: true,
        cse: true,
        dsl: true,
        fsl: true,
        gsg: true,
        pks: true,
        jsl: true,
        sfs: true,
        swl: true,
        rsl: true,
        fse: true,
        kab: true,
        gcf: true,
        lat: true,
        epo: true,
        tlh: true,
        jbo: true,
        avk: true,
        zxx: true
    };
    iso6393
        .filter(l => {
        return (l.iso6391 !== undefined && l.type === 'living') ||
            additionalLanguages[l.iso6393] === true;
    })
        .forEach(l => {
        languages[l.iso6391 || l.iso6393] = l.name;
    });
    languages['oc'] = 'Occitan';
    languages['el'] = 'Greek';
    languages['tok'] = 'Toki Pona';
    languages['pt'] = 'Portuguese (Brazilian)';
    languages['pt-PT'] = 'Portuguese (Portugal)';
    languages['es'] = 'Spanish (Spain)';
    languages['es-419'] = 'Spanish (Latin America)';
    languages['zh-Hans'] = 'Simplified Chinese';
    languages['zh-Hant'] = 'Traditional Chinese';
    languages['ca-valencia'] = 'Valencian';
    return languages;
}
function buildVideoMimetypeExt() {
    const data = {
        'video/webm': '.webm',
        'video/ogg': ['.ogv'],
        'video/mp4': '.mp4'
    };
    if (CONFIG.TRANSCODING.ENABLED) {
        if (CONFIG.TRANSCODING.ALLOW_ADDITIONAL_EXTENSIONS) {
            data['video/ogg'].push('.ogg');
            Object.assign(data, {
                'video/x-matroska': '.mkv',
                'video/quicktime': ['.mov', '.qt', '.mqv'],
                'video/mov': '.mov',
                'video/x-m4v': '.m4v',
                'video/m4v': '.m4v',
                'video/x-flv': '.flv',
                'video/x-f4v': '.f4v',
                'video/x-ms-wmv': '.wmv',
                'video/x-msvideo': '.avi',
                'video/avi': '.avi',
                'video/3gpp': ['.3gp', '.3gpp'],
                'video/3gpp2': ['.3g2', '.3gpp2'],
                'application/x-nut': '.nut',
                'video/mp2t': ['.mts', 'ts'],
                'video/vnd.dlna.mpeg-tts': '.mts',
                'video/m2ts': '.m2ts',
                'video/mpv': '.mpv',
                'video/mpeg2': '.m2v',
                'video/mpeg': ['.m1v', '.mpg', '.mpe', '.mpeg', '.vob'],
                'video/dvd': '.vob',
                'application/octet-stream': null,
                'application/mxf': '.mxf'
            });
        }
        if (CONFIG.TRANSCODING.ALLOW_AUDIO_FILES) {
            Object.assign(data, MIMETYPES.AUDIO.MIMETYPE_EXT);
        }
    }
    return data;
}
function updateWebserverUrls() {
    WEBSERVER.URL = sanitizeUrl(CONFIG.WEBSERVER.SCHEME + '://' + CONFIG.WEBSERVER.HOSTNAME + ':' + CONFIG.WEBSERVER.PORT);
    WEBSERVER.HOST = sanitizeHost(CONFIG.WEBSERVER.HOSTNAME + ':' + CONFIG.WEBSERVER.PORT, REMOTE_SCHEME.HTTP);
    WEBSERVER.WS = CONFIG.WEBSERVER.WS;
    WEBSERVER.SCHEME = CONFIG.WEBSERVER.SCHEME;
    WEBSERVER.HOSTNAME = CONFIG.WEBSERVER.HOSTNAME;
    WEBSERVER.PORT = CONFIG.WEBSERVER.PORT;
    const rtmpHostname = CONFIG.LIVE.RTMP.PUBLIC_HOSTNAME || CONFIG.WEBSERVER.HOSTNAME;
    const rtmpsHostname = CONFIG.LIVE.RTMPS.PUBLIC_HOSTNAME || CONFIG.WEBSERVER.HOSTNAME;
    WEBSERVER.RTMP_URL = 'rtmp://' + rtmpHostname + ':' + CONFIG.LIVE.RTMP.PORT;
    WEBSERVER.RTMPS_URL = 'rtmps://' + rtmpsHostname + ':' + CONFIG.LIVE.RTMPS.PORT;
    WEBSERVER.RTMP_BASE_LIVE_URL = WEBSERVER.RTMP_URL + '/' + VIDEO_LIVE.RTMP.BASE_PATH;
    WEBSERVER.RTMPS_BASE_LIVE_URL = WEBSERVER.RTMPS_URL + '/' + VIDEO_LIVE.RTMP.BASE_PATH;
}
function updateWebserverConfig() {
    MIMETYPES.VIDEO.MIMETYPE_EXT = buildVideoMimetypeExt();
    MIMETYPES.VIDEO.MIMETYPES_REGEX = buildMimetypesRegex(MIMETYPES.VIDEO.MIMETYPE_EXT);
    MIMETYPES.VIDEO.EXT_MIMETYPE = buildVideoExtMimetype(MIMETYPES.VIDEO.MIMETYPE_EXT);
    CONSTRAINTS_FIELDS.VIDEOS.EXTNAME = Object.keys(MIMETYPES.VIDEO.EXT_MIMETYPE);
}
function buildVideoExtMimetype(obj) {
    const result = {};
    for (const mimetype of Object.keys(obj)) {
        const value = obj[mimetype];
        if (!value)
            continue;
        const extensions = Array.isArray(value) ? value : [value];
        for (const extension of extensions) {
            result[extension] = mimetype;
        }
    }
    return result;
}
function buildMimetypesRegex(obj) {
    return Object.keys(obj)
        .map(m => `(${m})`)
        .join('|');
}
function generateContentHash() {
    return randomBytes(20).toString('hex');
}
function getIntEnv(path) {
    if (process.env[path])
        return parseInt(process.env[path]);
    return undefined;
}
//# sourceMappingURL=constants.js.map