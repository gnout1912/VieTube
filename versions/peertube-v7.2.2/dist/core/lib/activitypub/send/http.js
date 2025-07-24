import { ACTIVITY_PUB, HTTP_SIGNATURE } from '../../../initializers/constants.js';
import { ActorModel } from '../../../models/actor/actor.js';
import { getServerActor } from '../../../models/application/application.js';
import { getContextFilter } from '../context.js';
import { buildDigestFromWorker, signJsonLDObjectFromWorker } from '../../worker/parent-process.js';
import { signAndContextify } from '../../../helpers/activity-pub-utils.js';
import { logger } from '../../../helpers/logger.js';
export async function computeBody(payload) {
    let body = payload.body;
    if (payload.signatureActorId) {
        const actorSignature = await ActorModel.load(payload.signatureActorId);
        if (!actorSignature)
            throw new Error('Unknown signature actor id.');
        try {
            body = await signAndContextify({
                byActor: { url: actorSignature.url, privateKey: actorSignature.privateKey },
                data: payload.body,
                contextType: payload.contextType,
                contextFilter: getContextFilter(),
                signerFunction: signJsonLDObjectFromWorker
            });
        }
        catch (err) {
            logger.error('Cannot sign and contextify body', { body, err });
        }
    }
    return body;
}
export async function buildGlobalHTTPHeaders(body) {
    return {
        'digest': await buildDigestFromWorker(body),
        'content-type': 'application/activity+json',
        'accept': ACTIVITY_PUB.ACCEPT_HEADER
    };
}
export async function buildSignedRequestOptions(options) {
    let actor;
    if (options.signatureActorId) {
        actor = await ActorModel.load(options.signatureActorId);
        if (!actor)
            throw new Error('Unknown signature actor id.');
    }
    else {
        actor = await getServerActor();
    }
    return {
        algorithm: HTTP_SIGNATURE.ALGORITHM,
        authorizationHeaderName: HTTP_SIGNATURE.HEADER_NAME,
        keyId: actor.getPublicKeyUrl(),
        key: actor.privateKey,
        headers: options.hasPayload
            ? HTTP_SIGNATURE.HEADERS_TO_SIGN_WITH_PAYLOAD
            : HTTP_SIGNATURE.HEADERS_TO_SIGN_WITHOUT_PAYLOAD
    };
}
//# sourceMappingURL=http.js.map