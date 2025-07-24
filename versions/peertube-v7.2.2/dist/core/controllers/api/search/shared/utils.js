async function searchLocalUrl(url, finder) {
    const data = await finder(url);
    if (data)
        return data;
    return finder(removeQueryParams(url));
}
export { searchLocalUrl };
function removeQueryParams(url) {
    return url.split('?').shift();
}
//# sourceMappingURL=utils.js.map