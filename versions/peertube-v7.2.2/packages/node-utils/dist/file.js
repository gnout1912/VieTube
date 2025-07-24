import { stat } from 'fs/promises';
async function getFileSize(path) {
    const stats = await stat(path);
    return stats.size;
}
export { getFileSize };
//# sourceMappingURL=file.js.map