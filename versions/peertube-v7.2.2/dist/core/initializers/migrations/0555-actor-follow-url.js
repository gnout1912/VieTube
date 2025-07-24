import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.STRING(2000),
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('actorFollow', 'url', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0555-actor-follow-url.js.map