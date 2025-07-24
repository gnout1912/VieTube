import { ACTOR_FOLLOW_SCORE } from '../initializers/constants.js';
import { logger } from '../helpers/logger.js';
class ActorFollowHealthCache {
    constructor() {
        this.pendingFollowsScore = {};
        this.pendingBadServer = new Set();
        this.pendingGoodServer = new Set();
        this.badInboxes = new Set();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    updateActorFollowsHealth(goodInboxes, badInboxes) {
        this.badInboxes.clear();
        if (goodInboxes.length === 0 && badInboxes.length === 0)
            return;
        logger.info('Updating %d good actor follows and %d bad actor follows scores in cache.', goodInboxes.length, badInboxes.length, { badInboxes });
        for (const goodInbox of goodInboxes) {
            if (this.pendingFollowsScore[goodInbox] === undefined)
                this.pendingFollowsScore[goodInbox] = 0;
            this.pendingFollowsScore[goodInbox] += ACTOR_FOLLOW_SCORE.BONUS;
        }
        for (const badInbox of badInboxes) {
            if (this.pendingFollowsScore[badInbox] === undefined)
                this.pendingFollowsScore[badInbox] = 0;
            this.pendingFollowsScore[badInbox] += ACTOR_FOLLOW_SCORE.PENALTY;
            this.badInboxes.add(badInbox);
        }
    }
    isBadInbox(inboxUrl) {
        return this.badInboxes.has(inboxUrl);
    }
    addBadServerId(serverId) {
        this.pendingBadServer.add(serverId);
    }
    getBadFollowingServerIds() {
        return Array.from(this.pendingBadServer);
    }
    clearBadFollowingServerIds() {
        this.pendingBadServer = new Set();
    }
    addGoodServerId(serverId) {
        this.pendingGoodServer.add(serverId);
    }
    getGoodFollowingServerIds() {
        return Array.from(this.pendingGoodServer);
    }
    clearGoodFollowingServerIds() {
        this.pendingGoodServer = new Set();
    }
    getPendingFollowsScore() {
        return this.pendingFollowsScore;
    }
    clearPendingFollowsScore() {
        this.pendingFollowsScore = {};
    }
}
export { ActorFollowHealthCache };
//# sourceMappingURL=actor-follow-health-cache.js.map