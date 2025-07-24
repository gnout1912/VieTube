import { AbstractTranscriber, TranscribeArgs } from '../../abstract-transcriber.js';
import { TranscriptFile, TranscriptFormat } from '../../transcript-file.js';
export declare class OpenaiTranscriber extends AbstractTranscriber {
    transcribe({ mediaFilePath, model, language, format, transcriptDirectory, runId }: TranscribeArgs): Promise<TranscriptFile>;
    protected getDetectedLanguage(transcriptDirectory: string, mediaFilePath: string): Promise<any>;
    protected readJsonTranscriptFile(transcriptDirectory: string, mediaFilePath: string): Promise<any>;
    protected getTranscriptFilePath(transcriptDirectory: string, mediaFilePath: string, format: TranscriptFormat): string;
    install(directory: string): Promise<void>;
    protected getExecEnv(): {
        PYTHONPATH: string;
    };
}
//# sourceMappingURL=openai-transcriber.d.ts.map