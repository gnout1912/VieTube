import * as Sequelize from 'sequelize';
async function up(utils) {
    for (const column of ['filename', 'fileUrl', 'torrentFilename', 'torrentUrl']) {
        const data = {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null
        };
        await utils.queryInterface.addColumn('videoFile', column, data);
    }
    {
        const webtorrentQuery = `SELECT "videoFile".id, "video".uuid, "videoFile".resolution, "videoFile".extname ` +
            `FROM video INNER JOIN "videoFile" ON "videoFile"."videoId" = video.id`;
        const query = `UPDATE "videoFile" ` +
            `SET filename = t.uuid || '-' || t.resolution || t.extname, ` +
            `"torrentFilename" = t.uuid || '-' || t.resolution || '.torrent' ` +
            `FROM (${webtorrentQuery}) AS t WHERE t.id = "videoFile"."id"`;
        await utils.sequelize.query(query);
    }
    {
        const hlsQuery = `SELECT "videoFile".id, "video".uuid, "videoFile".resolution, "videoFile".extname ` +
            `FROM video ` +
            `INNER JOIN "videoStreamingPlaylist" ON "videoStreamingPlaylist"."videoId" = video.id ` +
            `INNER JOIN "videoFile" ON "videoFile"."videoStreamingPlaylistId" = "videoStreamingPlaylist".id`;
        const query = `UPDATE "videoFile" ` +
            `SET filename = t.uuid || '-' || t.resolution || '-fragmented' || t.extname, ` +
            `"torrentFilename" = t.uuid || '-' || t.resolution || '-hls.torrent' ` +
            `FROM (${hlsQuery}) AS t WHERE t.id = "videoFile"."id"`;
        await utils.sequelize.query(query);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0585-video-file-names.js.map