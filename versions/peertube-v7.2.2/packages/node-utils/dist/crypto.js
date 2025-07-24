import { createHash } from 'crypto';
export function sha256(str, encoding = 'hex') {
    return createHash('sha256').update(str).digest(encoding);
}
export function sha1(str, encoding = 'hex') {
    return createHash('sha1').update(str).digest(encoding);
}
export function md5(str) {
    return createHash('md5').update(str).digest();
}
//# sourceMappingURL=crypto.js.map