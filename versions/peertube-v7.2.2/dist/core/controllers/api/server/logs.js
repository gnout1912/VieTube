import express from 'express';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pick } from '@peertube/peertube-core-utils';
import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { isArray } from '../../../helpers/custom-validators/misc.js';
import { logger, mtimeSortFilesDesc } from '../../../helpers/logger.js';
import { CONFIG } from '../../../initializers/config.js';
import { AUDIT_LOG_FILENAME, LOG_FILENAME, MAX_LOGS_OUTPUT_CHARACTERS } from '../../../initializers/constants.js';
import { asyncMiddleware, authenticate, buildRateLimiter, ensureUserHasRight, optionalAuthenticate } from '../../../middlewares/index.js';
import { createClientLogValidator, getAuditLogsValidator, getLogsValidator } from '../../../middlewares/validators/logs.js';
const createClientLogRateLimiter = buildRateLimiter({
    windowMs: CONFIG.RATES_LIMIT.RECEIVE_CLIENT_LOG.WINDOW_MS,
    max: CONFIG.RATES_LIMIT.RECEIVE_CLIENT_LOG.MAX
});
const logsRouter = express.Router();
logsRouter.post('/logs/client', createClientLogRateLimiter, optionalAuthenticate, createClientLogValidator, createClientLog);
logsRouter.get('/logs', authenticate, ensureUserHasRight(UserRight.MANAGE_LOGS), getLogsValidator, asyncMiddleware(getLogs));
logsRouter.get('/audit-logs', authenticate, ensureUserHasRight(UserRight.MANAGE_LOGS), getAuditLogsValidator, asyncMiddleware(getAuditLogs));
export { logsRouter };
function createClientLog(req, res) {
    var _a, _b, _c;
    const logInfo = req.body;
    const meta = Object.assign({ tags: ['client'], username: (_c = (_b = (_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.User) === null || _c === void 0 ? void 0 : _c.username }, pick(logInfo, ['userAgent', 'stackTrace', 'meta', 'url']));
    logger.log(logInfo.level, `Client log: ${logInfo.message}`, meta);
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
const auditLogNameFilter = generateLogNameFilter(AUDIT_LOG_FILENAME);
async function getAuditLogs(req, res) {
    const output = await generateOutput({
        startDateQuery: req.query.startDate,
        endDateQuery: req.query.endDate,
        level: 'audit',
        nameFilter: auditLogNameFilter
    });
    return res.json(output).end();
}
const logNameFilter = generateLogNameFilter(LOG_FILENAME);
async function getLogs(req, res) {
    const output = await generateOutput({
        startDateQuery: req.query.startDate,
        endDateQuery: req.query.endDate,
        level: req.query.level || 'info',
        tagsOneOf: req.query.tagsOneOf,
        nameFilter: logNameFilter
    });
    return res.json(output);
}
async function generateOutput(options) {
    const { startDateQuery, level, nameFilter } = options;
    const tagsOneOf = Array.isArray(options.tagsOneOf) && options.tagsOneOf.length !== 0
        ? new Set(options.tagsOneOf)
        : undefined;
    const logFiles = await readdir(CONFIG.STORAGE.LOG_DIR);
    const sortedLogFiles = await mtimeSortFilesDesc(logFiles, CONFIG.STORAGE.LOG_DIR);
    let currentSize = 0;
    const startDate = new Date(startDateQuery);
    const endDate = options.endDateQuery ? new Date(options.endDateQuery) : new Date();
    let output = [];
    for (const meta of sortedLogFiles) {
        if (nameFilter.exec(meta.file) === null)
            continue;
        const path = join(CONFIG.STORAGE.LOG_DIR, meta.file);
        logger.debug('Opening %s to fetch logs.', path);
        const result = await getOutputFromFile({ path, startDate, endDate, level, currentSize, tagsOneOf });
        if (!result.output)
            break;
        output = result.output.concat(output);
        currentSize = result.currentSize;
        if (currentSize > MAX_LOGS_OUTPUT_CHARACTERS || (result.logTime && result.logTime < startDate.getTime()))
            break;
    }
    return output;
}
async function getOutputFromFile(options) {
    const { path, startDate, endDate, level, tagsOneOf } = options;
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    let currentSize = options.currentSize;
    let logTime;
    const logsLevel = {
        audit: -1,
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };
    const content = await readFile(path);
    const lines = content.toString().split('\n');
    const output = [];
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        let log;
        try {
            log = JSON.parse(line);
        }
        catch (_a) {
            continue;
        }
        logTime = new Date(log.timestamp).getTime();
        if (logTime >= startTime &&
            logTime <= endTime &&
            logsLevel[log.level] >= logsLevel[level] &&
            (!tagsOneOf || lineHasTag(log, tagsOneOf))) {
            output.push(log);
            currentSize += line.length;
            if (currentSize > MAX_LOGS_OUTPUT_CHARACTERS)
                break;
        }
        else if (logTime < startTime) {
            break;
        }
    }
    return { currentSize, output: output.reverse(), logTime };
}
function lineHasTag(line, tagsOneOf) {
    if (!isArray(line.tags))
        return false;
    for (const lineTag of line.tags) {
        if (tagsOneOf.has(lineTag))
            return true;
    }
    return false;
}
function generateLogNameFilter(baseName) {
    return new RegExp('^' + baseName.replace(/\.log$/, '') + '\\d*.log$');
}
//# sourceMappingURL=logs.js.map