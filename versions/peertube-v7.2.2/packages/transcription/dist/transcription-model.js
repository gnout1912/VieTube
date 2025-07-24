import assert from 'node:assert';
import { stat } from 'node:fs/promises';
import { parse } from 'node:path';
export class TranscriptionModel {
    constructor(name, path, format) {
        this.name = name;
        this.path = path;
        this.format = format;
    }
    static async fromPath(path) {
        assert(await stat(path), `${path} doesn't exist.`);
        return new TranscriptionModel(parse(path).name, path);
    }
}
//# sourceMappingURL=transcription-model.js.map