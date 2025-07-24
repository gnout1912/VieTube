const methodsValidator = (methods) => {
    return (req, res, next) => {
        if (methods.includes(req.method) !== true) {
            return res.sendStatus(405);
        }
        return next();
    };
};
export { methodsValidator };
//# sourceMappingURL=express.js.map