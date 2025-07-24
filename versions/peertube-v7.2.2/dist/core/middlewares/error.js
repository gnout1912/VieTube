import { HttpStatusCode } from '@peertube/peertube-models';
import { logger } from '../helpers/logger.js';
import { ProblemDocument, ProblemDocumentExtension } from 'http-problem-details';
function apiFailMiddleware(req, res, next) {
    res.fail = options => {
        const { status = HttpStatusCode.BAD_REQUEST_400, message, title, type, data, instance, tags, logLevel = 'debug' } = options;
        const extension = new ProblemDocumentExtension(Object.assign(Object.assign({}, data), { docs: res.locals.docUrl, code: type }));
        const json = new ProblemDocument({
            status,
            title,
            instance,
            detail: message,
            type: type
                ? `https://docs.joinpeertube.org/api-rest-reference.html#section/Errors/${type}`
                : undefined
        }, extension);
        logger.log(logLevel, 'Bad HTTP request.', { json, tags });
        res.status(status);
        if (res.headersSent)
            return;
        res.setHeader('Content-Type', 'application/problem+json');
        res.json(json);
    };
    if (next)
        next();
}
function handleStaticError(err, req, res, next) {
    const message = err.message || '';
    if (message.includes('ENOENT')) {
        return res.fail({
            status: err.status || HttpStatusCode.INTERNAL_SERVER_ERROR_500,
            message: err.message,
            type: err.name
        });
    }
    return next(err);
}
export { apiFailMiddleware, handleStaticError };
//# sourceMappingURL=error.js.map