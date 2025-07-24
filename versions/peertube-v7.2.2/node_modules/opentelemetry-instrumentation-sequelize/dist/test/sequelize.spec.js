"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const expect_1 = __importDefault(require("expect"));
const src_1 = require("../src");
const utils_1 = require("../src/utils");
const api_1 = require("@opentelemetry/api");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const contrib_test_utils_1 = require("@opentelemetry/contrib-test-utils");
// should be available in node_modules from sequelize installation
const Promise = require('bluebird');
const instrumentation = (0, contrib_test_utils_1.registerInstrumentationTesting)(new src_1.SequelizeInstrumentation());
const sequelize = __importStar(require("sequelize"));
describe('instrumentation-sequelize', () => {
    const getSequelizeSpans = () => {
        return (0, contrib_test_utils_1.getTestSpans)().filter((s) => s.instrumentationLibrary.name.includes('sequelize'));
    };
    beforeEach(() => {
        instrumentation.enable();
    });
    afterEach(() => {
        instrumentation.disable();
    });
    describe('postgres', () => {
        const DB_SYSTEM = 'postgres';
        const DB_USER = 'some-user';
        const NET_PEER_NAME = 'localhost';
        const NET_PEER_PORT = 12345;
        const DB_NAME = 'my-db';
        const instance = new sequelize.Sequelize(`${DB_SYSTEM}://${DB_USER}@${NET_PEER_NAME}:${NET_PEER_PORT}/${DB_NAME}`, { logging: false });
        class User extends sequelize.Model {
        }
        User.init({ firstName: { type: sequelize.DataTypes.STRING } }, { sequelize: instance });
        it('create is instrumented', async () => {
            try {
                await User.create({ firstName: 'Nir' });
            }
            catch (_a) {
                // Error is thrown but we don't care
            }
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            (0, expect_1.default)(spans[0].status.code).toBe(api_1.SpanStatusCode.ERROR);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SYSTEM]).toBe(DB_SYSTEM);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_USER]).toBe(DB_USER);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_NET_PEER_NAME]).toBe(NET_PEER_NAME);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_NET_PEER_PORT]).toBe(NET_PEER_PORT);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_NAME]).toBe(DB_NAME);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('INSERT');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('INSERT INTO "Users" ("id","firstName","createdAt","updatedAt") VALUES (DEFAULT,$1,$2,$3) RETURNING *;');
        });
        it('findAll is instrumented', async () => {
            await User.findAll().catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('SELECT');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('SELECT "id", "firstName", "createdAt", "updatedAt" FROM "Users" AS "User";');
        });
        it('destroy is instrumented', async () => {
            await User.destroy({ where: {}, truncate: true }).catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('BULKDELETE');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('TRUNCATE "Users"');
        });
        it('count is instrumented', async () => {
            await User.count().catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('SELECT');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('SELECT count(*) AS "count" FROM "Users" AS "User";');
        });
        it('handled complex query', async () => {
            const Op = sequelize.Op;
            await User.findOne({
                where: {
                    username: 'Shlomi',
                    rank: {
                        [Op.or]: {
                            [Op.lt]: 1000,
                            [Op.eq]: null,
                        },
                    },
                },
                attributes: ['id', 'username'],
                order: [['username', 'DESC']],
                limit: 10,
                offset: 5,
            }).catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('SELECT');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe(`SELECT "id", "username" FROM "Users" AS "User" WHERE "User"."username" = 'Shlomi' AND ("User"."rank" < 1000 OR "User"."rank" IS NULL) ORDER BY "User"."username" DESC LIMIT 10 OFFSET 5;`);
        });
        it('tableName is taken from init override', async () => {
            class Planet extends sequelize.Model {
            }
            const expectedTableName = 'solar-system';
            Planet.init({}, { sequelize: instance, tableName: expectedTableName });
            await Planet.findAll().catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe(expectedTableName);
        });
        it('handles JOIN queries', async () => {
            class Dog extends sequelize.Model {
            }
            Dog.init({ firstName: { type: sequelize.DataTypes.STRING }, owner: { type: sequelize.DataTypes.STRING } }, { sequelize: instance });
            Dog.belongsTo(User, { foreignKey: 'firstName' });
            User.hasMany(Dog, { foreignKey: 'firstName' });
            await Dog.findOne({
                attributes: ['firstName', 'owner'],
                include: [
                    {
                        model: User,
                        attributes: ['firstName'],
                        required: true,
                    },
                ],
            }).catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('SELECT');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Dogs,Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe(`SELECT "Dog"."id", "Dog"."firstName", "Dog"."owner", "User"."id" AS "User.id", "User"."firstName" AS "User.firstName" FROM "Dogs" AS "Dog" INNER JOIN "Users" AS "User" ON "Dog"."firstName" = "User"."id" LIMIT 1;`);
        });
    });
    describe('mysql', () => {
        const DB_SYSTEM = 'mysql';
        const DB_USER = 'RickSanchez';
        const NET_PEER_NAME = 'localhost';
        const NET_PEER_PORT = 34567;
        const DB_NAME = 'mysql-db';
        const instance = new sequelize.Sequelize(DB_NAME, DB_USER, 'password', {
            host: NET_PEER_NAME,
            port: NET_PEER_PORT,
            dialect: DB_SYSTEM,
        });
        instance.define('User', { firstName: { type: sequelize.DataTypes.STRING } });
        it('create is instrumented', async () => {
            await instance.models.User.create({ firstName: 'Nir' }).catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            (0, expect_1.default)(spans[0].status.code).toBe(api_1.SpanStatusCode.ERROR);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SYSTEM]).toBe(DB_SYSTEM);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_USER]).toBe(DB_USER);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_NET_PEER_NAME]).toBe(NET_PEER_NAME);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_NET_PEER_PORT]).toBe(NET_PEER_PORT);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_NAME]).toBe(DB_NAME);
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('INSERT');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('INSERT INTO `Users` (`id`,`firstName`,`createdAt`,`updatedAt`) VALUES (DEFAULT,$1,$2,$3);');
        });
        it('findAll is instrumented', async () => {
            await instance.models.User.findAll().catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('SELECT');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('SELECT `id`, `firstName`, `createdAt`, `updatedAt` FROM `Users` AS `User`;');
        });
        describe('query is instrumented', () => {
            it('with options not specified', async () => {
                try {
                    await instance.query('SELECT 1 + 1');
                }
                catch (_a) {
                    // Do not care about the error
                }
                const spans = getSequelizeSpans();
                (0, expect_1.default)(spans.length).toBe(1);
                const attributes = spans[0].attributes;
                (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('SELECT');
                (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('SELECT 1 + 1');
            });
            it('with type not specified in options', async () => {
                try {
                    await instance.query('SELECT 1 + 1', {});
                }
                catch (_a) {
                    // Do not care about the error
                }
                const spans = getSequelizeSpans();
                (0, expect_1.default)(spans.length).toBe(1);
                const attributes = spans[0].attributes;
                (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('SELECT');
                (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('SELECT 1 + 1');
            });
            it('with type specified in options', async () => {
                try {
                    await instance.query('SELECT 1 + 1', { type: sequelize.QueryTypes.RAW });
                }
                catch (_a) {
                    // Do not care about the error
                }
                const spans = getSequelizeSpans();
                (0, expect_1.default)(spans.length).toBe(1);
                const attributes = spans[0].attributes;
                (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('RAW');
                (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('SELECT 1 + 1');
            });
        });
    });
    describe('sqlite', () => {
        const instance = new sequelize.Sequelize('sqlite:memory', {
            logging: false,
        });
        instance.define('User', { firstName: { type: sequelize.DataTypes.STRING } });
        it('create is instrumented', async () => {
            await instance.models.User.create({ firstName: 'Nir' }).catch(() => { });
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            const attributes = spans[0].attributes;
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SYSTEM]).toBe('sqlite');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_NET_PEER_NAME]).toBe('memory');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION]).toBe('INSERT');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_SQL_TABLE]).toBe('Users');
            (0, expect_1.default)(attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT]).toBe('INSERT INTO `Users` (`id`,`firstName`,`createdAt`,`updatedAt`) VALUES (NULL,$1,$2,$3);');
        });
    });
    describe('config', () => {
        describe('queryHook', () => {
            it('able to collect query', async () => {
                instrumentation.disable();
                const instance = new sequelize.Sequelize(`postgres://john@$localhost:1111/my-name`, { logging: false });
                instance.define('User', { firstName: { type: sequelize.DataTypes.STRING } });
                const response = { john: 'doe' };
                sequelize.Sequelize.prototype.query = () => {
                    return new Promise((resolve) => resolve(response));
                };
                instrumentation.setConfig({
                    queryHook: (span, { sql, option }) => {
                        span.setAttribute('test-sql', 'any');
                        span.setAttribute('test-option', 'any');
                    },
                });
                instrumentation.enable();
                await instance.models.User.findAll();
                const spans = getSequelizeSpans();
                const attributes = spans[0].attributes;
                (0, expect_1.default)(attributes['test-sql']).toBe('any');
                (0, expect_1.default)(attributes['test-option']).toBe('any');
            });
            it('query hook which throws does not affect span', async () => {
                instrumentation.disable();
                const instance = new sequelize.Sequelize(`postgres://john@$localhost:1111/my-name`, { logging: false });
                instance.define('User', { firstName: { type: sequelize.DataTypes.STRING } });
                const response = { john: 'doe' };
                sequelize.Sequelize.prototype.query = () => {
                    return new Promise((resolve) => resolve(response));
                };
                const mockedLogger = (() => {
                    let message;
                    let error;
                    return {
                        error: (_message, _err) => {
                            message = _message;
                            error = _err;
                        },
                        debug: () => { },
                        getMessage: () => message,
                        getError: () => error,
                    };
                })();
                instrumentation.setConfig({
                    queryHook: () => {
                        throw new Error('Throwing');
                    },
                });
                instrumentation.enable();
                api_1.diag.setLogger(mockedLogger);
                await instance.models.User.findAll();
                const spans = getSequelizeSpans();
                (0, expect_1.default)(spans.length).toBe(1);
                (0, expect_1.default)(mockedLogger.getMessage()).toBe('sequelize instrumentation: queryHook error');
                (0, expect_1.default)(mockedLogger.getError().message).toBe('Throwing');
                api_1.diag.setLogger(new api_1.DiagConsoleLogger());
            });
        });
        describe('responseHook', () => {
            it('able to collect response', async () => {
                instrumentation.disable();
                const instance = new sequelize.Sequelize(`postgres://john@$localhost:1111/my-name`, { logging: false });
                instance.define('User', { firstName: { type: sequelize.DataTypes.STRING } });
                const response = { john: 'doe' };
                sequelize.Sequelize.prototype.query = () => {
                    return new Promise((resolve) => resolve(response));
                };
                instrumentation.setConfig({
                    responseHook: (span, response) => {
                        span.setAttribute('test', JSON.stringify(response));
                    },
                });
                instrumentation.enable();
                await instance.models.User.findAll();
                const spans = getSequelizeSpans();
                const attributes = spans[0].attributes;
                (0, expect_1.default)(attributes['test']).toBe(JSON.stringify(response));
            });
            it('response hook which throws does not affect span', async () => {
                instrumentation.disable();
                const instance = new sequelize.Sequelize(`postgres://john@$localhost:1111/my-name`, { logging: false });
                instance.define('User', { firstName: { type: sequelize.DataTypes.STRING } });
                const response = { john: 'doe' };
                sequelize.Sequelize.prototype.query = () => {
                    return new Promise((resolve) => resolve(response));
                };
                const mockedLogger = (() => {
                    let message;
                    let error;
                    return {
                        error: (_message, _err) => {
                            message = _message;
                            error = _err;
                        },
                        debug: () => { },
                        getMessage: () => message,
                        getError: () => error,
                    };
                })();
                instrumentation.setConfig({
                    responseHook: () => {
                        throw new Error('Throwing');
                    },
                });
                instrumentation.enable();
                api_1.diag.setLogger(mockedLogger);
                await instance.models.User.findAll();
                const spans = getSequelizeSpans();
                (0, expect_1.default)(spans.length).toBe(1);
                (0, expect_1.default)(mockedLogger.getMessage()).toBe('sequelize instrumentation: responseHook error');
                (0, expect_1.default)(mockedLogger.getError().message).toBe('Throwing');
                api_1.diag.setLogger(new api_1.DiagConsoleLogger());
            });
        });
        describe('ignoreOrphanedSpans', () => {
            it('skips when ignoreOrphanedSpans option is true', async () => {
                instrumentation.disable();
                const instance = new sequelize.Sequelize(`postgres://john@$localhost:1111/my-name`, { logging: false });
                instance.define('User', { firstName: { type: sequelize.DataTypes.STRING } });
                instrumentation.setConfig({
                    ignoreOrphanedSpans: true,
                });
                instrumentation.enable();
                try {
                    await api_1.context.with(api_1.ROOT_CONTEXT, async () => {
                        await instance.models.User.create({ firstName: 'Nir' });
                    });
                }
                catch (_a) { }
                const spans = getSequelizeSpans();
                (0, expect_1.default)(spans.length).toBe(0);
            });
        });
        it('moduleVersionAttributeName', async () => {
            instrumentation.disable();
            const instance = new sequelize.Sequelize(`postgres://john@$localhost:1111/my-name`, { logging: false });
            instance.define('User', { firstName: { type: sequelize.DataTypes.STRING } });
            instrumentation.setConfig({
                moduleVersionAttributeName: 'module.version',
            });
            instrumentation.enable();
            try {
                await instance.models.User.create({ firstName: 'Nir' });
            }
            catch (_a) {
                // Error is thrown but we don't care
            }
            const spans = getSequelizeSpans();
            (0, expect_1.default)(spans.length).toBe(1);
            (0, expect_1.default)(spans[0].attributes['module.version']).toMatch(/\d{1,4}\.\d{1,4}\.\d{1,5}.*/);
        });
    });
    describe('misc', () => {
        it('extractTableFromQuery', async () => {
            (0, expect_1.default)((0, utils_1.extractTableFromQuery)('FROM Users JOIN Dogs Where 1243')).toBe('Dogs,Users');
            (0, expect_1.default)((0, utils_1.extractTableFromQuery)('FROM "Users"')).toBe('Users');
            (0, expect_1.default)((0, utils_1.extractTableFromQuery)('SELECT count(*) AS "count" FROM "Users" AS "User";')).toBe('Users');
            (0, expect_1.default)((0, utils_1.extractTableFromQuery)('SELECT `id`, `firstName`, `createdAt`, `updatedAt` FROM `Users` AS `User`;')).toBe('Users');
            (0, expect_1.default)((0, utils_1.extractTableFromQuery)(null)).toBe(undefined);
            (0, expect_1.default)((0, utils_1.extractTableFromQuery)(undefined)).toBe(undefined);
        });
    });
});
//# sourceMappingURL=sequelize.spec.js.map