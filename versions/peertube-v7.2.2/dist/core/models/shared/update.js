import { QueryTypes } from 'sequelize';
const updating = new Set();
async function setAsUpdated(options) {
    const { sequelize, table, id, transaction } = options;
    const key = table + '-' + id;
    if (updating.has(key))
        return;
    updating.add(key);
    try {
        await sequelize.query(`UPDATE "${table}" SET "updatedAt" = :updatedAt WHERE id = :id`, {
            replacements: { table, id, updatedAt: new Date() },
            type: QueryTypes.UPDATE,
            transaction
        });
    }
    finally {
        updating.delete(key);
    }
}
export { setAsUpdated };
//# sourceMappingURL=update.js.map