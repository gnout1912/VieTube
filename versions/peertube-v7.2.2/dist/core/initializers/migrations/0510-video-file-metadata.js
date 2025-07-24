import * as Sequelize from 'sequelize';
async function up(utils) {
    const tableDefinition = await utils.queryInterface.describeTable('videoFile');
    if (!tableDefinition['metadata']) {
        const metadata = {
            type: Sequelize.JSONB,
            allowNull: true
        };
        await utils.queryInterface.addColumn('videoFile', 'metadata', metadata);
    }
    if (!tableDefinition['metadataUrl']) {
        const metadataUrl = {
            type: Sequelize.STRING,
            allowNull: true
        };
        await utils.queryInterface.addColumn('videoFile', 'metadataUrl', metadataUrl);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0510-video-file-metadata.js.map