import EventEmitter from 'events';
class AbstractTranscodingWrapper extends EventEmitter {
    constructor(options) {
        super();
        this.lTags = options.lTags;
        this.videoLive = options.videoLive;
        this.videoUUID = options.videoLive.Video.uuid;
        this.streamingPlaylist = options.streamingPlaylist;
        this.sessionId = options.sessionId;
        this.inputLocalUrl = options.inputLocalUrl;
        this.inputPublicUrl = options.inputPublicUrl;
        this.toTranscode = options.toTranscode;
        this.bitrate = options.bitrate;
        this.ratio = options.ratio;
        this.hasAudio = options.hasAudio;
        this.hasVideo = options.hasVideo;
        this.probe = options.probe;
        this.segmentListSize = options.segmentListSize;
        this.segmentDuration = options.segmentDuration;
        this.outDirectory = options.outDirectory;
    }
}
export { AbstractTranscodingWrapper };
//# sourceMappingURL=abstract-transcoding-wrapper.js.map