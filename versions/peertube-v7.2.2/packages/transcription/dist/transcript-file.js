import assert from 'node:assert';
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { srtToTxt } from './subtitle.js';
export class TranscriptFile {
    constructor({ path, language, format = 'vtt' }) {
        this.format = 'vtt';
        this.path = path;
        this.language = language;
        this.format = format;
    }
    async read(options = 'utf8') {
        return readFile(this.path, options);
    }
    static fromPath(path, language = 'en') {
        const format = extname(path).substring(1);
        const guessableFormats = ['txt', 'vtt', 'srt'];
        assert(guessableFormats.includes(format), `Couldn't guess transcript format from extension "${format}". Valid formats are: ${guessableFormats.join(', ')}."`);
        return new TranscriptFile({ path, language, format: format });
    }
    static async write({ path, content, language = 'en', format = 'vtt' }) {
        await writeFile(path, content);
        return new TranscriptFile({ path, language, format });
    }
    async equals(transcript, caseSensitive = true) {
        if (this.language !== transcript.language) {
            return false;
        }
        const content = await this.read();
        const transcriptContent = await transcript.read();
        if (!caseSensitive) {
            return String(content).toLowerCase() === String(transcriptContent).toLowerCase();
        }
        return content === transcriptContent;
    }
    async readAsTxt() {
        return srtToTxt(String(await this.read()));
    }
}
//# sourceMappingURL=transcript-file.js.map