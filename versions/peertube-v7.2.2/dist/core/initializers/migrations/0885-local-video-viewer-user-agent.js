import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.addColumn('localVideoViewer', 'client', {
            type: Sequelize.STRING,
            defaultValue: null,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('localVideoViewer', 'device', {
            type: Sequelize.STRING,
            defaultValue: null,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('localVideoViewer', 'operatingSystem', {
            type: Sequelize.STRING,
            defaultValue: null,
            allowNull: true
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0885-local-video-viewer-user-agent.js.map