import { SimpleLogger } from '@peertube/peertube-models';
import { SUUID } from '@peertube/peertube-node-utils';
export declare class TranscriptionRun {
    uuid: SUUID;
    logger: SimpleLogger;
    constructor(logger: SimpleLogger, uuid?: SUUID);
    get runId(): SUUID;
    start(): void;
    stop(): void;
    getStartPerformanceMarkName(): string;
    getEndPerformanceMarkName(): string;
}
//# sourceMappingURL=transcription-run.d.ts.map