import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.addColumn('video', 'comments', {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            allowNull: false
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0880-video-comment-count.js.map