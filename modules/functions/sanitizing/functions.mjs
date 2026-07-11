import DOMPurify from 'isomorphic-dompurify';

const SANITIZE_OPTIONS = {
    ALLOWED_TAGS: [
        'div',
        'source',
        'video',
        'audio',
        'span',
        'p',
        'br',
        'b',
        'i',
        'u',
        's',
        'a',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'pre',
        'code',
        "label",
        'blockquote',
        'strong',
        'em',
        'img',
        'mark',
        "button",
        "iframe" // needed for embeds
    ]
    ,

    ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'src',
        'alt',
        'class',
        //'style', // needs to be removed but with testing
        'data-id',
        'controls',
        'title',
        'data-member-id',
        'data-message-id'
    ],

    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
};

let _activeOnTag = null;

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (_activeOnTag && node.tagName) {
        _activeOnTag(node.tagName.toLowerCase(), node, data);
    }
});

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');

        const href = (node.getAttribute('href') || '').toLowerCase().trim();
        if (href.startsWith('javascript:') || href.startsWith('data:') || href.startsWith('vbscript:')) {
            node.removeAttribute('href');
        }
    }

    if (node.tagName === 'IMG') {
        const src = (node.getAttribute('src') || '').toLowerCase().trim();
        if (src.startsWith('javascript:') || src.startsWith('data:') || src.startsWith('vbscript:')) {
            node.remove();
        }
    }
});



export function sanitizeHTML(html, onTag = null) {
    if (html == null) return '';

    _activeOnTag = typeof onTag === 'function' ? onTag : null;

    const clean = DOMPurify.sanitize(String(html), SANITIZE_OPTIONS);

    _activeOnTag = null;
    return clean;
}

export function stripHTML(html) {
    if(typeof html === "object") return;
    if(Array.isArray(html)) return;
    if (html == null) return '';
    return DOMPurify.sanitize(String(html), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function encodePlainText(s) {
    return String(s || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}