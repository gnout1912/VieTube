export function buildChaptersAPHasPart(video, chapters) {
    const hasPart = [];
    if (chapters.length !== 0) {
        for (let i = 0; i < chapters.length - 1; i++) {
            hasPart.push(chapters[i].toActivityPubJSON({ video, nextChapter: chapters[i + 1] }));
        }
        hasPart.push(chapters[chapters.length - 1].toActivityPubJSON({ video, nextChapter: null }));
    }
    return hasPart;
}
//# sourceMappingURL=video-chapters.js.map