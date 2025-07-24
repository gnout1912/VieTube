const advertiseDoNotTrack = (_, res, next) => {
    if (!res.headersSent) {
        res.setHeader('Tk', 'N');
    }
    return next();
};
export { advertiseDoNotTrack };
//# sourceMappingURL=dnt.js.map