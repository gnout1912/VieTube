import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('actorImage', 'height', data);
    }
    {
        const data = {
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('actorImage', 'width', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0635-actor-image-size.js.map