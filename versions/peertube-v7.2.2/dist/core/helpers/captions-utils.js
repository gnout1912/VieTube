import { createReadStream, createWriteStream } from 'fs';
import { move, remove } from 'fs-extra/esm';
import { Transform } from 'stream';
import { pipelinePromise } from './core-utils.js';
export async function moveAndProcessCaptionFile(physicalFile, videoCaption) {
    const destination = videoCaption.getFSFilePath();
    if (physicalFile.path.endsWith('.srt')) {
        await convertSrtToVtt(physicalFile.path, destination);
        await remove(physicalFile.path);
    }
    else if (physicalFile.path !== destination) {
        await move(physicalFile.path, destination, { overwrite: true });
    }
    if (physicalFile.filename)
        physicalFile.filename = videoCaption.filename;
    physicalFile.path = destination;
}
async function convertSrtToVtt(source, destination) {
    const fixVTT = new Transform({
        transform: (chunk, _encoding, cb) => {
            let block = chunk.toString();
            block = block.replace(/(\d\d:\d\d:\d\d)(\s)/g, '$1.000$2')
                .replace(/(\d\d:\d\d:\d\d),(\d)(\s)/g, '$1.00$2$3')
                .replace(/(\d\d:\d\d:\d\d),(\d\d)(\s)/g, '$1.0$2$3');
            return cb(undefined, block);
        }
    });
    const srt2vtt = await import('srt-to-vtt');
    return pipelinePromise(createReadStream(source), srt2vtt.default(), fixVTT, createWriteStream(destination));
}
//# sourceMappingURL=captions-utils.js.map