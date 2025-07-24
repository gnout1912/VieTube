import { AUDIT_LOG_FILENAME } from '../initializers/constants.js';
import { diff } from 'deep-object-diff';
import { flatten } from 'flat';
import { join } from 'path';
import { addColors, config, createLogger, format, transports } from 'winston';
import { CONFIG } from '../initializers/config.js';
import { jsonLoggerFormat, labelFormatter } from './logger.js';
function getAuditIdFromRes(res) {
    return res.locals.oauth.token.User.username;
}
var AUDIT_TYPE;
(function (AUDIT_TYPE) {
    AUDIT_TYPE["CREATE"] = "create";
    AUDIT_TYPE["UPDATE"] = "update";
    AUDIT_TYPE["DELETE"] = "delete";
})(AUDIT_TYPE || (AUDIT_TYPE = {}));
const colors = config.npm.colors;
colors.audit = config.npm.colors.info;
addColors(colors);
const auditLogger = createLogger({
    levels: { audit: 0 },
    transports: [
        new transports.File({
            filename: join(CONFIG.STORAGE.LOG_DIR, AUDIT_LOG_FILENAME),
            level: 'audit',
            maxsize: 5242880,
            maxFiles: 5,
            format: format.combine(format.timestamp(), labelFormatter(), format.splat(), jsonLoggerFormat)
        })
    ],
    exitOnError: true
});
function auditLoggerWrapper(domain, user, action, entity, oldEntity = null) {
    let entityInfos;
    if (action === AUDIT_TYPE.UPDATE && oldEntity) {
        const oldEntityKeys = oldEntity.toLogKeys();
        const diffObject = diff(oldEntityKeys, entity.toLogKeys());
        const diffKeys = Object.entries(diffObject).reduce((newKeys, entry) => {
            newKeys[`new-${entry[0]}`] = entry[1];
            return newKeys;
        }, {});
        entityInfos = Object.assign(Object.assign({}, oldEntityKeys), diffKeys);
    }
    else {
        entityInfos = Object.assign({}, entity.toLogKeys());
    }
    auditLogger.log('audit', JSON.stringify(Object.assign({ user,
        domain,
        action }, entityInfos)));
}
function auditLoggerFactory(domain) {
    return {
        create(user, entity) {
            auditLoggerWrapper(domain, user, AUDIT_TYPE.CREATE, entity);
        },
        update(user, entity, oldEntity) {
            auditLoggerWrapper(domain, user, AUDIT_TYPE.UPDATE, entity, oldEntity);
        },
        delete(user, entity) {
            auditLoggerWrapper(domain, user, AUDIT_TYPE.DELETE, entity);
        }
    };
}
class EntityAuditView {
    constructor(keysToKeep, prefix, entityInfos) {
        this.keysToKeep = keysToKeep;
        this.prefix = prefix;
        this.entityInfos = entityInfos;
    }
    toLogKeys() {
        const obj = flatten(this.entityInfos, { delimiter: '-', safe: true });
        return Object.keys(obj)
            .filter(key => this.keysToKeep.has(key))
            .reduce((p, k) => (Object.assign(Object.assign({}, p), { [`${this.prefix}-${k}`]: obj[k] })), {});
    }
}
const videoKeysToKeep = new Set([
    'tags',
    'uuid',
    'id',
    'uuid',
    'createdAt',
    'updatedAt',
    'publishedAt',
    'category',
    'licence',
    'language',
    'privacy',
    'description',
    'duration',
    'isLocal',
    'name',
    'thumbnailPath',
    'previewPath',
    'nsfw',
    'waitTranscoding',
    'account-id',
    'account-uuid',
    'account-name',
    'channel-id',
    'channel-uuid',
    'channel-name',
    'support',
    'commentsPolicy',
    'downloadEnabled'
]);
class VideoAuditView extends EntityAuditView {
    constructor(video) {
        super(videoKeysToKeep, 'video', video);
    }
}
const videoImportKeysToKeep = new Set([
    'id',
    'targetUrl',
    'video-name'
]);
class VideoImportAuditView extends EntityAuditView {
    constructor(videoImport) {
        super(videoImportKeysToKeep, 'video-import', videoImport);
    }
}
const commentKeysToKeep = new Set([
    'id',
    'text',
    'threadId',
    'inReplyToCommentId',
    'videoId',
    'createdAt',
    'updatedAt',
    'totalReplies',
    'account-id',
    'account-uuid',
    'account-name'
]);
class CommentAuditView extends EntityAuditView {
    constructor(comment) {
        super(commentKeysToKeep, 'comment', comment);
    }
}
const userKeysToKeep = new Set([
    'id',
    'username',
    'email',
    'nsfwPolicy',
    'autoPlayVideo',
    'role',
    'videoQuota',
    'createdAt',
    'account-id',
    'account-uuid',
    'account-name',
    'account-followingCount',
    'account-followersCount',
    'account-createdAt',
    'account-updatedAt',
    'account-avatar-path',
    'account-avatar-createdAt',
    'account-avatar-updatedAt',
    'account-displayName',
    'account-description',
    'videoChannels'
]);
class UserAuditView extends EntityAuditView {
    constructor(user) {
        super(userKeysToKeep, 'user', user);
    }
}
const channelKeysToKeep = new Set([
    'id',
    'uuid',
    'name',
    'followingCount',
    'followersCount',
    'createdAt',
    'updatedAt',
    'avatar-path',
    'avatar-createdAt',
    'avatar-updatedAt',
    'displayName',
    'description',
    'support',
    'isLocal',
    'ownerAccount-id',
    'ownerAccount-uuid',
    'ownerAccount-name',
    'ownerAccount-displayedName'
]);
class VideoChannelAuditView extends EntityAuditView {
    constructor(channel) {
        super(channelKeysToKeep, 'channel', channel);
    }
}
const abuseKeysToKeep = new Set([
    'id',
    'reason',
    'reporterAccount',
    'createdAt'
]);
class AbuseAuditView extends EntityAuditView {
    constructor(abuse) {
        super(abuseKeysToKeep, 'abuse', abuse);
    }
}
const customConfigKeysToKeep = new Set([
    'instance-name',
    'instance-shortDescription',
    'instance-description',
    'instance-terms',
    'instance-defaultClientRoute',
    'instance-defaultNSFWPolicy',
    'instance-customizations-javascript',
    'instance-customizations-css',
    'services-twitter-username',
    'cache-previews-size',
    'cache-captions-size',
    'signup-enabled',
    'signup-limit',
    'signup-requiresEmailVerification',
    'admin-email',
    'user-videoQuota',
    'transcoding-enabled',
    'transcoding-threads',
    'transcoding-resolutions'
]);
class CustomConfigAuditView extends EntityAuditView {
    constructor(customConfig) {
        const infos = customConfig;
        const resolutionsDict = infos.transcoding.resolutions;
        const resolutionsArray = [];
        Object.entries(resolutionsDict)
            .forEach(([resolution, isEnabled]) => {
            if (isEnabled)
                resolutionsArray.push(resolution);
        });
        Object.assign({}, infos, { transcoding: { resolutions: resolutionsArray } });
        super(customConfigKeysToKeep, 'config', infos);
    }
}
const channelSyncKeysToKeep = new Set([
    'id',
    'externalChannelUrl',
    'channel-id',
    'channel-name'
]);
class VideoChannelSyncAuditView extends EntityAuditView {
    constructor(channelSync) {
        super(channelSyncKeysToKeep, 'channelSync', channelSync);
    }
}
export { getAuditIdFromRes, auditLoggerFactory, VideoImportAuditView, VideoChannelAuditView, CommentAuditView, UserAuditView, VideoAuditView, AbuseAuditView, CustomConfigAuditView, VideoChannelSyncAuditView };
//# sourceMappingURL=audit-logger.js.map