import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.DATE,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('actor', 'remoteCreatedAt', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0645-actor-remote-creation-date.js.map