import { VideoViewsManager } from '../../views/video-views-manager.js';
export class ViewersObserversBuilder {
    constructor(meter) {
        this.meter = meter;
    }
    buildObservers() {
        this.meter.createObservableGauge('peertube_viewers_total', {
            description: 'Total viewers on the instance'
        }).addCallback(observableResult => {
            for (const viewerScope of ['local', 'remote']) {
                for (const videoScope of ['local', 'remote']) {
                    const result = VideoViewsManager.Instance.getTotalViewers({ viewerScope, videoScope });
                    observableResult.observe(result, { viewerOrigin: viewerScope, videoOrigin: videoScope });
                }
            }
        });
    }
}
//# sourceMappingURL=viewers-observers-builder.js.map