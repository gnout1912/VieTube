import { ActorModel } from '../../models/actor/actor.js';
function loadActorByUrl(url, fetchType) {
    if (fetchType === 'all')
        return ActorModel.loadByUrlAndPopulateAccountAndChannel(url);
    if (fetchType === 'association-ids')
        return ActorModel.loadByUrl(url);
}
export { loadActorByUrl };
//# sourceMappingURL=actor.js.map