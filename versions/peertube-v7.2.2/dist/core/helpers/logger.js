import { context, trace } from '@opentelemetry/api';
import { omit } from '@peertube/peertube-core-utils';
import { isTestOrDevInstance } from '@peertube/peertube-node-utils';
import { stat } from 'fs/promises';
import { join } from 'path';
import { format as sqlFormat } from 'sql-formatter';
import { isatty } from 'tty';
import { createLogger, format, transports } from 'winston';
import { isMainThread } from 'worker_threads';
import { CONFIG } from '../initializers/config.js';
import { LOG_FILENAME } from '../initializers/constants.js';
const label = CONFIG.WEBSERVER.HOSTNAME + ':' + CONFIG.WEBSERVER.PORT;
const consoleLoggerFormat = format.printf(info => {
    let additionalInfos = JSON.stringify(getAdditionalInfo(info), removeCyclicValues(), 2);
    if (additionalInfos === undefined || additionalInfos === '{}')
        additionalInfos = '';
    else
        additionalInfos = ' ' + additionalInfos;
    if (info.sql) {
        if (CONFIG.LOG.PRETTIFY_SQL) {
            additionalInfos += '\n' + sqlFormat(info.sql, {
                language: 'postgresql',
                tabWidth: 2
            });
        }
        else {
            additionalInfos += ' - ' + info.sql;
        }
    }
    return `[${info.label}] ${info.timestamp} ${info.level}: ${info.message}${additionalInfos}`;
});
export const jsonLoggerFormat = format.printf(info => {
    return JSON.stringify(info, removeCyclicValues());
});
export const labelFormatter = (suffix) => {
    return format.label({
        label: suffix ? `${label} ${suffix}` : label
    });
};
export function buildLogger(options) {
    var _a;
    const { labelSuffix, handleExceptions = false } = options;
    const formatters = [
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        })
    ];
    if (doesConsoleSupportColor())
        formatters.push(format.colorize());
    formatters.push(consoleLoggerFormat);
    const consoleTransport = new transports.Console({
        handleExceptions,
        format: format.combine(...formatters)
    });
    const fileLoggerOptions = {
        filename: join(CONFIG.STORAGE.LOG_DIR, LOG_FILENAME),
        handleExceptions,
        format: format.combine(format.timestamp(), jsonLoggerFormat)
    };
    if (CONFIG.LOG.ROTATION.ENABLED) {
        fileLoggerOptions.maxsize = CONFIG.LOG.ROTATION.MAX_FILE_SIZE;
        fileLoggerOptions.maxFiles = CONFIG.LOG.ROTATION.MAX_FILES;
    }
    const loggerTransports = [];
    if (isMainThread || isTestOrDevInstance()) {
        loggerTransports.push(new transports.File(fileLoggerOptions));
    }
    loggerTransports.push(consoleTransport);
    return createLogger({
        level: (_a = process.env.LOGGER_LEVEL) !== null && _a !== void 0 ? _a : CONFIG.LOG.LEVEL,
        defaultMeta: {
            get traceId() {
                var _a;
                return (_a = trace.getSpanContext(context.active())) === null || _a === void 0 ? void 0 : _a.traceId;
            },
            get spanId() {
                var _a;
                return (_a = trace.getSpanContext(context.active())) === null || _a === void 0 ? void 0 : _a.spanId;
            },
            get traceFlags() {
                var _a;
                return (_a = trace.getSpanContext(context.active())) === null || _a === void 0 ? void 0 : _a.traceFlags;
            }
        },
        format: format.combine(labelFormatter(labelSuffix), format.splat()),
        transports: loggerTransports,
        exitOnError: true
    });
}
export const logger = buildLogger({ handleExceptions: true });
export const bunyanLogger = {
    level: () => { },
    trace: bunyanLogFactory('debug'),
    debug: bunyanLogFactory('debug'),
    verbose: bunyanLogFactory('debug'),
    info: bunyanLogFactory('info'),
    warn: bunyanLogFactory('warn'),
    error: bunyanLogFactory('error'),
    fatal: bunyanLogFactory('error')
};
function bunyanLogFactory(level) {
    return function (...params) {
        let meta = null;
        let args = [].concat(params);
        if (arguments[0] instanceof Error) {
            meta = arguments[0].toString();
            args = Array.prototype.slice.call(arguments, 1);
            args.push(meta);
        }
        else if (typeof (args[0]) !== 'string') {
            meta = arguments[0];
            args = Array.prototype.slice.call(arguments, 1);
            args.push(meta);
        }
        logger[level].apply(logger, args);
    };
}
export function loggerTagsFactory(...defaultTags) {
    return (...tags) => {
        return { tags: defaultTags.concat(tags) };
    };
}
export async function mtimeSortFilesDesc(files, basePath) {
    const promises = [];
    const out = [];
    for (const file of files) {
        const p = stat(basePath + '/' + file)
            .then(stats => {
            if (stats.isFile())
                out.push({ file, mtime: stats.mtime.getTime() });
        });
        promises.push(p);
    }
    await Promise.all(promises);
    out.sort((a, b) => b.mtime - a.mtime);
    return out;
}
function removeCyclicValues() {
    const seen = new WeakSet();
    return (key, value) => {
        if (key === 'cert')
            return 'Replaced by the logger to avoid large log message';
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value))
                return;
            seen.add(value);
        }
        if (value instanceof Set) {
            return Array.from(value);
        }
        if (value instanceof Map) {
            return Array.from(value.entries());
        }
        if (value instanceof Error) {
            const error = {};
            Object.getOwnPropertyNames(value).forEach(key => {
                error[key] = value[key];
            });
            return error;
        }
        return value;
    };
}
function getAdditionalInfo(info) {
    const toOmit = ['label', 'timestamp', 'level', 'message', 'sql', 'tags'];
    return omit(info, toOmit);
}
function doesConsoleSupportColor() {
    if (isTestOrDevInstance())
        return true;
    return isatty(1) && process.env.TERM && process.env.TERM !== 'dumb';
}
//# sourceMappingURL=logger.js.map