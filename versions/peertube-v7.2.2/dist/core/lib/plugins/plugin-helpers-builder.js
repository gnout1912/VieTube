import { join } from 'path';
import { buildLogger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { WEBSERVER } from '../../initializers/constants.js';
import { sequelizeTypescript } from '../../initializers/database.js';
import { AccountModel } from '../../models/account/account.js';
import { AccountBlocklistModel } from '../../models/account/account-blocklist.js';
import { getServerActor } from '../../models/application/application.js';
import { ServerModel } from '../../models/server/server.js';
import { ServerBlocklistModel } from '../../models/server/server-blocklist.js';
import { UserModel } from '../../models/user/user.js';
import { VideoModel } from '../../models/video/video.js';
import { VideoBlacklistModel } from '../../models/video/video-blacklist.js';
import { ffprobePromise } from '@peertube/peertube-ffmpeg';
import { FileStorage } from '@peertube/peertube-models';
import { addAccountInBlocklist, addServerInBlocklist, removeAccountFromBlocklist, removeServerFromBlocklist } from '../blocklist.js';
import { PeerTubeSocket } from '../peertube-socket.js';
import { ServerConfigManager } from '../server-config-manager.js';
import { blacklistVideo, unblacklistVideo } from '../video-blacklist.js';
import { VideoPathManager } from '../video-path-manager.js';
function buildPluginHelpers(httpServer, pluginModel, npmName) {
    const logger = buildPluginLogger(npmName);
    const database = buildDatabaseHelpers();
    const videos = buildVideosHelpers();
    const config = buildConfigHelpers();
    const server = buildServerHelpers(httpServer);
    const moderation = buildModerationHelpers();
    const plugin = buildPluginRelatedHelpers(pluginModel, npmName);
    const socket = buildSocketHelpers();
    const user = buildUserHelpers();
    return {
        logger,
        database,
        videos,
        config,
        moderation,
        plugin,
        server,
        socket,
        user
    };
}
export { buildPluginHelpers };
function buildPluginLogger(npmName) {
    return buildLogger({ labelSuffix: npmName });
}
function buildDatabaseHelpers() {
    return {
        query: sequelizeTypescript.query.bind(sequelizeTypescript)
    };
}
function buildServerHelpers(httpServer) {
    return {
        getHTTPServer: () => httpServer,
        getServerActor: () => getServerActor()
    };
}
function buildVideosHelpers() {
    return {
        loadByUrl: (url) => {
            return VideoModel.loadByUrl(url);
        },
        loadByIdOrUUID: (id) => {
            return VideoModel.load(id);
        },
        loadByIdOrUUIDWithFiles: (id) => {
            return VideoModel.loadWithFiles(id);
        },
        removeVideo: (id) => {
            return sequelizeTypescript.transaction(async (t) => {
                const video = await VideoModel.loadFull(id, t);
                await video.destroy({ transaction: t });
            });
        },
        ffprobe: (path) => {
            return ffprobePromise(path);
        },
        getFiles: async (id) => {
            const video = await VideoModel.loadFull(id);
            if (!video)
                return undefined;
            const webVideoFiles = (video.VideoFiles || []).map(f => ({
                path: f.storage === FileStorage.FILE_SYSTEM
                    ? VideoPathManager.Instance.getFSVideoFileOutputPath(video, f)
                    : null,
                url: f.getFileUrl(video),
                resolution: f.resolution,
                size: f.size,
                fps: f.fps
            }));
            const hls = video.getHLSPlaylist();
            const hlsVideoFiles = hls
                ? (video.getHLSPlaylist().VideoFiles || []).map(f => {
                    return {
                        path: f.storage === FileStorage.FILE_SYSTEM
                            ? VideoPathManager.Instance.getFSVideoFileOutputPath(hls, f)
                            : null,
                        url: f.getFileUrl(video),
                        resolution: f.resolution,
                        size: f.size,
                        fps: f.fps
                    };
                })
                : [];
            const thumbnails = video.Thumbnails.map(t => ({
                type: t.type,
                url: t.getOriginFileUrl(video),
                path: t.getPath()
            }));
            return {
                webVideo: {
                    videoFiles: webVideoFiles
                },
                hls: {
                    videoFiles: hlsVideoFiles
                },
                thumbnails
            };
        }
    };
}
function buildModerationHelpers() {
    return {
        blockServer: async (options) => {
            const serverToBlock = await ServerModel.loadOrCreateByHost(options.hostToBlock);
            const user = await UserModel.loadByAccountId(options.byAccountId);
            await addServerInBlocklist({
                byAccountId: options.byAccountId,
                targetServerId: serverToBlock.id,
                removeNotificationOfUserId: user === null || user === void 0 ? void 0 : user.id
            });
        },
        unblockServer: async (options) => {
            const serverBlock = await ServerBlocklistModel.loadByAccountAndHost(options.byAccountId, options.hostToUnblock);
            if (!serverBlock)
                return;
            await removeServerFromBlocklist(serverBlock);
        },
        blockAccount: async (options) => {
            const accountToBlock = await AccountModel.loadByHandle(options.handleToBlock);
            if (!accountToBlock)
                return;
            const user = await UserModel.loadByAccountId(options.byAccountId);
            await addAccountInBlocklist({
                byAccountId: options.byAccountId,
                targetAccountId: accountToBlock.id,
                removeNotificationOfUserId: user === null || user === void 0 ? void 0 : user.id
            });
        },
        unblockAccount: async (options) => {
            const targetAccount = await AccountModel.loadByHandle(options.handleToUnblock);
            if (!targetAccount)
                return;
            const accountBlock = await AccountBlocklistModel.loadByAccountAndTarget(options.byAccountId, targetAccount.id);
            if (!accountBlock)
                return;
            await removeAccountFromBlocklist(accountBlock);
        },
        blacklistVideo: async (options) => {
            const video = await VideoModel.loadFull(options.videoIdOrUUID);
            if (!video)
                return;
            await blacklistVideo(video, options.createOptions);
        },
        unblacklistVideo: async (options) => {
            const video = await VideoModel.loadFull(options.videoIdOrUUID);
            if (!video)
                return;
            const videoBlacklist = await VideoBlacklistModel.loadByVideoId(video.id);
            if (!videoBlacklist)
                return;
            await unblacklistVideo(videoBlacklist, video);
        }
    };
}
function buildConfigHelpers() {
    return {
        getWebserverUrl() {
            return WEBSERVER.URL;
        },
        getServerListeningConfig() {
            return { hostname: CONFIG.LISTEN.HOSTNAME, port: CONFIG.LISTEN.PORT };
        },
        getServerConfig() {
            return ServerConfigManager.Instance.getServerConfig();
        }
    };
}
function buildPluginRelatedHelpers(plugin, npmName) {
    return {
        getBaseStaticRoute: () => `/plugins/${plugin.name}/${plugin.version}/static/`,
        getBaseRouterRoute: () => `/plugins/${plugin.name}/${plugin.version}/router/`,
        getBaseWebSocketRoute: () => `/plugins/${plugin.name}/${plugin.version}/ws/`,
        getDataDirectoryPath: () => join(CONFIG.STORAGE.PLUGINS_DIR, 'data', npmName)
    };
}
function buildSocketHelpers() {
    return {
        sendNotification: (userId, notification) => {
            PeerTubeSocket.Instance.sendNotification(userId, notification);
        },
        sendVideoLiveNewState: (video) => {
            PeerTubeSocket.Instance.sendVideoLiveNewState(video);
        }
    };
}
function buildUserHelpers() {
    return {
        loadById: (id) => {
            return UserModel.loadByIdFull(id);
        },
        getAuthUser: (res) => {
            var _a, _b, _c;
            const user = ((_b = (_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.User) || ((_c = res.locals.videoFileToken) === null || _c === void 0 ? void 0 : _c.user);
            if (!user)
                return undefined;
            return UserModel.loadByIdFull(user.id);
        }
    };
}
//# sourceMappingURL=plugin-helpers-builder.js.map