import { omit } from '@peertube/peertube-core-utils';
import { sha256 } from '@peertube/peertube-node-utils';
import { createSign, createVerify } from 'crypto';
import cloneDeep from 'lodash-es/cloneDeep.js';
import { getAllContext } from './activity-pub-utils.js';
import { jsonld } from './custom-jsonld-signature.js';
import { isArray } from './custom-validators/misc.js';
import { logger } from './logger.js';
import { assertIsInWorkerThread } from './threads.js';
export function compactJSONLDAndCheckSignature(fromActor, req) {
    if (req.body.signature.type === 'RsaSignature2017') {
        return compactJSONLDAndCheckRSA2017Signature(fromActor, req);
    }
    logger.warn('Unknown JSON LD signature %s.', req.body.signature.type, req.body);
    return Promise.resolve(false);
}
export async function compactJSONLDAndCheckRSA2017Signature(fromActor, req) {
    var _a, _b, _c, _d;
    const compacted = await jsonldCompact(omit(req.body, ['signature']));
    fixCompacted(req.body, compacted);
    req.body = Object.assign(Object.assign({}, compacted), { signature: req.body.signature });
    if (compacted['@include']) {
        logger.warn('JSON-LD @include is not supported');
        return false;
    }
    let safe = true;
    if ((compacted.type === 'Create' && (((_a = compacted === null || compacted === void 0 ? void 0 : compacted.object) === null || _a === void 0 ? void 0 : _a.type) === 'WatchAction' || ((_b = compacted === null || compacted === void 0 ? void 0 : compacted.object) === null || _b === void 0 ? void 0 : _b.type) === 'CacheFile')) ||
        (compacted.type === 'Undo' && ((_c = compacted === null || compacted === void 0 ? void 0 : compacted.object) === null || _c === void 0 ? void 0 : _c.type) === 'Create' && ((_d = compacted === null || compacted === void 0 ? void 0 : compacted.object) === null || _d === void 0 ? void 0 : _d.object.type) === 'CacheFile')) {
        safe = false;
    }
    const [documentHash, optionsHash] = await Promise.all([
        hashObject(compacted, safe),
        createSignatureHash(req.body.signature, safe)
    ]);
    const toVerify = optionsHash + documentHash;
    const verify = createVerify('RSA-SHA256');
    verify.update(toVerify, 'utf8');
    return verify.verify(fromActor.publicKey, req.body.signature.signatureValue, 'base64');
}
function fixCompacted(original, compacted) {
    if (!original || !compacted)
        return;
    for (const [k, v] of Object.entries(original)) {
        if (k === '@context' || k === 'signature')
            continue;
        if (v === undefined || v === null)
            continue;
        const cv = compacted[k];
        if (cv === undefined || cv === null)
            continue;
        if (typeof v === 'string') {
            if (v === 'https://www.w3.org/ns/activitystreams#Public' && cv === 'as:Public') {
                compacted[k] = v;
            }
        }
        if (isArray(v) && !isArray(cv)) {
            compacted[k] = [cv];
            for (let i = 0; i < v.length; i++) {
                if (v[i] === 'https://www.w3.org/ns/activitystreams#Public' && cv[i] === 'as:Public') {
                    compacted[k][i] = v[i];
                }
            }
        }
        if (typeof v === 'object') {
            fixCompacted(original[k], compacted[k]);
        }
    }
}
export async function signJsonLDObject(options) {
    const { byActor, data, disableWorkerThreadAssertion = false } = options;
    if (!disableWorkerThreadAssertion)
        assertIsInWorkerThread();
    const signature = {
        type: 'RsaSignature2017',
        creator: byActor.url,
        created: new Date().toISOString()
    };
    const [documentHash, optionsHash] = await Promise.all([
        createDocWithoutSignatureHash(data),
        createSignatureHash(signature)
    ]);
    const toSign = optionsHash + documentHash;
    const sign = createSign('RSA-SHA256');
    sign.update(toSign, 'utf8');
    const signatureValue = sign.sign(byActor.privateKey, 'base64');
    Object.assign(signature, { signatureValue });
    return Object.assign(data, { signature });
}
async function hashObject(obj, safe) {
    const res = await jsonldNormalize(obj, safe);
    return sha256(res);
}
function jsonldCompact(obj) {
    return jsonld.promises.compact(obj, getAllContext());
}
function jsonldNormalize(obj, safe) {
    return jsonld.promises.normalize(obj, {
        safe,
        algorithm: 'URDNA2015',
        format: 'application/n-quads'
    });
}
function createSignatureHash(signature, safe = true) {
    return hashObject(Object.assign({ '@context': [
            'https://w3id.org/security/v1',
            { RsaSignature2017: 'https://w3id.org/security#RsaSignature2017' }
        ] }, omit(signature, ['type', 'id', 'signatureValue'])), safe);
}
function createDocWithoutSignatureHash(doc) {
    const docWithoutSignature = cloneDeep(doc);
    delete docWithoutSignature.signature;
    return hashObject(docWithoutSignature, true);
}
//# sourceMappingURL=peertube-jsonld.js.map