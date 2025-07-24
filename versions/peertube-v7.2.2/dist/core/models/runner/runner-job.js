var RunnerJobModel_1;
import { __decorate, __metadata } from "tslib";
import { RunnerJobState } from '@peertube/peertube-models';
import { isArray, isUUIDValid } from '../../helpers/custom-validators/misc.js';
import { CONSTRAINTS_FIELDS, RUNNER_JOB_STATES } from '../../initializers/constants.js';
import { Op } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, IsUUID, Scopes, Table, UpdatedAt } from 'sequelize-typescript';
import { SequelizeModel, getSort, searchAttribute } from '../shared/index.js';
import { RunnerModel } from './runner.js';
var ScopeNames;
(function (ScopeNames) {
    ScopeNames["WITH_RUNNER"] = "WITH_RUNNER";
    ScopeNames["WITH_PARENT"] = "WITH_PARENT";
})(ScopeNames || (ScopeNames = {}));
let RunnerJobModel = RunnerJobModel_1 = class RunnerJobModel extends SequelizeModel {
    static loadWithRunner(uuid) {
        const query = {
            where: { uuid }
        };
        return RunnerJobModel_1.scope(ScopeNames.WITH_RUNNER).findOne(query);
    }
    static loadByRunnerAndJobTokensWithRunner(options) {
        const { uuid, runnerToken, jobToken } = options;
        const query = {
            where: {
                uuid,
                processingJobToken: jobToken
            },
            include: {
                model: RunnerModel.unscoped(),
                required: true,
                where: {
                    runnerToken
                }
            }
        };
        return RunnerJobModel_1.findOne(query);
    }
    static listAvailableJobs(jobTypes) {
        const jobTypesWhere = jobTypes
            ? {
                type: {
                    [Op.in]: jobTypes
                }
            }
            : {};
        return RunnerJobModel_1.findAll({
            limit: 10,
            order: getSort('priority'),
            where: Object.assign({ state: RunnerJobState.PENDING }, jobTypesWhere)
        });
    }
    static listStalledJobs(options) {
        const before = new Date(Date.now() - options.staleTimeMS);
        return RunnerJobModel_1.findAll({
            where: {
                type: {
                    [Op.in]: options.types
                },
                state: RunnerJobState.PROCESSING,
                updatedAt: {
                    [Op.lt]: before
                }
            }
        });
    }
    static listChildrenOf(job, transaction) {
        const query = {
            where: {
                dependsOnRunnerJobId: job.id
            },
            transaction
        };
        return RunnerJobModel_1.findAll(query);
    }
    static listForApi(options) {
        const { start, count, sort, search, stateOneOf } = options;
        const query = {
            offset: start,
            limit: count,
            order: getSort(sort),
            where: []
        };
        if (search) {
            if (isUUIDValid(search)) {
                query.where.push({ uuid: search });
            }
            else {
                query.where.push({
                    [Op.or]: [
                        searchAttribute(search, 'type'),
                        searchAttribute(search, '$Runner.name$')
                    ]
                });
            }
        }
        if (isArray(stateOneOf) && stateOneOf.length !== 0) {
            query.where.push({
                state: {
                    [Op.in]: stateOneOf
                }
            });
        }
        return Promise.all([
            RunnerJobModel_1.scope([ScopeNames.WITH_RUNNER]).count(query),
            RunnerJobModel_1.scope([ScopeNames.WITH_RUNNER, ScopeNames.WITH_PARENT]).findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static updateDependantJobsOf(runnerJob) {
        const where = {
            dependsOnRunnerJobId: runnerJob.id
        };
        return RunnerJobModel_1.update({ state: RunnerJobState.PENDING }, { where });
    }
    static cancelAllNonFinishedJobs(options) {
        const where = {
            type: options.type,
            state: {
                [Op.in]: [RunnerJobState.COMPLETING, RunnerJobState.PENDING, RunnerJobState.PROCESSING, RunnerJobState.WAITING_FOR_PARENT_JOB]
            }
        };
        return RunnerJobModel_1.update({ state: RunnerJobState.CANCELLED }, { where });
    }
    resetToPending() {
        this.state = RunnerJobState.PENDING;
        this.processingJobToken = null;
        this.progress = null;
        this.startedAt = null;
        this.runnerId = null;
    }
    setToErrorOrCancel(state) {
        this.state = state;
        this.processingJobToken = null;
        this.finishedAt = new Date();
    }
    toFormattedJSON() {
        var _a, _b;
        const runner = this.Runner
            ? {
                id: this.Runner.id,
                name: this.Runner.name,
                description: this.Runner.description
            }
            : null;
        const parent = this.DependsOnRunnerJob
            ? {
                id: this.DependsOnRunnerJob.id,
                uuid: this.DependsOnRunnerJob.uuid,
                type: this.DependsOnRunnerJob.type,
                state: {
                    id: this.DependsOnRunnerJob.state,
                    label: RUNNER_JOB_STATES[this.DependsOnRunnerJob.state]
                }
            }
            : undefined;
        return {
            uuid: this.uuid,
            type: this.type,
            state: {
                id: this.state,
                label: RUNNER_JOB_STATES[this.state]
            },
            progress: this.progress,
            priority: this.priority,
            failures: this.failures,
            error: this.error,
            payload: this.payload,
            startedAt: (_a = this.startedAt) === null || _a === void 0 ? void 0 : _a.toISOString(),
            finishedAt: (_b = this.finishedAt) === null || _b === void 0 ? void 0 : _b.toISOString(),
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            parent,
            runner
        };
    }
    toFormattedAdminJSON() {
        return Object.assign(Object.assign({}, this.toFormattedJSON()), { privatePayload: this.privatePayload });
    }
};
__decorate([
    AllowNull(false),
    IsUUID(4),
    Column(DataType.UUID),
    __metadata("design:type", String)
], RunnerJobModel.prototype, "uuid", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], RunnerJobModel.prototype, "type", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.JSONB),
    __metadata("design:type", Object)
], RunnerJobModel.prototype, "payload", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.JSONB),
    __metadata("design:type", Object)
], RunnerJobModel.prototype, "privatePayload", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], RunnerJobModel.prototype, "state", void 0);
__decorate([
    AllowNull(false),
    Default(0),
    Column,
    __metadata("design:type", Number)
], RunnerJobModel.prototype, "failures", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(CONSTRAINTS_FIELDS.RUNNER_JOBS.ERROR_MESSAGE.max)),
    __metadata("design:type", String)
], RunnerJobModel.prototype, "error", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], RunnerJobModel.prototype, "priority", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], RunnerJobModel.prototype, "processingJobToken", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Number)
], RunnerJobModel.prototype, "progress", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Date)
], RunnerJobModel.prototype, "startedAt", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", Date)
], RunnerJobModel.prototype, "finishedAt", void 0);
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], RunnerJobModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], RunnerJobModel.prototype, "updatedAt", void 0);
__decorate([
    ForeignKey(() => RunnerJobModel),
    Column,
    __metadata("design:type", Number)
], RunnerJobModel.prototype, "dependsOnRunnerJobId", void 0);
__decorate([
    BelongsTo(() => RunnerJobModel, {
        foreignKey: {
            name: 'dependsOnRunnerJobId',
            allowNull: true
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Object)
], RunnerJobModel.prototype, "DependsOnRunnerJob", void 0);
__decorate([
    ForeignKey(() => RunnerModel),
    Column,
    __metadata("design:type", Number)
], RunnerJobModel.prototype, "runnerId", void 0);
__decorate([
    BelongsTo(() => RunnerModel, {
        foreignKey: {
            name: 'runnerId',
            allowNull: true
        },
        onDelete: 'SET NULL'
    }),
    __metadata("design:type", Object)
], RunnerJobModel.prototype, "Runner", void 0);
RunnerJobModel = RunnerJobModel_1 = __decorate([
    Scopes(() => ({
        [ScopeNames.WITH_RUNNER]: {
            include: [
                {
                    model: RunnerModel.unscoped(),
                    required: false
                }
            ]
        },
        [ScopeNames.WITH_PARENT]: {
            include: [
                {
                    model: RunnerJobModel.unscoped(),
                    required: false
                }
            ]
        }
    })),
    Table({
        tableName: 'runnerJob',
        indexes: [
            {
                fields: ['uuid'],
                unique: true
            },
            {
                fields: ['processingJobToken'],
                unique: true
            },
            {
                fields: ['runnerId']
            }
        ]
    })
], RunnerJobModel);
export { RunnerJobModel };
//# sourceMappingURL=runner-job.js.map