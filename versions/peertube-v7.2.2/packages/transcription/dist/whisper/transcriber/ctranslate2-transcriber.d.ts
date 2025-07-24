import { TranscribeArgs } from '../../abstract-transcriber.js';
import { TranscriptFile } from '../../transcript-file.js';
import { TranscriptionModel } from '../../transcription-model.js';
import { OpenaiTranscriber } from './openai-transcriber.js';
export declare class Ctranslate2Transcriber extends OpenaiTranscriber {
    transcribe({ mediaFilePath, model, language, format, transcriptDirectory, runId }: TranscribeArgs): Promise<TranscriptFile>;
    supports(model: TranscriptionModel): boolean;
    install(directory: string): Promise<void>;
}
//# sourceMappingURL=ctranslate2-transcriber.d.ts.map