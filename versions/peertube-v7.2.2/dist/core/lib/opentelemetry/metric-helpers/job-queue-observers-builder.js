import { JobQueue } from '../../job-queue/index.js';
export class JobQueueObserversBuilder {
    constructor(meter) {
        this.meter = meter;
    }
    buildObservers() {
        this.meter.createObservableGauge('peertube_job_queue_total', {
            description: 'Total jobs in the PeerTube job queue'
        }).addCallback(async (observableResult) => {
            const stats = await JobQueue.Instance.getStats();
            for (const { jobType, counts } of stats) {
                for (const state of Object.keys(counts)) {
                    observableResult.observe(counts[state], { jobType, state });
                }
            }
        });
    }
}
//# sourceMappingURL=job-queue-observers-builder.js.map