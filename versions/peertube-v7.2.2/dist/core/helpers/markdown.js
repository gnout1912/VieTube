import MarkdownItClass from 'markdown-it';
import { light as markdownItEmoji } from 'markdown-it-emoji';
import sanitizeHtml from 'sanitize-html';
import { getDefaultSanitizeOptions, getTextOnlySanitizeOptions, TEXT_WITH_HTML_RULES } from '@peertube/peertube-core-utils';
const defaultSanitizeOptions = getDefaultSanitizeOptions();
const textOnlySanitizeOptions = getTextOnlySanitizeOptions();
const markdownItForSafeHtml = new MarkdownItClass('default', { linkify: true, breaks: true, html: true })
    .enable(TEXT_WITH_HTML_RULES)
    .use(markdownItEmoji);
const markdownItForPlainText = new MarkdownItClass('default', { linkify: false, breaks: true, html: false })
    .use(markdownItEmoji)
    .use(plainTextPlugin);
const toSafeHtml = (text) => {
    if (!text)
        return '';
    const textWithLineFeed = text.replace(/<br.?\/?>/g, '\r\n');
    const html = markdownItForSafeHtml.render(textWithLineFeed);
    return sanitizeHtml(html, defaultSanitizeOptions);
};
const mdToPlainText = (text) => {
    if (!text)
        return '';
    markdownItForPlainText.render(text);
    return sanitizeHtml(markdownItForPlainText.plainText, textOnlySanitizeOptions);
};
export { toSafeHtml, mdToPlainText };
function plainTextPlugin(markdownIt) {
    function plainTextRule(state) {
        const text = scan(state.tokens);
        markdownIt.plainText = text;
    }
    function scan(tokens) {
        let lastSeparator = '';
        let text = '';
        function buildSeparator(token) {
            if (token.type === 'list_item_close') {
                lastSeparator = ', ';
            }
            if (token.tag === 'br' || token.type === 'paragraph_close') {
                lastSeparator = ' ';
            }
        }
        for (const token of tokens) {
            buildSeparator(token);
            if (token.type !== 'inline')
                continue;
            for (const child of token.children) {
                buildSeparator(child);
                if (!child.content)
                    continue;
                text += lastSeparator + child.content;
                lastSeparator = '';
            }
        }
        return text;
    }
    markdownIt.core.ruler.push('plainText', plainTextRule);
}
//# sourceMappingURL=markdown.js.map