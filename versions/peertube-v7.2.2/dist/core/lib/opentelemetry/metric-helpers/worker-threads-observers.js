import { getWorkersStats } from '../../worker/parent-process.js';
export class WorkerThreadsObserversBuilder {
    constructor(meter) {
        this.meter = meter;
    }
    buildObservers() {
        this.meter.createObservableGauge('peertube_worker_thread_queue_total', {
            description: 'Total tasks waiting for a PeerTube worker thread'
        }).addCallback(observableResult => {
            const stats = getWorkersStats();
            for (const stat of stats) {
                observableResult.observe(stat.queueSize, { state: 'waiting', workerThread: stat.label });
            }
        });
        this.meter.createObservableGauge('peertube_worker_thread_completed_total', {
            description: 'Total tasks completed in PeerTube worker threads'
        }).addCallback(observableResult => {
            const stats = getWorkersStats();
            for (const stat of stats) {
                observableResult.observe(stat.completed, { workerThread: stat.label });
            }
        });
    }
}
//# sourceMappingURL=worker-threads-observers.js.map