export function getDefaultSanitizedTags() {
    return ['a', 'p', 'span', 'br', 'strong', 'em', 'ul', 'ol', 'li'];
}
export function getDefaultSanitizedSchemes() {
    return ['http', 'https'];
}
export function getDefaultSanitizedHrefAttributes() {
    return ['href', 'class', 'target', 'rel'];
}
export function getDefaultSanitizeOptions() {
    return {
        allowedTags: getDefaultSanitizedTags(),
        allowedSchemes: getDefaultSanitizedSchemes(),
        allowedAttributes: {
            'a': getDefaultSanitizedHrefAttributes(),
            '*': ['data-*']
        },
        transformTags: {
            a: (tagName, attribs) => {
                let rel = 'noopener noreferrer';
                if (attribs.rel === 'me')
                    rel += ' me';
                return {
                    tagName,
                    attribs: Object.assign(attribs, {
                        target: '_blank',
                        rel
                    })
                };
            }
        }
    };
}
export function getTextOnlySanitizeOptions() {
    return {
        allowedTags: []
    };
}
export function escapeHTML(stringParam) {
    if (!stringParam)
        return '';
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(stringParam).replace(/[&<>"'`=/]/g, s => entityMap[s]);
}
export function escapeAttribute(value) {
    if (!value)
        return '';
    return String(value).replace(/"/g, '&quot;');
}
//# sourceMappingURL=html.js.map