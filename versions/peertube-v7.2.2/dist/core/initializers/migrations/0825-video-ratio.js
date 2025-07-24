import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('videoFile', 'width', data);
    }
    {
        const data = {
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('videoFile', 'height', data);
    }
    {
        const data = {
            type: Sequelize.FLOAT,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('video', 'aspectRatio', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0825-video-ratio.js.map