import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { AbstractUserImporter } from './abstract-user-importer.js';
import { JobQueue } from '../../job-queue/job-queue.js';
import { isValidActorHandle } from '../../../helpers/custom-validators/activitypub/actor.js';
import { pick } from '@peertube/peertube-core-utils';
const lTags = loggerTagsFactory('user-import');
export class FollowingImporter extends AbstractUserImporter {
    getImportObjects(json) {
        return json.following;
    }
    sanitize(followingImportData) {
        if (!isValidActorHandle(followingImportData.targetHandle))
            return undefined;
        return pick(followingImportData, ['targetHandle']);
    }
    async importObject(followingImportData) {
        const [name, host] = followingImportData.targetHandle.split('@');
        const payload = {
            name,
            host,
            assertIsChannel: true,
            followerActorId: this.user.Account.Actor.id
        };
        await JobQueue.Instance.createJob({ type: 'activitypub-follow', payload });
        logger.info('Subscription job of %s created on user import.', followingImportData.targetHandle, lTags());
        return { duplicate: false };
    }
}
//# sourceMappingURL=following-importer.js.map