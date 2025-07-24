"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequelizeInstrumentation = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const version_1 = require("./version");
const utils_1 = require("./utils");
const instrumentation_1 = require("@opentelemetry/instrumentation");
class SequelizeInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super('opentelemetry-instrumentation-sequelize', version_1.VERSION, Object.assign({}, config));
    }
    setConfig(config = {}) {
        this._config = Object.assign({}, config);
    }
    init() {
        const connectionManagerInstrumentation = new instrumentation_1.InstrumentationNodeModuleFile('sequelize/lib/dialects/abstract/connection-manager.js', ['*'], this.patchConnectionManager.bind(this), this.unpatchConnectionManager.bind(this));
        const module = new instrumentation_1.InstrumentationNodeModuleDefinition(SequelizeInstrumentation.component, ['*'], this.patch.bind(this), this.unpatch.bind(this), [connectionManagerInstrumentation]);
        return module;
    }
    patchConnectionManager(moduleExports) {
        if (moduleExports === undefined || moduleExports === null) {
            return moduleExports;
        }
        api_1.diag.debug(`sequelize instrumentation: applying patch to sequelize ConnectionManager`);
        this.unpatchConnectionManager(moduleExports);
        this._wrap(moduleExports.ConnectionManager.prototype, 'getConnection', this._getConnectionPatch.bind(this));
        return moduleExports;
    }
    unpatchConnectionManager(moduleExports) {
        var _a, _b;
        if ((0, instrumentation_1.isWrapped)((_b = (_a = moduleExports === null || moduleExports === void 0 ? void 0 : moduleExports.ConnectionManager) === null || _a === void 0 ? void 0 : _a.prototype) === null || _b === void 0 ? void 0 : _b.getConnection)) {
            this._unwrap(moduleExports.ConnectionManager.prototype, 'getConnection');
        }
        return moduleExports;
    }
    patch(moduleExports, moduleVersion) {
        this.moduleVersion = moduleVersion;
        if (moduleExports === undefined || moduleExports === null) {
            return moduleExports;
        }
        api_1.diag.debug(`sequelize instrumentation: applying patch to sequelize`);
        this.unpatch(moduleExports);
        this._wrap(moduleExports.Sequelize.prototype, 'query', this._createQueryPatch.bind(this));
        return moduleExports;
    }
    unpatch(moduleExports) {
        if ((0, instrumentation_1.isWrapped)(moduleExports.Sequelize.prototype.query)) {
            this._unwrap(moduleExports.Sequelize.prototype, 'query');
        }
    }
    // run getConnection with suppressTracing, as it might call internally to `databaseVersion` function
    // which calls `query` and create internal span which we don't need to instrument
    _getConnectionPatch(original) {
        return function (...args) {
            return api_1.context.with((0, core_1.suppressTracing)(api_1.context.active()), () => original.apply(this, args));
        };
    }
    _createQueryPatch(original) {
        const self = this;
        return function (sql, option) {
            var _a, _b, _c, _d;
            if (((_a = self._config) === null || _a === void 0 ? void 0 : _a.ignoreOrphanedSpans) && !api_1.trace.getSpan(api_1.context.active())) {
                return original.apply(this, arguments);
            }
            let statement = (sql === null || sql === void 0 ? void 0 : sql.query) ? sql.query : sql;
            let operation = option === null || option === void 0 ? void 0 : option.type;
            if (typeof statement === 'string') {
                statement = statement.trim();
                if (!operation)
                    operation = statement.split(' ')[0];
            }
            const sequelizeInstance = this;
            const config = sequelizeInstance === null || sequelizeInstance === void 0 ? void 0 : sequelizeInstance.config;
            let tableName = (_c = (_b = option === null || option === void 0 ? void 0 : option.instance) === null || _b === void 0 ? void 0 : _b.constructor) === null || _c === void 0 ? void 0 : _c.tableName;
            if (!tableName) {
                if (Array.isArray(option === null || option === void 0 ? void 0 : option.tableNames) && option.tableNames.length > 0)
                    tableName = option === null || option === void 0 ? void 0 : option.tableNames.sort().join(',');
                else
                    tableName = (0, utils_1.extractTableFromQuery)(statement);
            }
            const attributes = {
                [semantic_conventions_1.SEMATTRS_DB_SYSTEM]: sequelizeInstance.getDialect(),
                [semantic_conventions_1.SEMATTRS_DB_USER]: config === null || config === void 0 ? void 0 : config.username,
                [semantic_conventions_1.SEMATTRS_NET_PEER_NAME]: config === null || config === void 0 ? void 0 : config.host,
                [semantic_conventions_1.SEMATTRS_NET_PEER_PORT]: (config === null || config === void 0 ? void 0 : config.port) ? Number(config === null || config === void 0 ? void 0 : config.port) : undefined,
                [semantic_conventions_1.SEMATTRS_NET_TRANSPORT]: self._getNetTransport(config === null || config === void 0 ? void 0 : config.protocol),
                [semantic_conventions_1.SEMATTRS_DB_NAME]: config === null || config === void 0 ? void 0 : config.database,
                [semantic_conventions_1.SEMATTRS_DB_OPERATION]: operation,
                [semantic_conventions_1.SEMATTRS_DB_STATEMENT]: statement,
                [semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]: tableName,
                // [SEMATTRS_NET_PEER_IPPEER_IP]: '?', // Part of protocol
            };
            if (self._config.moduleVersionAttributeName) {
                attributes[self._config.moduleVersionAttributeName] = self.moduleVersion;
            }
            Object.entries(attributes).forEach(([key, value]) => {
                if (value === undefined)
                    delete attributes[key];
            });
            const newSpan = self.tracer.startSpan(`Sequelize ${operation}`, {
                kind: api_1.SpanKind.CLIENT,
                attributes,
            });
            const activeContextWithSpan = api_1.trace.setSpan(api_1.context.active(), newSpan);
            if ((_d = self._config) === null || _d === void 0 ? void 0 : _d.queryHook) {
                (0, instrumentation_1.safeExecuteInTheMiddle)(() => self._config.queryHook(newSpan, { sql, option }), (e) => {
                    if (e)
                        api_1.diag.error('sequelize instrumentation: queryHook error', e);
                }, true);
            }
            return api_1.context
                .with(self._config.suppressInternalInstrumentation
                ? (0, core_1.suppressTracing)(activeContextWithSpan)
                : activeContextWithSpan, () => original.apply(this, arguments))
                .then((response) => {
                var _a;
                if ((_a = self._config) === null || _a === void 0 ? void 0 : _a.responseHook) {
                    (0, instrumentation_1.safeExecuteInTheMiddle)(() => self._config.responseHook(newSpan, response), (e) => {
                        if (e)
                            api_1.diag.error('sequelize instrumentation: responseHook error', e);
                    }, true);
                }
                return response;
            })
                .catch((err) => {
                newSpan.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: err.message,
                });
                throw err;
            })
                .finally(() => {
                newSpan.end();
            });
        };
    }
    _getNetTransport(protocol) {
        switch (protocol) {
            case 'tcp':
                return semantic_conventions_1.NetTransportValues.IP_TCP;
            default:
                return undefined;
        }
    }
}
exports.SequelizeInstrumentation = SequelizeInstrumentation;
SequelizeInstrumentation.component = 'sequelize';
//# sourceMappingURL=sequelize.js.map