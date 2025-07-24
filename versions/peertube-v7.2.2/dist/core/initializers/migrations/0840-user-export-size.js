import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.changeColumn('userExport', 'size', {
            type: Sequelize.BIGINT,
            allowNull: true
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0840-user-export-size.js.map