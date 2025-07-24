import { buildGlobalHTTPHeaders, buildSignedRequestOptions, computeBody } from '../../activitypub/send/http.js';
import { ActorFollowHealthCache } from '../../actor-follow-health-cache.js';
import { parallelHTTPBroadcastFromWorker, sequentialHTTPBroadcastFromWorker } from '../../worker/parent-process.js';
import { logger } from '../../../helpers/logger.js';
async function processActivityPubHttpSequentialBroadcast(job) {
    logger.info('Processing ActivityPub broadcast in job %s.', job.id);
    const requestOptions = await buildRequestOptions(job.data);
    const { badUrls, goodUrls } = await sequentialHTTPBroadcastFromWorker({ uris: job.data.uris, requestOptions });
    return ActorFollowHealthCache.Instance.updateActorFollowsHealth(goodUrls, badUrls);
}
async function processActivityPubParallelHttpBroadcast(job) {
    logger.info('Processing ActivityPub parallel broadcast in job %s.', job.id);
    const requestOptions = await buildRequestOptions(job.data);
    const { badUrls, goodUrls } = await parallelHTTPBroadcastFromWorker({ uris: job.data.uris, requestOptions });
    return ActorFollowHealthCache.Instance.updateActorFollowsHealth(goodUrls, badUrls);
}
export { processActivityPubHttpSequentialBroadcast, processActivityPubParallelHttpBroadcast };
async function buildRequestOptions(payload) {
    const body = await computeBody(payload);
    const httpSignatureOptions = await buildSignedRequestOptions({ signatureActorId: payload.signatureActorId, hasPayload: true });
    return {
        method: 'POST',
        json: body,
        httpSignature: httpSignatureOptions,
        headers: await buildGlobalHTTPHeaders(body)
    };
}
//# sourceMappingURL=activitypub-http-broadcast.js.map