import { CONFIG } from '../initializers/config.js';
import { WEBSERVER } from '../initializers/constants.js';
import { Secret, TOTP } from 'otpauth';
import { logger } from './logger.js';
import { decrypt } from './peertube-crypto.js';
async function isOTPValid(options) {
    const { token, encryptedSecret } = options;
    try {
        const secret = await decrypt(encryptedSecret, CONFIG.SECRETS.PEERTUBE);
        const totp = new TOTP(Object.assign(Object.assign({}, baseOTPOptions()), { secret }));
        const delta = totp.validate({
            token,
            window: 1
        });
        if (delta === null)
            return false;
        return true;
    }
    catch (err) {
        logger.error('Cannot decrypt/validate OTP', { err });
        return false;
    }
}
function generateOTPSecret(email) {
    const totp = new TOTP(Object.assign(Object.assign({}, baseOTPOptions()), { label: email, secret: new Secret() }));
    return {
        secret: totp.secret.base32,
        uri: totp.toString()
    };
}
export { generateOTPSecret, isOTPValid };
function baseOTPOptions() {
    return {
        issuer: WEBSERVER.HOST,
        algorithm: 'SHA1',
        digits: 6,
        period: 30
    };
}
//# sourceMappingURL=otp.js.map