export function sortByResolutionDesc(fileA, fileB) {
    if (fileA.resolution < fileB.resolution)
        return 1;
    if (fileA.resolution === fileB.resolution)
        return 0;
    return -1;
}
//# sourceMappingURL=video-format-utils.js.map