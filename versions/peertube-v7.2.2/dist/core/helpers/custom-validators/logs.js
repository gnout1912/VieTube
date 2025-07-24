import validator from 'validator';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { exists } from './misc.js';
const serverLogLevels = new Set(['debug', 'info', 'warn', 'error']);
const clientLogLevels = new Set(['warn', 'error']);
function isValidLogLevel(value) {
    return exists(value) && serverLogLevels.has(value);
}
function isValidClientLogMessage(value) {
    return typeof value === 'string' && validator.default.isLength(value, CONSTRAINTS_FIELDS.LOGS.CLIENT_MESSAGE);
}
function isValidClientLogLevel(value) {
    return exists(value) && clientLogLevels.has(value);
}
function isValidClientLogStackTrace(value) {
    return typeof value === 'string' && validator.default.isLength(value, CONSTRAINTS_FIELDS.LOGS.CLIENT_STACK_TRACE);
}
function isValidClientLogMeta(value) {
    return typeof value === 'string' && validator.default.isLength(value, CONSTRAINTS_FIELDS.LOGS.CLIENT_META);
}
function isValidClientLogUserAgent(value) {
    return typeof value === 'string' && validator.default.isLength(value, CONSTRAINTS_FIELDS.LOGS.CLIENT_USER_AGENT);
}
export { isValidLogLevel, isValidClientLogMessage, isValidClientLogStackTrace, isValidClientLogMeta, isValidClientLogLevel, isValidClientLogUserAgent };
//# sourceMappingURL=logs.js.map