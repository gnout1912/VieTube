import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.sequelize.query('DROP INDEX IF EXISTS "video_file_video_id"');
        await utils.sequelize.query('DROP INDEX IF EXISTS "video_file_video_streaming_playlist_id"');
    }
    {
        await utils.queryInterface.addColumn('videoFile', 'formatFlags', {
            type: Sequelize.INTEGER,
            defaultValue: 2,
            allowNull: false
        }, { transaction });
        await utils.queryInterface.changeColumn('videoFile', 'formatFlags', {
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: false
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoFile', 'streams', {
            type: Sequelize.INTEGER,
            defaultValue: 3,
            allowNull: false
        }, { transaction });
        const query = 'UPDATE "videoFile" SET "streams" = 2 WHERE "resolution" = 0';
        await utils.sequelize.query(query, { transaction });
        await utils.queryInterface.changeColumn('videoFile', 'streams', {
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: false
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0865-video-file-streams.js.map