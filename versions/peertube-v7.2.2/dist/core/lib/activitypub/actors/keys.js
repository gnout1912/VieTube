import { createPrivateAndPublicKeys } from '../../../helpers/peertube-crypto.js';
async function generateAndSaveActorKeys(actor) {
    const { publicKey, privateKey } = await createPrivateAndPublicKeys();
    actor.publicKey = publicKey;
    actor.privateKey = privateKey;
    return actor.save();
}
export { generateAndSaveActorKeys };
//# sourceMappingURL=keys.js.map