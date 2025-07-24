import { promises as fsp, WriteStream } from 'fs';
/**
 * Ensures that the directory exists
 */
export declare function ensureDir(dir: string): Promise<void>;
/**
 * Ensures that the file exists and returns it size
 * @param path - filename or path to a local file
 * @param overwrite - force creating new empty file
 * @returns file size
 */
export declare function ensureFile(path: string, overwrite?: boolean): Promise<number>;
export declare function accessCheck(dir: string): Promise<void>;
/**
 * Removes the specified file from the local file system
 */
export declare function removeFile(path: string): Promise<void>;
/**
 * Truncates the file to the specified length. Used to undo chunk write operation.
 */
export declare function truncateFile(path: string, length?: number): Promise<void>;
/**
 * Returns file WriteStream for data appending
 */
export declare function getWriteStream(path: string, start: number): WriteStream;
/**
 * Return file paths that begin with the prefix
 */
export declare function getFiles(prefix: string): Promise<string[]>;
