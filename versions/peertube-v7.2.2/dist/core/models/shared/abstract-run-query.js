import { QueryTypes } from 'sequelize';
export class AbstractRunQuery {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.replacements = {};
        this.queryConfig = '';
    }
    async runQuery(options = {}) {
        var _a;
        const queryOptions = {
            transaction: options.transaction,
            logging: options.logging,
            replacements: this.replacements,
            type: QueryTypes.SELECT,
            nest: (_a = options.nest) !== null && _a !== void 0 ? _a : false
        };
        if (this.queryConfig) {
            await this.sequelize.query(this.queryConfig, queryOptions);
        }
        return this.sequelize.query(this.query, queryOptions);
    }
    buildSelect(entities) {
        return `SELECT ${entities.join(', ')} `;
    }
}
//# sourceMappingURL=abstract-run-query.js.map