async function up(utils) {
    const { transaction } = utils;
    const query = 'DELETE FROM "localVideoViewer" t1 ' +
        'USING (SELECT MIN(id) as id, "url" FROM "localVideoViewer" GROUP BY "url" HAVING COUNT(*) > 1) t2 ' +
        'WHERE t1."url" = t2."url" AND t1.id <> t2.id';
    await utils.sequelize.query(query, { transaction });
}
async function down(utils) {
}
export { up, down };
//# sourceMappingURL=0755-unique-viewer-url.js.map