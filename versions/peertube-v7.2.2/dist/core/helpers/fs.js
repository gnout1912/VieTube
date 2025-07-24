import { move } from 'fs-extra/esm';
import { rename } from 'fs/promises';
export async function tryAtomicMove(src, destination) {
    try {
        await rename(src, destination);
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) !== 'EXDEV')
            throw err;
        return move(src, destination, { overwrite: true });
    }
}
//# sourceMappingURL=fs.js.map