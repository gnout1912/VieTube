import { TagsHtml } from './tags-html.js';
export function buildEmptyEmbedHTML(options) {
    const { html, playlist, video } = options;
    let htmlResult = TagsHtml.addTitleTag(html);
    htmlResult = TagsHtml.addDescriptionTag(htmlResult);
    return TagsHtml.addTags(htmlResult, { forbidIndexation: true, embedIndexation: true }, { playlist, video });
}
//# sourceMappingURL=common.js.map