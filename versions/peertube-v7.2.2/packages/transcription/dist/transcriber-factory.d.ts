import { SimpleLogger } from '@peertube/peertube-models';
import { TranscriptionEngine, TranscriptionEngineName } from './transcription-engine.js';
import { OpenaiTranscriber } from './whisper/index.js';
export declare class TranscriberFactory {
    engines: TranscriptionEngine[];
    constructor(engines: TranscriptionEngine[]);
    createFromEngineName(options: {
        engineName: TranscriptionEngineName;
        enginePath?: string;
        binDirectory?: string;
        logger: SimpleLogger;
    }): OpenaiTranscriber;
    getEngineByName(engineName: string): TranscriptionEngine;
}
//# sourceMappingURL=transcriber-factory.d.ts.map