import httpSignature from '@peertube/http-signature';
import { CONFIG } from '../initializers/config.js';
import { createWriteStream } from 'fs';
import { remove } from 'fs-extra/esm';
import got from 'got';
import { gotSsrf } from 'got-ssrf';
import http from 'http';
import https from 'https';
import { HttpProxyAgent, HttpsProxyAgent } from './hpagent.js';
import { ACTIVITY_PUB, BINARY_CONTENT_TYPES, PEERTUBE_VERSION, REQUEST_TIMEOUTS, WEBSERVER } from '../initializers/constants.js';
import { pipelinePromise } from './core-utils.js';
import { logger, loggerTagsFactory } from './logger.js';
import { getProxy, isProxyEnabled } from './proxy.js';
const lTags = loggerTagsFactory('request');
export const unsafeSSRFGot = got.extend(Object.assign(Object.assign({}, getProxyAgent()), { headers: {
        'user-agent': getUserAgent()
    }, handlers: [
        (options, next) => {
            var _a;
            const promiseOrStream = next(options);
            const bodyKBLimit = (_a = options.context) === null || _a === void 0 ? void 0 : _a.bodyKBLimit;
            if (!bodyKBLimit)
                throw new Error('No KB limit for this request');
            const bodyLimit = bodyKBLimit * 1000;
            void promiseOrStream.on('downloadProgress', progress => {
                if (progress.transferred > bodyLimit && progress.percent !== 1) {
                    const message = `Exceeded the download limit of ${bodyLimit} B`;
                    logger.warn(message, lTags());
                    if (promiseOrStream.cancel) {
                        promiseOrStream.cancel();
                        return;
                    }
                    ;
                    promiseOrStream.destroy();
                }
            });
            return promiseOrStream;
        }
    ], hooks: {
        beforeRequest: [
            options => {
                const headers = options.headers || {};
                headers['host'] = buildUrl(options.url).host;
            },
            options => {
                var _a, _b;
                const httpSignatureOptions = (_a = options.context) === null || _a === void 0 ? void 0 : _a.httpSignature;
                if (httpSignatureOptions) {
                    const method = (_b = options.method) !== null && _b !== void 0 ? _b : 'GET';
                    const path = buildUrl(options.url).pathname;
                    if (!method || !path) {
                        throw new Error(`Cannot sign request without method (${method}) or path (${path}) ${options}`);
                    }
                    httpSignature.signRequest({
                        getHeader: function (header) {
                            const value = options.headers[header.toLowerCase()];
                            if (!value)
                                logger.warn('Unknown header requested by http-signature.', { headers: options.headers, header });
                            return value;
                        },
                        setHeader: function (header, value) {
                            options.headers[header] = value;
                        },
                        method,
                        path
                    }, httpSignatureOptions);
                }
            }
        ],
        beforeRetry: [
            (error, retryCount) => {
                logger.debug('Retrying request to %s.', error.request.requestUrl, Object.assign({ retryCount, error: buildRequestError(error) }, lTags()));
            }
        ]
    } }));
export const peertubeGot = CONFIG.FEDERATION.PREVENT_SSRF
    ? got.extend(gotSsrf, unsafeSSRFGot)
    : unsafeSSRFGot;
export function doRequest(url, options = {}) {
    const gotOptions = buildGotOptions(options);
    const gotInstance = options.preventSSRF === false
        ? unsafeSSRFGot
        : peertubeGot;
    return gotInstance(url, gotOptions)
        .catch(err => {
        throw buildRequestError(err);
    });
}
export function doJSONRequest(url, options = {}) {
    const gotOptions = buildGotOptions(options);
    const gotInstance = options.preventSSRF === false
        ? unsafeSSRFGot
        : peertubeGot;
    return gotInstance(url, Object.assign(Object.assign({}, gotOptions), { responseType: 'json' }))
        .catch(err => {
        throw buildRequestError(err);
    });
}
export async function doRequestAndSaveToFile(url, destPath, options = {}) {
    var _a;
    const gotOptions = buildGotOptions(Object.assign(Object.assign({}, options), { timeout: (_a = options.timeout) !== null && _a !== void 0 ? _a : REQUEST_TIMEOUTS.FILE }));
    const outFile = createWriteStream(destPath);
    try {
        await pipelinePromise(peertubeGot.stream(url, Object.assign(Object.assign({}, gotOptions), { isStream: true })), outFile);
    }
    catch (err) {
        remove(destPath)
            .catch(err => logger.error('Cannot remove %s after request failure.', destPath, Object.assign({ err }, lTags())));
        throw buildRequestError(err);
    }
}
export function generateRequestStream(url, options = {}) {
    var _a;
    const gotOptions = buildGotOptions(Object.assign(Object.assign({}, options), { timeout: (_a = options.timeout) !== null && _a !== void 0 ? _a : REQUEST_TIMEOUTS.DEFAULT }));
    return peertubeGot.stream(url, Object.assign(Object.assign({}, gotOptions), { isStream: true }));
}
export function getProxyAgent() {
    if (!isProxyEnabled()) {
        return {
            agent: {
                http: new http.Agent({ keepAlive: false }),
                https: new https.Agent({ keepAlive: false })
            }
        };
    }
    const proxy = getProxy();
    logger.info('Using proxy %s.', proxy, lTags());
    const proxyAgentOptions = {
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy
    };
    return {
        agent: {
            http: new HttpProxyAgent(proxyAgentOptions),
            https: new HttpsProxyAgent(proxyAgentOptions)
        }
    };
}
export function isBinaryResponse(result) {
    return BINARY_CONTENT_TYPES.has(result.headers['content-type']);
}
export function buildRequestError(error) {
    const newError = new Error(error.message);
    newError.name = error.name;
    newError.stack = error.stack;
    if (error.response) {
        newError.responseBody = error.response.body;
        newError.responseHeaders = error.response.headers;
        newError.statusCode = error.response.statusCode;
    }
    if (error.options) {
        newError.requestHeaders = error.options.headers;
        newError.requestUrl = error.options.url;
        newError.requestMethod = error.options.method;
    }
    return newError;
}
function getUserAgent() {
    return `PeerTube/${PEERTUBE_VERSION} (+${WEBSERVER.URL})`;
}
function buildGotOptions(options) {
    var _a;
    const { activityPub, bodyKBLimit = 3000 } = options;
    const context = { bodyKBLimit, httpSignature: options.httpSignature };
    let headers = options.headers || {};
    if (!headers.date) {
        headers = Object.assign(Object.assign({}, headers), { date: new Date().toUTCString() });
    }
    if (activityPub && !headers.accept) {
        headers = Object.assign(Object.assign({}, headers), { accept: ACTIVITY_PUB.ACCEPT_HEADER });
    }
    return {
        method: options.method,
        dnsCache: true,
        timeout: {
            request: (_a = options.timeout) !== null && _a !== void 0 ? _a : REQUEST_TIMEOUTS.DEFAULT
        },
        json: options.json,
        searchParams: options.searchParams,
        followRedirect: options.followRedirect,
        retry: {
            limit: 2
        },
        headers,
        context
    };
}
function buildUrl(url) {
    if (typeof url === 'string') {
        return new URL(url);
    }
    return url;
}
//# sourceMappingURL=requests.js.map