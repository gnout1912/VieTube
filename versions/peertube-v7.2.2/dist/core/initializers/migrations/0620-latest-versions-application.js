import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.STRING,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('application', 'latestPeerTubeVersion', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0620-latest-versions-application.js.map