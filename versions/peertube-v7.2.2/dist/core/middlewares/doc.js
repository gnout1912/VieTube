function openapiOperationDoc(options) {
    return (req, res, next) => {
        res.locals.docUrl = options.url || 'https://docs.joinpeertube.org/api-rest-reference.html#operation/' + options.operationId;
        if (next)
            return next();
    };
}
export { openapiOperationDoc };
//# sourceMappingURL=doc.js.map