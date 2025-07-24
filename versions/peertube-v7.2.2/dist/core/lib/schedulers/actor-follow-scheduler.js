import { isTestOrDevInstance } from '@peertube/peertube-node-utils';
import { logger } from '../../helpers/logger.js';
import { ACTOR_FOLLOW_SCORE, SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js';
import { ActorFollowModel } from '../../models/actor/actor-follow.js';
import { ActorFollowHealthCache } from '../actor-follow-health-cache.js';
import { AbstractScheduler } from './abstract-scheduler.js';
export class ActorFollowScheduler extends AbstractScheduler {
    constructor() {
        super();
        this.schedulerIntervalMs = SCHEDULER_INTERVALS_MS.ACTOR_FOLLOW_SCORES;
    }
    async internalExecute() {
        await this.processPendingScores();
        await this.removeBadActorFollows();
    }
    async processPendingScores() {
        const pendingScores = ActorFollowHealthCache.Instance.getPendingFollowsScore();
        const badServerIds = ActorFollowHealthCache.Instance.getBadFollowingServerIds();
        const goodServerIds = ActorFollowHealthCache.Instance.getGoodFollowingServerIds();
        ActorFollowHealthCache.Instance.clearPendingFollowsScore();
        ActorFollowHealthCache.Instance.clearBadFollowingServerIds();
        ActorFollowHealthCache.Instance.clearGoodFollowingServerIds();
        for (const inbox of Object.keys(pendingScores)) {
            await ActorFollowModel.updateScore(inbox, pendingScores[inbox]);
        }
        await ActorFollowModel.updateScoreByFollowingServers(badServerIds, ACTOR_FOLLOW_SCORE.PENALTY);
        await ActorFollowModel.updateScoreByFollowingServers(goodServerIds, ACTOR_FOLLOW_SCORE.BONUS);
    }
    async removeBadActorFollows() {
        if (!isTestOrDevInstance())
            logger.info('Removing bad actor follows (scheduler).');
        try {
            await ActorFollowModel.removeBadActorFollows();
        }
        catch (err) {
            logger.error('Error in bad actor follows scheduler.', { err });
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=actor-follow-scheduler.js.map