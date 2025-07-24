import { contentSecurityPolicy } from 'helmet';
import { CONFIG } from '../initializers/config.js';
const baseDirectives = Object.assign({}, {
    defaultSrc: ['\'none\''],
    connectSrc: ['*', 'data:'],
    mediaSrc: ['\'self\'', 'https:', 'blob:'],
    fontSrc: ['\'self\'', 'data:'],
    imgSrc: ['\'self\'', 'data:', 'blob:'],
    scriptSrc: ['\'self\' \'unsafe-inline\' \'unsafe-eval\'', 'blob:'],
    scriptSrcAttr: ['\'unsafe-inline\''],
    styleSrc: ['\'self\' \'unsafe-inline\''],
    objectSrc: ['\'none\''],
    formAction: ['\'self\''],
    frameAncestors: ['\'none\''],
    baseUri: ['\'self\''],
    manifestSrc: ['\'self\''],
    frameSrc: ['\'self\''],
    workerSrc: ['\'self\'', 'blob:']
}, CONFIG.CSP.REPORT_URI
    ? { reportUri: CONFIG.CSP.REPORT_URI }
    : {}, CONFIG.WEBSERVER.SCHEME === 'https'
    ? { upgradeInsecureRequests: [] }
    : {});
const baseCSP = contentSecurityPolicy({
    directives: baseDirectives,
    reportOnly: CONFIG.CSP.REPORT_ONLY
});
const embedCSP = contentSecurityPolicy({
    directives: Object.assign({}, baseDirectives, { frameAncestors: ['*'] }),
    reportOnly: CONFIG.CSP.REPORT_ONLY
});
export { baseCSP, embedCSP };
//# sourceMappingURL=csp.js.map