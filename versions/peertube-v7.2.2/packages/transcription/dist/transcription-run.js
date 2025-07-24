import { buildSUUID } from '@peertube/peertube-node-utils';
export class TranscriptionRun {
    constructor(logger, uuid = buildSUUID()) {
        this.uuid = uuid;
        this.logger = logger;
    }
    get runId() {
        return this.uuid;
    }
    start() {
        performance.mark(this.getStartPerformanceMarkName());
    }
    stop() {
        try {
            performance.mark(this.getEndPerformanceMarkName());
            performance.measure(this.runId, this.getStartPerformanceMarkName(), this.getEndPerformanceMarkName());
        }
        catch (err) {
            this.logger.error(err.message, { err });
        }
    }
    getStartPerformanceMarkName() {
        return `${this.runId}-started`;
    }
    getEndPerformanceMarkName() {
        return `${this.runId}-ended`;
    }
}
//# sourceMappingURL=transcription-run.js.map