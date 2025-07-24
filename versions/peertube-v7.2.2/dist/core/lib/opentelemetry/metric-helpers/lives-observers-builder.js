import { VideoModel } from '../../../models/video/video.js';
export class LivesObserversBuilder {
    constructor(meter) {
        this.meter = meter;
    }
    buildObservers() {
        this.meter.createObservableGauge('peertube_running_lives_total', {
            description: 'Total running lives on the instance'
        }).addCallback(async (observableResult) => {
            const local = await VideoModel.countLives({ remote: false, mode: 'published' });
            const remote = await VideoModel.countLives({ remote: true, mode: 'published' });
            observableResult.observe(local, { liveOrigin: 'local' });
            observableResult.observe(remote, { liveOrigin: 'remote' });
        });
    }
}
//# sourceMappingURL=lives-observers-builder.js.map