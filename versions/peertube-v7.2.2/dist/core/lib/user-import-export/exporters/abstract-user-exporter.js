export class AbstractUserExporter {
    constructor(options) {
        this.user = options.user;
        this.activityPubFilenames = options.activityPubFilenames;
        this.relativeStaticDirPath = options.relativeStaticDirPath;
    }
    getActivityPubFilename() {
        return null;
    }
}
//# sourceMappingURL=abstract-user-exporter.js.map