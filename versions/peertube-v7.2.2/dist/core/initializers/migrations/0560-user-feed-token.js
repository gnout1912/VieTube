import * as Sequelize from 'sequelize';
import { buildUUID } from '@peertube/peertube-node-utils';
async function up(utils) {
    const q = utils.queryInterface;
    {
        const userFeedTokenUUID = {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            allowNull: true
        };
        await q.addColumn('user', 'feedToken', userFeedTokenUUID);
    }
    {
        const query = 'SELECT * FROM "user" WHERE "feedToken" IS NULL';
        const options = { type: Sequelize.QueryTypes.SELECT };
        const users = await utils.sequelize.query(query, options);
        for (const user of users) {
            const queryUpdate = `UPDATE "user" SET "feedToken" = '${buildUUID()}' WHERE id = ${user.id}`;
            await utils.sequelize.query(queryUpdate);
        }
    }
    {
        const userFeedTokenUUID = {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            allowNull: false
        };
        await q.changeColumn('user', 'feedToken', userFeedTokenUUID);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0560-user-feed-token.js.map