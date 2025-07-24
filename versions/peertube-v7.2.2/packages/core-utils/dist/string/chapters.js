import { timeToInt, timecodeRegexString } from '../common/date.js';
const timecodeRegex = new RegExp(`^(${timecodeRegexString})\\s`);
export function parseChapters(text, maxTitleLength) {
    if (!text)
        return [];
    const lines = text.split(/\r?\n|\r|\n/g);
    const chapters = [];
    let lastTimecode;
    for (const line of lines) {
        const matched = line.match(timecodeRegex);
        if (!matched)
            continue;
        const timecodeText = matched[1];
        const timecode = timeToInt(timecodeText);
        if (lastTimecode !== undefined && timecode <= lastTimecode)
            continue;
        lastTimecode = timecode;
        const title = line.replace(matched[0], '');
        chapters.push({ timecode, title: title.slice(0, maxTitleLength) });
    }
    if (chapters.length > 1)
        return chapters;
    return [];
}
//# sourceMappingURL=chapters.js.map