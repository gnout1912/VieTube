import * as Sequelize from 'sequelize';
import { generateRSAKeyPairPromise } from '../../helpers/core-utils.js';
import { PRIVATE_RSA_KEY_SIZE } from '../constants.js';
async function up(utils) {
    {
        const query = 'SELECT * FROM "actor" WHERE "serverId" IS NULL AND "publicKey" IS NULL';
        const options = { type: Sequelize.QueryTypes.SELECT };
        const actors = await utils.sequelize.query(query, options);
        for (const actor of actors) {
            const { privateKey, publicKey } = await generateRSAKeyPairPromise(PRIVATE_RSA_KEY_SIZE);
            const queryUpdate = `UPDATE "actor" SET "publicKey" = '${publicKey}', "privateKey" = '${privateKey}' WHERE id = ${actor.id}`;
            await utils.sequelize.query(queryUpdate);
        }
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0605-actor-missing-keys.js.map