import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.addColumn('videoCaption', 'automaticallyGenerated', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }, { transaction });
        await utils.queryInterface.changeColumn('videoCaption', 'automaticallyGenerated', {
            type: Sequelize.BOOLEAN,
            defaultValue: null,
            allowNull: false
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0860-caption-generated.js.map