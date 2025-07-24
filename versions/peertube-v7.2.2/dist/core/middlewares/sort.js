const setDefaultSort = setDefaultSortFactory('-createdAt');
const setDefaultVideosSort = setDefaultSortFactory('-publishedAt');
const setDefaultVideoRedundanciesSort = setDefaultSortFactory('name');
const setDefaultSearchSort = setDefaultSortFactory('-match');
const setBlacklistSort = setDefaultSortFactory('-createdAt');
export { setDefaultSort, setDefaultSearchSort, setDefaultVideosSort, setDefaultVideoRedundanciesSort, setBlacklistSort };
function setDefaultSortFactory(sort) {
    return (req, res, next) => {
        if (!req.query.sort)
            req.query.sort = sort;
        return next();
    };
}
//# sourceMappingURL=sort.js.map