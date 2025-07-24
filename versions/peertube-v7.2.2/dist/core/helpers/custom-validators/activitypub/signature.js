import { exists } from '../misc.js';
import { isActivityPubUrlValid } from './misc.js';
function isSignatureTypeValid(signatureType) {
    return exists(signatureType) && signatureType === 'RsaSignature2017';
}
function isSignatureCreatorValid(signatureCreator) {
    return exists(signatureCreator) && isActivityPubUrlValid(signatureCreator);
}
function isSignatureValueValid(signatureValue) {
    return exists(signatureValue) && signatureValue.length > 0;
}
export { isSignatureTypeValid, isSignatureCreatorValid, isSignatureValueValid };
//# sourceMappingURL=signature.js.map