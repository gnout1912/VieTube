import { exec } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
export function getFFmpegVersion() {
    return new Promise((res, rej) => {
        ffmpeg()._getFfmpegPath((err, ffmpegPath) => {
            if (err)
                return rej(err);
            if (!ffmpegPath)
                return rej(new Error('Could not find ffmpeg path'));
            return exec(`${ffmpegPath} -version`, (err, stdout) => {
                if (err)
                    return rej(err);
                const parsed = stdout.match(/(?<=ffmpeg version )[a-zA-Z\d.-]+/);
                if (!parsed)
                    return rej(new Error(`Could not find ffmpeg version in ${stdout}`));
                res(parsed[0]);
            });
        });
    });
}
//# sourceMappingURL=ffmpeg-version.js.map