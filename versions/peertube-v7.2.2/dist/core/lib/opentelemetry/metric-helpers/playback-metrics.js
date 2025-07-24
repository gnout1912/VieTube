export class PlaybackMetrics {
    constructor(meter) {
        this.meter = meter;
        this.peersP2PPeersGaugeBuffer = [];
    }
    buildCounters() {
        this.errorsCounter = this.meter.createCounter('peertube_playback_errors_count', {
            description: 'Errors collected from PeerTube player.'
        });
        this.resolutionChangesCounter = this.meter.createCounter('peertube_playback_resolution_changes_count', {
            description: 'Resolution changes collected from PeerTube player.'
        });
        this.bufferStalledCounter = this.meter.createCounter('peertube_playback_buffer_stalled_count', {
            description: 'Number of times playback is stuck because buffer is running out of data, collected from PeerTube player.'
        });
        this.downloadedBytesHTTPCounter = this.meter.createCounter('peertube_playback_http_downloaded_bytes', {
            description: 'Downloaded bytes with HTTP by PeerTube player.'
        });
        this.downloadedBytesP2PCounter = this.meter.createCounter('peertube_playback_p2p_downloaded_bytes', {
            description: 'Downloaded bytes with P2P by PeerTube player.'
        });
        this.uploadedBytesP2PCounter = this.meter.createCounter('peertube_playback_p2p_uploaded_bytes', {
            description: 'Uploaded bytes with P2P by PeerTube player.'
        });
        this.meter.createObservableGauge('peertube_playback_p2p_peers', {
            description: 'Total P2P peers connected to the PeerTube player.'
        }).addCallback(observableResult => {
            for (const gauge of this.peersP2PPeersGaugeBuffer) {
                observableResult.observe(gauge.value, gauge.attributes);
            }
            this.peersP2PPeersGaugeBuffer = [];
        });
    }
    observe(video, metrics) {
        const attributes = {
            videoOrigin: video.remote
                ? 'remote'
                : 'local',
            playerMode: metrics.playerMode,
            resolution: metrics.resolution + '',
            fps: metrics.fps + '',
            p2pEnabled: metrics.p2pEnabled,
            videoUUID: video.uuid
        };
        this.errorsCounter.add(metrics.errors, attributes);
        this.resolutionChangesCounter.add(metrics.resolutionChanges, attributes);
        this.downloadedBytesHTTPCounter.add(metrics.downloadedBytesHTTP, attributes);
        this.downloadedBytesP2PCounter.add(metrics.downloadedBytesP2P, attributes);
        this.uploadedBytesP2PCounter.add(metrics.uploadedBytesP2P, attributes);
        if (metrics.bufferStalled) {
            this.bufferStalledCounter.add(metrics.bufferStalled, attributes);
        }
        if (metrics.p2pPeers) {
            this.peersP2PPeersGaugeBuffer.push({
                value: metrics.p2pPeers,
                attributes
            });
        }
    }
}
//# sourceMappingURL=playback-metrics.js.map