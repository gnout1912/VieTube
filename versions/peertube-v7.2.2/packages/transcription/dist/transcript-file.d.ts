import { readFile } from 'node:fs/promises';
export type TranscriptFormat = 'txt' | 'vtt' | 'srt' | 'json';
export declare class TranscriptFile {
    path: string;
    language: string;
    format: TranscriptFormat;
    constructor({ path, language, format }: {
        path: string;
        language: string;
        format?: TranscriptFormat;
    });
    read(options?: Parameters<typeof readFile>[1]): Promise<string | Buffer<ArrayBufferLike>>;
    static fromPath(path: string, language?: string): TranscriptFile;
    static write({ path, content, language, format }: {
        path: string;
        content: string;
        language?: string;
        format?: TranscriptFormat;
    }): Promise<TranscriptFile>;
    equals(transcript: TranscriptFile, caseSensitive?: boolean): Promise<boolean>;
    readAsTxt(): Promise<string>;
}
//# sourceMappingURL=transcript-file.d.ts.map