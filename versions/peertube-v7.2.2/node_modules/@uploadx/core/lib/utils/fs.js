"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fsp = void 0;
exports.ensureDir = ensureDir;
exports.ensureFile = ensureFile;
exports.accessCheck = accessCheck;
exports.removeFile = removeFile;
exports.truncateFile = truncateFile;
exports.getWriteStream = getWriteStream;
exports.getFiles = getFiles;
const fs_1 = require("fs");
Object.defineProperty(exports, "fsp", { enumerable: true, get: function () { return fs_1.promises; } });
const path_1 = require("path");
/**
 * Ensures that the directory exists
 */
async function ensureDir(dir) {
    await fs_1.promises.mkdir(dir, { recursive: true });
}
/**
 * Ensures that the file exists and returns it size
 * @param path - filename or path to a local file
 * @param overwrite - force creating new empty file
 * @returns file size
 */
async function ensureFile(path, overwrite = false) {
    await fs_1.promises.mkdir((0, path_1.dirname)(path), { recursive: true });
    await (await fs_1.promises.open(path, overwrite ? 'w' : 'a')).close();
    return (await fs_1.promises.stat(path)).size;
}
async function accessCheck(dir) {
    try {
        await fs_1.promises.mkdir(dir, { recursive: true });
    }
    catch {
        throw new Error(`Directory is not accessible: ${dir}`);
    }
}
/**
 * Removes the specified file from the local file system
 */
async function removeFile(path) {
    if (fs_1.promises.rm)
        return fs_1.promises.rm(path, { force: true });
    return fs_1.promises.unlink(path).catch((err) => {
        if (err.code !== 'ENOENT')
            throw err;
    });
}
/**
 * Truncates the file to the specified length. Used to undo chunk write operation.
 */
function truncateFile(path, length = 0) {
    return fs_1.promises.truncate(path, length);
}
/**
 * Returns file WriteStream for data appending
 */
function getWriteStream(path, start) {
    return (0, fs_1.createWriteStream)(path, { flags: 'r+', start });
}
/**
 * Return file paths that begin with the prefix
 */
function getFiles(prefix) {
    const prefix_ = prefix.replace(/\\/g, '/');
    const _getFiles = async (current) => {
        try {
            if ((await fs_1.promises.stat(current)).isFile())
                return _getFiles((0, path_1.dirname)(current));
        }
        catch {
            return _getFiles((0, path_1.dirname)(current));
        }
        const dirents = await fs_1.promises.readdir(current, { withFileTypes: true });
        const files = await Promise.all(dirents.map(async (dirent) => {
            const path = path_1.posix.join(current, dirent.name);
            return path.startsWith(prefix_) ? (dirent.isDirectory() ? _getFiles(path) : path) : null;
        }));
        return files.flat().filter(Boolean).sort();
    };
    return _getFiles(prefix_);
}
