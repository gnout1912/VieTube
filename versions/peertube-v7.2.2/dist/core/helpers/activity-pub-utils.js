import { arrayify } from '@peertube/peertube-core-utils';
import { ACTIVITY_PUB, REMOTE_SCHEME } from '../initializers/constants.js';
import { isArray } from './custom-validators/misc.js';
import { doJSONRequest } from './requests.js';
export function buildGlobalHTTPHeaders(body, digestBuilder) {
    return {
        'digest': digestBuilder(body),
        'content-type': 'application/activity+json',
        'accept': ACTIVITY_PUB.ACCEPT_HEADER
    };
}
export async function activityPubContextify(data, type, contextFilter) {
    return Object.assign(Object.assign({}, await getContextData(type, contextFilter)), data);
}
export async function signAndContextify(options) {
    const { byActor, data, contextType, contextFilter, signerFunction } = options;
    const activity = contextType
        ? await activityPubContextify(data, contextType, contextFilter)
        : data;
    return signerFunction({ byActor, data: activity });
}
export async function getApplicationActorOfHost(host) {
    const url = REMOTE_SCHEME.HTTP + '://' + host + '/.well-known/nodeinfo';
    const { body } = await doJSONRequest(url);
    if (!isArray(body.links))
        return undefined;
    const found = body.links.find(l => l.rel === 'https://www.w3.org/ns/activitystreams#Application');
    return (found === null || found === void 0 ? void 0 : found.href) || undefined;
}
export function getAPPublicValue() {
    return 'https://www.w3.org/ns/activitystreams#Public';
}
export function hasAPPublic(toOrCC) {
    const publicValue = getAPPublicValue();
    return arrayify(toOrCC).some(f => f === 'as:Public' || publicValue);
}
const contextStore = {
    Video: buildContext({
        Hashtag: 'as:Hashtag',
        category: 'sc:category',
        licence: 'sc:license',
        subtitleLanguage: 'sc:subtitleLanguage',
        automaticallyGenerated: 'pt:automaticallyGenerated',
        sensitive: 'as:sensitive',
        language: 'sc:inLanguage',
        identifier: 'sc:identifier',
        isLiveBroadcast: 'sc:isLiveBroadcast',
        liveSaveReplay: {
            '@type': 'sc:Boolean',
            '@id': 'pt:liveSaveReplay'
        },
        permanentLive: {
            '@type': 'sc:Boolean',
            '@id': 'pt:permanentLive'
        },
        latencyMode: {
            '@type': 'sc:Number',
            '@id': 'pt:latencyMode'
        },
        Infohash: 'pt:Infohash',
        SensitiveTag: 'pt:SensitiveTag',
        tileWidth: {
            '@type': 'sc:Number',
            '@id': 'pt:tileWidth'
        },
        tileHeight: {
            '@type': 'sc:Number',
            '@id': 'pt:tileHeight'
        },
        tileDuration: {
            '@type': 'sc:Number',
            '@id': 'pt:tileDuration'
        },
        aspectRatio: {
            '@type': 'sc:Float',
            '@id': 'pt:aspectRatio'
        },
        uuid: {
            '@type': 'sc:identifier',
            '@id': 'pt:uuid'
        },
        originallyPublishedAt: 'sc:datePublished',
        uploadDate: 'sc:uploadDate',
        hasParts: 'sc:hasParts',
        views: {
            '@type': 'sc:Number',
            '@id': 'pt:views'
        },
        state: {
            '@type': 'sc:Number',
            '@id': 'pt:state'
        },
        size: {
            '@type': 'sc:Number',
            '@id': 'pt:size'
        },
        fps: {
            '@type': 'sc:Number',
            '@id': 'pt:fps'
        },
        commentsEnabled: {
            '@type': 'sc:Boolean',
            '@id': 'pt:commentsEnabled'
        },
        canReply: 'pt:canReply',
        commentsPolicy: {
            '@type': 'sc:Number',
            '@id': 'pt:commentsPolicy'
        },
        downloadEnabled: {
            '@type': 'sc:Boolean',
            '@id': 'pt:downloadEnabled'
        },
        waitTranscoding: {
            '@type': 'sc:Boolean',
            '@id': 'pt:waitTranscoding'
        },
        support: {
            '@type': 'sc:Text',
            '@id': 'pt:support'
        },
        likes: {
            '@id': 'as:likes',
            '@type': '@id'
        },
        dislikes: {
            '@id': 'as:dislikes',
            '@type': '@id'
        },
        shares: {
            '@id': 'as:shares',
            '@type': '@id'
        },
        comments: {
            '@id': 'as:comments',
            '@type': '@id'
        },
        PropertyValue: 'sc:PropertyValue',
        value: 'sc:value'
    }),
    Playlist: buildContext({
        Playlist: 'pt:Playlist',
        PlaylistElement: 'pt:PlaylistElement',
        position: {
            '@type': 'sc:Number',
            '@id': 'pt:position'
        },
        startTimestamp: {
            '@type': 'sc:Number',
            '@id': 'pt:startTimestamp'
        },
        stopTimestamp: {
            '@type': 'sc:Number',
            '@id': 'pt:stopTimestamp'
        },
        uuid: {
            '@type': 'sc:identifier',
            '@id': 'pt:uuid'
        }
    }),
    CacheFile: buildContext({
        expires: 'sc:expires',
        CacheFile: 'pt:CacheFile',
        size: {
            '@type': 'sc:Number',
            '@id': 'pt:size'
        },
        fps: {
            '@type': 'sc:Number',
            '@id': 'pt:fps'
        }
    }),
    Flag: buildContext({
        Hashtag: 'as:Hashtag'
    }),
    Actor: buildContext({
        playlists: {
            '@id': 'pt:playlists',
            '@type': '@id'
        },
        support: {
            '@type': 'sc:Text',
            '@id': 'pt:support'
        },
        lemmy: 'https://join-lemmy.org/ns#',
        postingRestrictedToMods: 'lemmy:postingRestrictedToMods'
    }),
    WatchAction: buildContext({
        WatchAction: 'sc:WatchAction',
        startTimestamp: {
            '@type': 'sc:Number',
            '@id': 'pt:startTimestamp'
        },
        endTimestamp: {
            '@type': 'sc:Number',
            '@id': 'pt:endTimestamp'
        },
        uuid: {
            '@type': 'sc:identifier',
            '@id': 'pt:uuid'
        },
        actionStatus: 'sc:actionStatus',
        watchSections: {
            '@type': '@id',
            '@id': 'pt:watchSections'
        },
        addressRegion: 'sc:addressRegion',
        addressCountry: 'sc:addressCountry'
    }),
    View: buildContext({
        WatchAction: 'sc:WatchAction',
        InteractionCounter: 'sc:InteractionCounter',
        interactionType: 'sc:interactionType',
        userInteractionCount: 'sc:userInteractionCount'
    }),
    Collection: buildContext(),
    Follow: buildContext(),
    Reject: buildContext(),
    Accept: buildContext(),
    Announce: buildContext(),
    Comment: buildContext({
        replyApproval: 'pt:replyApproval'
    }),
    Delete: buildContext(),
    Rate: buildContext(),
    ApproveReply: buildContext({
        ApproveReply: 'pt:ApproveReply'
    }),
    RejectReply: buildContext({
        RejectReply: 'pt:RejectReply'
    }),
    Chapters: buildContext({
        hasPart: 'sc:hasPart',
        endOffset: 'sc:endOffset',
        startOffset: 'sc:startOffset'
    })
};
let allContext;
export function getAllContext() {
    if (allContext)
        return allContext;
    const processed = new Set();
    allContext = [];
    let staticContext = {};
    for (const v of Object.values(contextStore)) {
        for (const item of v) {
            if (typeof item === 'string') {
                if (!processed.has(item)) {
                    allContext.push(item);
                }
                processed.add(item);
            }
            else {
                for (const subKey of Object.keys(item)) {
                    if (!processed.has(subKey)) {
                        staticContext = Object.assign(Object.assign({}, staticContext), { [subKey]: item[subKey] });
                    }
                    processed.add(subKey);
                }
            }
        }
    }
    allContext = [...allContext, staticContext];
    return allContext;
}
async function getContextData(type, contextFilter) {
    const contextData = contextFilter
        ? await contextFilter(contextStore[type])
        : contextStore[type];
    return { '@context': contextData };
}
function buildContext(contextValue) {
    const baseContext = [
        'https://www.w3.org/ns/activitystreams',
        'https://w3id.org/security/v1',
        {
            RsaSignature2017: 'https://w3id.org/security#RsaSignature2017'
        }
    ];
    if (!contextValue)
        return baseContext;
    return [
        ...baseContext,
        Object.assign({ pt: 'https://joinpeertube.org/ns#', sc: 'http://schema.org/' }, contextValue)
    ];
}
//# sourceMappingURL=activity-pub-utils.js.map