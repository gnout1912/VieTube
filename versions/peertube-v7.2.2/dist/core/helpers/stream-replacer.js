import { Transform } from 'stream';
class StreamReplacer extends Transform {
    constructor(replacer) {
        super();
        this.replacer = replacer;
    }
    _transform(chunk, _encoding, done) {
        var _a;
        try {
            this.pendingChunk = ((_a = this.pendingChunk) === null || _a === void 0 ? void 0 : _a.length)
                ? Buffer.concat([this.pendingChunk, chunk])
                : chunk;
            let index;
            while ((index = this.pendingChunk.indexOf('\n')) !== -1) {
                const line = this.pendingChunk.subarray(0, ++index);
                this.pendingChunk = this.pendingChunk.subarray(index);
                this.push(this.doReplace(line));
            }
            return done();
        }
        catch (err) {
            return done(err);
        }
    }
    _flush(done) {
        var _a;
        if (!((_a = this.pendingChunk) === null || _a === void 0 ? void 0 : _a.length))
            return done();
        try {
            return done(null, this.doReplace(this.pendingChunk));
        }
        catch (err) {
            return done(err);
        }
    }
    doReplace(buffer) {
        const line = this.replacer(buffer.toString('utf8'));
        return Buffer.from(line, 'utf8');
    }
}
export { StreamReplacer };
//# sourceMappingURL=stream-replacer.js.map