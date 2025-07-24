import * as Sequelize from 'sequelize';
async function up(utils) {
    await utils.queryInterface.addColumn('videoImport', 'videoChannelSyncId', {
        type: Sequelize.INTEGER,
        defaultValue: null,
        allowNull: true,
        references: {
            model: 'videoChannelSync',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    }, { transaction: utils.transaction });
}
async function down(utils) {
    await utils.queryInterface.dropTable('videoChannelSync', { transaction: utils.transaction });
}
export { up, down };
//# sourceMappingURL=0735-video-channel-sync-import-foreign-key.js.map