import { __decorate, __metadata } from "tslib";
import { Server as SocketServer } from 'socket.io';
import { isIdValid } from '../helpers/custom-validators/misc.js';
import { Debounce } from '../helpers/debounce.js';
import { logger } from '../helpers/logger.js';
import { authenticateRunnerSocket, authenticateSocket } from '../middlewares/index.js';
import { isDevInstance } from '@peertube/peertube-node-utils';
class PeerTubeSocket {
    constructor() {
        this.userNotificationSockets = {};
        this.runnerSockets = new Set();
    }
    init(server) {
        const io = new SocketServer(server, {
            cors: isDevInstance()
                ? { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
                : undefined
        });
        io.of('/user-notifications')
            .use(authenticateSocket)
            .on('connection', socket => {
            const userId = socket.handshake.auth.user.id;
            logger.debug('User %d connected to the notification system.', userId);
            if (!this.userNotificationSockets[userId])
                this.userNotificationSockets[userId] = [];
            this.userNotificationSockets[userId].push(socket);
            socket.on('disconnect', () => {
                logger.debug('User %d disconnected from SocketIO notifications.', userId);
                this.userNotificationSockets[userId] = this.userNotificationSockets[userId].filter(s => s !== socket);
            });
        });
        this.liveVideosNamespace = io.of('/live-videos')
            .on('connection', socket => {
            socket.on('subscribe', params => {
                const videoId = params.videoId + '';
                if (!isIdValid(videoId))
                    return;
                void socket.join(videoId);
            });
            socket.on('unsubscribe', params => {
                const videoId = params.videoId + '';
                if (!isIdValid(videoId))
                    return;
                void socket.leave(videoId);
            });
        });
        io.of('/runners')
            .use(authenticateRunnerSocket)
            .on('connection', socket => {
            const runner = socket.handshake.auth.runner;
            logger.debug(`New runner "${runner.name}" connected to the notification system.`);
            this.runnerSockets.add(socket);
            socket.on('disconnect', () => {
                logger.debug(`Runner "${runner.name}" disconnected from the notification system.`);
                this.runnerSockets.delete(socket);
            });
        });
    }
    sendNotification(userId, notification) {
        const sockets = this.userNotificationSockets[userId];
        if (!sockets)
            return;
        logger.debug('Sending user notification to user %d.', userId);
        const notificationMessage = notification.toFormattedJSON();
        for (const socket of sockets) {
            socket.emit('new-notification', notificationMessage);
        }
    }
    sendVideoLiveNewState(video) {
        const data = { state: video.state };
        const type = 'state-change';
        logger.debug('Sending video live new state notification of %s.', video.url, { state: video.state });
        this.liveVideosNamespace
            .in(video.id + '')
            .emit(type, data);
    }
    sendVideoViewsUpdate(video, numViewers) {
        const data = { viewers: numViewers };
        const type = 'views-change';
        logger.debug('Sending video live views update notification of %s.', video.url, { viewers: numViewers });
        this.liveVideosNamespace
            .in(video.id + '')
            .emit(type, data);
    }
    sendVideoForceEnd(video) {
        const type = 'force-end';
        logger.debug('Sending video live "force end" notification of %s.', video.url);
        this.liveVideosNamespace
            .in(video.id + '')
            .emit(type);
    }
    sendAvailableJobsPingToRunners() {
        logger.debug(`Sending available-jobs notification to ${this.runnerSockets.size} runner sockets`);
        for (const runners of this.runnerSockets) {
            runners.emit('available-jobs');
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
__decorate([
    Debounce({ timeoutMS: 1000 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PeerTubeSocket.prototype, "sendAvailableJobsPingToRunners", null);
export { PeerTubeSocket };
//# sourceMappingURL=peertube-socket.js.map