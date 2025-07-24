export async function activityPubResponse(promise, res) {
    const data = await promise;
    if (!res.headersSent) {
        res.type('application/activity+json; charset=utf-8');
    }
    return res.json(data);
}
//# sourceMappingURL=utils.js.map