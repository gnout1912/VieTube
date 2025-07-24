export class VideoFileMetadata {
    constructor(hash) {
        this.chapters = hash.chapters;
        this.format = hash.format;
        this.streams = hash.streams;
        delete this.format.filename;
    }
}
//# sourceMappingURL=video-file-metadata.model.js.map