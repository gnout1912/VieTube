import { arrayify } from '@peertube/peertube-core-utils';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { logger } from '../../../helpers/logger.js';
import { JobQueue } from '../../job-queue/index.js';
import { loadActorByUrl } from '../../model-loaders/index.js';
import { fetchAPObjectIfNeeded, getAPId } from '../activity.js';
import { checkUrlsSameHost } from '../url.js';
import { refreshActorIfNeeded } from './refresh.js';
import { APActorCreator, fetchRemoteActor } from './shared/index.js';
async function getOrCreateAPActor(activityActor, fetchType = 'association-ids', recurseIfNeeded = true, updateCollections = false) {
    const actorUrl = getAPId(activityActor);
    let actor = await loadActorFromDB(actorUrl, fetchType);
    let created = false;
    let accountPlaylistsUrl;
    if (!actor) {
        const { actorObject } = await fetchRemoteActor(actorUrl);
        if (actorObject === undefined)
            throw new Error(`Cannot fetch remote actor ${actorUrl}`);
        if (actorObject.id !== actorUrl)
            return getOrCreateAPActor(actorObject, 'all', recurseIfNeeded, updateCollections);
        let ownerActor;
        if (recurseIfNeeded === true && actorObject.type === 'Group') {
            ownerActor = await getOrCreateAPOwner(actorObject, actorUrl);
        }
        const creator = new APActorCreator(actorObject, ownerActor);
        actor = await retryTransactionWrapper(creator.create.bind(creator));
        created = true;
        accountPlaylistsUrl = actorObject.playlists;
    }
    if (actor.Account)
        actor.Account.Actor = actor;
    if (actor.VideoChannel)
        actor.VideoChannel.Actor = actor;
    const { actor: actorRefreshed, refreshed } = await refreshActorIfNeeded({ actor, fetchedType: fetchType });
    if (!actorRefreshed)
        throw new Error(`Actor ${actor.url} does not exist anymore.`);
    await scheduleOutboxFetchIfNeeded(actor, created, refreshed, updateCollections);
    await schedulePlaylistFetchIfNeeded(actor, created, accountPlaylistsUrl);
    return actorRefreshed;
}
async function getOrCreateAPOwner(actorObject, actorId) {
    const accountAttributedTo = await findOwner(actorId, actorObject.attributedTo, 'Person');
    if (!accountAttributedTo) {
        throw new Error(`Cannot find account attributed to video channel ${actorId}`);
    }
    try {
        const recurseIfNeeded = false;
        return getOrCreateAPActor(accountAttributedTo, 'all', recurseIfNeeded);
    }
    catch (err) {
        logger.error(`Cannot get or create account attributed to video channel ${actorId}`);
        throw new Error(err);
    }
}
async function findOwner(rootUrl, attributedTo, type) {
    for (const actorToCheck of arrayify(attributedTo)) {
        const actorObject = await fetchAPObjectIfNeeded(getAPId(actorToCheck));
        if (!actorObject) {
            logger.warn(`Unknown attributed to actor ${actorToCheck} for owner ${rootUrl}`);
            continue;
        }
        if (checkUrlsSameHost(actorObject.id, rootUrl) !== true) {
            logger.warn(`Account attributed to ${actorObject.id} does not have the same host than owner actor url ${rootUrl}`);
            continue;
        }
        if (actorObject.type === type)
            return actorObject;
    }
    return undefined;
}
export { getOrCreateAPOwner, getOrCreateAPActor, findOwner };
async function loadActorFromDB(actorUrl, fetchType) {
    let actor = await loadActorByUrl(actorUrl, fetchType);
    if (actor && (!actor.Account && !actor.VideoChannel)) {
        await actor.destroy();
        actor = null;
    }
    return actor;
}
async function scheduleOutboxFetchIfNeeded(actor, created, refreshed, updateCollections) {
    if ((created === true || refreshed === true) && updateCollections === true) {
        const payload = { uri: actor.outboxUrl, type: 'activity' };
        await JobQueue.Instance.createJob({ type: 'activitypub-http-fetcher', payload });
    }
}
async function schedulePlaylistFetchIfNeeded(actor, created, accountPlaylistsUrl) {
    if (created === true && actor.Account && accountPlaylistsUrl) {
        const payload = { uri: accountPlaylistsUrl, type: 'account-playlists', accountId: actor.Account.id };
        await JobQueue.Instance.createJob({ type: 'activitypub-http-fetcher', payload });
    }
}
//# sourceMappingURL=get.js.map