import { __rest } from "tslib";
import { buildSUUID } from '@peertube/peertube-node-utils';
import { $ } from 'execa';
import { join } from 'path';
import { TranscriptionRun } from './transcription-run.js';
export class AbstractTranscriber {
    constructor(options) {
        const { engine, logger, enginePath, binDirectory, performanceObserver } = options;
        this.engine = engine;
        this.enginePath = enginePath;
        this.logger = logger;
        this.binDirectory = binDirectory;
        this.performanceObserver = performanceObserver;
    }
    createRun(uuid = buildSUUID()) {
        this.run = new TranscriptionRun(this.logger, uuid);
    }
    startRun() {
        this.run.start();
    }
    stopRun() {
        this.run.stop();
        delete this.run;
    }
    assertLanguageDetectionAvailable(language) {
        if (!this.engine.languageDetection && !language) {
            throw new Error(`Language detection isn't available in ${this.engine.name}. A language must me provided explicitly.`);
        }
    }
    supports(model) {
        return model.format === 'PyTorch';
    }
    getEngineBinary() {
        if (this.enginePath)
            return this.enginePath;
        if (this.binDirectory)
            return join(this.binDirectory, this.engine.command);
        return this.engine.command;
    }
    getExec(env) {
        const logLevels = {
            command: 'debug',
            output: 'debug',
            ipc: 'debug',
            error: 'error',
            duration: 'debug'
        };
        return $({
            verbose: (_verboseLine, _a) => {
                var { message } = _a, verboseObject = __rest(_a, ["message"]);
                const level = logLevels[verboseObject.type];
                this.logger[level](message, verboseObject);
            },
            env
        });
    }
}
//# sourceMappingURL=abstract-transcriber.js.map