import { buildGlobalHTTPHeaders, buildSignedRequestOptions, computeBody } from '../../activitypub/send/http.js';
import { logger } from '../../../helpers/logger.js';
import { ActorFollowHealthCache } from '../../actor-follow-health-cache.js';
import { httpUnicastFromWorker } from '../../worker/parent-process.js';
async function processActivityPubHttpUnicast(job) {
    logger.info('Processing ActivityPub unicast in job %s.', job.id);
    const payload = job.data;
    const uri = payload.uri;
    const body = await computeBody(payload);
    const httpSignatureOptions = await buildSignedRequestOptions({ signatureActorId: payload.signatureActorId, hasPayload: true });
    const options = {
        method: 'POST',
        json: body,
        httpSignature: httpSignatureOptions,
        headers: await buildGlobalHTTPHeaders(body)
    };
    try {
        await httpUnicastFromWorker({ uri, requestOptions: options });
        ActorFollowHealthCache.Instance.updateActorFollowsHealth([uri], []);
    }
    catch (err) {
        ActorFollowHealthCache.Instance.updateActorFollowsHealth([], [uri]);
        throw err;
    }
}
export { processActivityPubHttpUnicast };
//# sourceMappingURL=activitypub-http-unicast.js.map