function doReinjectVideoFileToken(req) {
    return req.query.videoFileToken && req.query.reinjectVideoFileToken;
}
function buildReinjectVideoFileTokenQuery(req, isMaster) {
    const query = 'videoFileToken=' + req.query.videoFileToken;
    if (isMaster) {
        return query + '&reinjectVideoFileToken=true';
    }
    return query;
}
export { doReinjectVideoFileToken, buildReinjectVideoFileTokenQuery };
//# sourceMappingURL=m3u8-playlist.js.map