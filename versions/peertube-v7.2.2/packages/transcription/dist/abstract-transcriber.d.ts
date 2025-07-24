import { SimpleLogger } from '@peertube/peertube-models';
import { SUUID } from '@peertube/peertube-node-utils';
import { PerformanceObserver } from 'node:perf_hooks';
import { TranscriptFile, TranscriptFormat } from './transcript-file.js';
import { TranscriptionEngine } from './transcription-engine.js';
import { TranscriptionModel } from './transcription-model.js';
import { TranscriptionRun } from './transcription-run.js';
export interface TranscribeArgs {
    mediaFilePath: string;
    model: TranscriptionModel;
    format: TranscriptFormat;
    transcriptDirectory: string;
    language?: string;
    runId?: SUUID;
}
export declare abstract class AbstractTranscriber {
    engine: TranscriptionEngine;
    protected binDirectory: string;
    protected enginePath: string;
    protected logger: SimpleLogger;
    protected performanceObserver?: PerformanceObserver;
    protected run?: TranscriptionRun;
    constructor(options: {
        engine: TranscriptionEngine;
        binDirectory?: string;
        enginePath?: string;
        logger: SimpleLogger;
        performanceObserver?: PerformanceObserver;
    });
    createRun(uuid?: SUUID): void;
    startRun(): void;
    stopRun(): void;
    assertLanguageDetectionAvailable(language?: string): void;
    supports(model: TranscriptionModel): boolean;
    protected getEngineBinary(): string;
    protected getExec(env?: {
        [id: string]: string;
    }): import("execa").ExecaScriptMethod<{
        verbose: (_verboseLine: any, { message, ...verboseObject }: {
            [x: string]: any;
            message: any;
        }) => void;
        env: {
            [id: string]: string;
        };
    }>;
    abstract transcribe(options: TranscribeArgs): Promise<TranscriptFile>;
    abstract install(path: string): Promise<void>;
}
//# sourceMappingURL=abstract-transcriber.d.ts.map