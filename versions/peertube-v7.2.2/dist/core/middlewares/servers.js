import { HttpStatusCode } from '@peertube/peertube-models';
import { getHostWithPort } from '../helpers/express-utils.js';
function setBodyHostsPort(req, res, next) {
    if (!req.body.hosts)
        return next();
    for (let i = 0; i < req.body.hosts.length; i++) {
        const hostWithPort = getHostWithPort(req.body.hosts[i]);
        if (hostWithPort === null) {
            return res.fail({
                status: HttpStatusCode.INTERNAL_SERVER_ERROR_500,
                message: 'Could not parse hosts'
            });
        }
        req.body.hosts[i] = hostWithPort;
    }
    return next();
}
export { setBodyHostsPort };
//# sourceMappingURL=servers.js.map