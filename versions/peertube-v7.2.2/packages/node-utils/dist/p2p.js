import { md5 } from './crypto.js';
export function generateP2PMediaLoaderHash(input) {
    return Buffer.from(md5(input).subarray(1).toString('base64'), 'utf-8').toString('hex');
}
//# sourceMappingURL=p2p.js.map