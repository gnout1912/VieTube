import { metrics } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { logger } from '../../helpers/logger.js';
import { CONFIG } from '../../initializers/config.js';
import { BittorrentTrackerObserversBuilder, JobQueueObserversBuilder, LivesObserversBuilder, NodeJSObserversBuilder, PlaybackMetrics, StatsObserversBuilder, ViewersObserversBuilder } from './metric-helpers/index.js';
import { WorkerThreadsObserversBuilder } from './metric-helpers/worker-threads-observers.js';
class OpenTelemetryMetrics {
    constructor() { }
    init(app) {
        if (CONFIG.OPEN_TELEMETRY.METRICS.ENABLED !== true)
            return;
        app.use((req, res, next) => {
            res.once('finish', () => {
                if (!this.onRequestDuration)
                    return;
                this.onRequestDuration(req, res);
            });
            next();
        });
    }
    registerMetrics(options) {
        if (CONFIG.OPEN_TELEMETRY.METRICS.ENABLED !== true)
            return;
        logger.info('Registering Open Telemetry metrics');
        const provider = new MeterProvider({
            views: [
                ...NodeJSObserversBuilder.getViews()
            ],
            readers: [
                new PrometheusExporter({
                    host: CONFIG.OPEN_TELEMETRY.METRICS.PROMETHEUS_EXPORTER.HOSTNAME,
                    port: CONFIG.OPEN_TELEMETRY.METRICS.PROMETHEUS_EXPORTER.PORT
                })
            ]
        });
        metrics.setGlobalMeterProvider(provider);
        this.meter = metrics.getMeter('default');
        if (CONFIG.OPEN_TELEMETRY.METRICS.HTTP_REQUEST_DURATION.ENABLED === true) {
            this.buildRequestObserver();
        }
        this.playbackMetrics = new PlaybackMetrics(this.meter);
        this.playbackMetrics.buildCounters();
        new NodeJSObserversBuilder(this.meter).buildObservers();
        new JobQueueObserversBuilder(this.meter).buildObservers();
        new StatsObserversBuilder(this.meter).buildObservers();
        new LivesObserversBuilder(this.meter).buildObservers();
        new ViewersObserversBuilder(this.meter).buildObservers();
        new WorkerThreadsObserversBuilder(this.meter).buildObservers();
        new BittorrentTrackerObserversBuilder(this.meter, options.trackerServer).buildObservers();
    }
    observePlaybackMetric(video, metrics) {
        this.playbackMetrics.observe(video, metrics);
    }
    buildRequestObserver() {
        const requestDuration = this.meter.createHistogram('http_request_duration_ms', {
            unit: 'milliseconds',
            description: 'Duration of HTTP requests in ms'
        });
        this.onRequestDuration = (req, res) => {
            const duration = Date.now() - res.locals.requestStart;
            requestDuration.record(duration, {
                path: this.buildRequestPath(req.originalUrl),
                method: req.method,
                statusCode: res.statusCode + ''
            });
        };
    }
    buildRequestPath(path) {
        return path.split('?')[0];
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { OpenTelemetryMetrics };
//# sourceMappingURL=metrics.js.map