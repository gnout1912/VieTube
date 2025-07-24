import { Ctranslate2Transcriber, OpenaiTranscriber } from './whisper/index.js';
export class TranscriberFactory {
    constructor(engines) {
        this.engines = engines;
    }
    createFromEngineName(options) {
        const { engineName } = options;
        const transcriberArgs = Object.assign(Object.assign({}, options), { engine: this.getEngineByName(engineName) });
        switch (engineName) {
            case 'openai-whisper':
                return new OpenaiTranscriber(transcriberArgs);
            case 'whisper-ctranslate2':
                return new Ctranslate2Transcriber(transcriberArgs);
            default:
                throw new Error(`Unimplemented engine ${engineName}`);
        }
    }
    getEngineByName(engineName) {
        const engine = this.engines.find(({ name }) => name === engineName);
        if (!engine) {
            throw new Error(`Unknown engine ${engineName}`);
        }
        return engine;
    }
}
//# sourceMappingURL=transcriber-factory.js.map