import { PassThrough, Transform } from 'stream';
import { BinaryToTextEncoding, Hash } from 'crypto';
export declare class StreamLength extends Transform {
    readonly limit: number;
    length: number;
    constructor(limit?: number);
    _transform(chunk: Buffer, encoding: string, cb: (err?: Error) => void): void;
}
export declare function streamLength(limit?: number): StreamLength;
export declare class StreamChecksum extends Transform {
    readonly checksum: string;
    readonly algorithm: string;
    readonly encoding: BinaryToTextEncoding;
    length: number;
    digest: string;
    hash: Hash;
    constructor(checksum: string, algorithm: string, encoding?: BinaryToTextEncoding);
    _transform(chunk: Buffer, encoding: string, done: () => void): void;
    _flush(cb: (err?: Error) => void): void;
}
export declare function streamChecksum(checksum?: string, algorithm?: string, encoding?: BinaryToTextEncoding): StreamChecksum | PassThrough;
