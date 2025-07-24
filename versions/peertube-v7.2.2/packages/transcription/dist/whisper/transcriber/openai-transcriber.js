import { buildSUUID } from '@peertube/peertube-node-utils';
import { readJSON } from 'fs-extra/esm';
import { parse } from 'node:path';
import { join, resolve } from 'path';
import { AbstractTranscriber } from '../../abstract-transcriber.js';
import { TranscriptFile } from '../../transcript-file.js';
export class OpenaiTranscriber extends AbstractTranscriber {
    async transcribe({ mediaFilePath, model, language, format, transcriptDirectory, runId = buildSUUID() }) {
        this.assertLanguageDetectionAvailable(language);
        const $$ = this.getExec(this.getExecEnv());
        const languageArgs = language ? ['--language', language] : [];
        this.createRun(runId);
        this.startRun();
        await $$ `${this.getEngineBinary()} ${[
            mediaFilePath,
            '--word_timestamps',
            'True',
            '--model',
            (model === null || model === void 0 ? void 0 : model.path) || model.name,
            '--output_format',
            'all',
            '--output_dir',
            transcriptDirectory,
            ...languageArgs
        ]}`;
        this.stopRun();
        return new TranscriptFile({
            language: language || await this.getDetectedLanguage(transcriptDirectory, mediaFilePath),
            path: this.getTranscriptFilePath(transcriptDirectory, mediaFilePath, format),
            format
        });
    }
    async getDetectedLanguage(transcriptDirectory, mediaFilePath) {
        const { language } = await this.readJsonTranscriptFile(transcriptDirectory, mediaFilePath);
        return language;
    }
    async readJsonTranscriptFile(transcriptDirectory, mediaFilePath) {
        return readJSON(this.getTranscriptFilePath(transcriptDirectory, mediaFilePath, 'json'), 'utf8');
    }
    getTranscriptFilePath(transcriptDirectory, mediaFilePath, format) {
        return join(transcriptDirectory, `${parse(mediaFilePath).name}.${format}`);
    }
    async install(directory) {
        const $$ = this.getExec();
        await $$ `pip3 install -U -t ${[directory]} openai-whisper==${this.engine.version}`;
    }
    getExecEnv() {
        if (!this.binDirectory)
            return undefined;
        return { PYTHONPATH: resolve(this.binDirectory, '../') };
    }
}
//# sourceMappingURL=openai-transcriber.js.map