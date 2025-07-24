export type ModelFormat = 'PyTorch' | 'GGML' | 'ONNX' | 'CTranslate2';
export declare class TranscriptionModel {
    name: string;
    format?: ModelFormat;
    path?: string;
    constructor(name: string, path?: string, format?: ModelFormat);
    static fromPath(path: string): Promise<TranscriptionModel>;
}
//# sourceMappingURL=transcription-model.d.ts.map