import express from 'express';
import { CONFIG } from '../../initializers/config.js';
import { OpenTelemetryMetrics } from '../../lib/opentelemetry/metrics.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { addPlaybackMetricValidator, apiRateLimiter, asyncMiddleware } from '../../middlewares/index.js';
const metricsRouter = express.Router();
metricsRouter.use(apiRateLimiter);
metricsRouter.post('/playback', asyncMiddleware(addPlaybackMetricValidator), addPlaybackMetric);
export { metricsRouter };
function addPlaybackMetric(req, res) {
    if (!CONFIG.OPEN_TELEMETRY.METRICS.ENABLED) {
        return res.sendStatus(HttpStatusCode.FORBIDDEN_403);
    }
    const body = req.body;
    OpenTelemetryMetrics.Instance.observePlaybackMetric(res.locals.onlyImmutableVideo, body);
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
//# sourceMappingURL=metrics.js.map