import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        const data = {
            type: Sequelize.STRING,
            allowNull: true
        };
        await utils.queryInterface.addColumn('localVideoViewer', 'subdivisionName', data, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0805-viewer-subdivision.js.map