import { CONSTRAINTS_FIELDS, VIDEO_CATEGORIES, VIDEO_LANGUAGES, VIDEO_LICENCES } from '../../initializers/constants.js';
import { peertubeTruncate } from '../core-utils.js';
import { isUrlValid } from '../custom-validators/activitypub/misc.js';
import { isArray } from '../custom-validators/misc.js';
export class YoutubeDLInfoBuilder {
    constructor(info) {
        this.info = Object.assign({}, info);
    }
    getInfo() {
        const obj = this.buildVideoInfo(this.normalizeObject(this.info));
        if (obj.name && obj.name.length < CONSTRAINTS_FIELDS.VIDEOS.NAME.min)
            obj.name += ' video';
        return obj;
    }
    normalizeObject(obj) {
        const newObj = {};
        for (const key of Object.keys(obj)) {
            if (key === 'resolution')
                continue;
            const value = obj[key];
            if (typeof value === 'string') {
                newObj[key] = value.normalize();
            }
            else {
                newObj[key] = value;
            }
        }
        return newObj;
    }
    buildOriginallyPublishedAt(obj) {
        let originallyPublishedAt = null;
        const uploadDateMatcher = /^(\d{4})(\d{2})(\d{2})$/.exec(obj.upload_date);
        if (uploadDateMatcher) {
            originallyPublishedAt = new Date();
            originallyPublishedAt.setHours(0, 0, 0, 0);
            const year = parseInt(uploadDateMatcher[1], 10);
            const month = parseInt(uploadDateMatcher[2], 10) - 1;
            const day = parseInt(uploadDateMatcher[3], 10);
            originallyPublishedAt.setFullYear(year, month, day);
        }
        return originallyPublishedAt;
    }
    buildVideoInfo(obj) {
        return {
            name: this.titleTruncation(obj.title),
            description: this.descriptionTruncation(obj.description),
            category: this.getCategory(obj.categories),
            licence: this.getLicence(obj.license),
            language: this.getLanguage(obj.language),
            nsfw: this.isNSFW(obj),
            tags: this.getTags(obj.tags),
            thumbnailUrl: obj.thumbnail || undefined,
            urls: this.buildAvailableUrl(obj),
            originallyPublishedAtWithoutTime: this.buildOriginallyPublishedAt(obj),
            ext: obj.ext,
            webpageUrl: obj.webpage_url,
            chapters: isArray(obj.chapters)
                ? obj.chapters.map((c) => {
                    return {
                        timecode: c.start_time,
                        title: c.title.slice(0, CONSTRAINTS_FIELDS.VIDEO_CHAPTERS.TITLE.max)
                    };
                })
                : []
        };
    }
    buildAvailableUrl(obj) {
        const urls = [];
        if (obj.url)
            urls.push(obj.url);
        if (obj.urls) {
            if (Array.isArray(obj.urls))
                urls.push(...obj.urls);
            else
                urls.push(obj.urls);
        }
        const formats = Array.isArray(obj.formats)
            ? obj.formats
            : [];
        for (const format of formats) {
            if (!format.url)
                continue;
            urls.push(format.url);
        }
        const thumbnails = Array.isArray(obj.thumbnails)
            ? obj.thumbnails
            : [];
        for (const thumbnail of thumbnails) {
            if (!thumbnail.url)
                continue;
            urls.push(thumbnail.url);
        }
        if (obj.thumbnail)
            urls.push(obj.thumbnail);
        for (const subtitleKey of Object.keys(obj.subtitles || {})) {
            const subtitles = obj.subtitles[subtitleKey];
            if (!Array.isArray(subtitles))
                continue;
            for (const subtitle of subtitles) {
                if (!subtitle.url)
                    continue;
                urls.push(subtitle.url);
            }
        }
        return urls.filter(u => u && isUrlValid(u));
    }
    titleTruncation(title) {
        return peertubeTruncate(title, {
            length: CONSTRAINTS_FIELDS.VIDEOS.NAME.max,
            separator: /,? +/,
            omission: ' […]'
        });
    }
    descriptionTruncation(description) {
        if (!description || description.length < CONSTRAINTS_FIELDS.VIDEOS.DESCRIPTION.min)
            return undefined;
        return peertubeTruncate(description, {
            length: CONSTRAINTS_FIELDS.VIDEOS.DESCRIPTION.max,
            separator: /,? +/,
            omission: ' […]'
        });
    }
    isNSFW(info) {
        return (info === null || info === void 0 ? void 0 : info.age_limit) >= 16;
    }
    getTags(tags) {
        if (Array.isArray(tags) === false)
            return [];
        return tags
            .filter(t => t.length < CONSTRAINTS_FIELDS.VIDEOS.TAG.max && t.length > CONSTRAINTS_FIELDS.VIDEOS.TAG.min)
            .map(t => t.normalize())
            .slice(0, 5);
    }
    getLicence(licence) {
        if (!licence)
            return undefined;
        if (licence.includes('Creative Commons Attribution'))
            return 1;
        for (const key of Object.keys(VIDEO_LICENCES)) {
            const peertubeLicence = VIDEO_LICENCES[key];
            if (peertubeLicence.toLowerCase() === licence.toLowerCase())
                return parseInt(key, 10);
        }
        return undefined;
    }
    getCategory(categories) {
        if (!categories)
            return undefined;
        const categoryString = categories[0];
        if (!categoryString || typeof categoryString !== 'string')
            return undefined;
        if (categoryString === 'News & Politics')
            return 11;
        for (const key of Object.keys(VIDEO_CATEGORIES)) {
            const category = VIDEO_CATEGORIES[key];
            if (categoryString.toLowerCase() === category.toLowerCase())
                return parseInt(key, 10);
        }
        return undefined;
    }
    getLanguage(language) {
        return VIDEO_LANGUAGES[language] ? language : undefined;
    }
}
//# sourceMappingURL=youtube-dl-info-builder.js.map