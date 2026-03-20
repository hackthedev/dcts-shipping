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

    //ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    //ALLOW_DATA_ATTR: false,
    //FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
};

let _hooksInstalled = false;

function installDomPurifyHooks() {
    if (_hooksInstalled || !window.DOMPurify) return;
    _hooksInstalled = true;

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
}

function stripHTML(html) {
    if (html == null) return '';
    return DOMPurify.sanitize(String(html), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

function sanitizeHtmlForRender(html, wrapParagraphs = false) {
    if (html == null) return '';

    installDomPurifyHooks();
    let clean = DOMPurify.sanitize(String(html), SANITIZE_OPTIONS);

    if (wrapParagraphs) {
        clean = `<p>${clean}</p>`;
    }

    return clean.trim();
}

function encodePlainText(s) {
    return String(s || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function unescapeHtmlEntities(str, raw = false) {
    if (str == null) return '';

    if(raw === true){
        const txt = document.createElement('textarea');
        txt.innerHTML = DOMPurify.sanitize(String(str), SANITIZE_OPTIONS);
        return txt.value;
    }

    const txt = document.createElement('label');
    txt.innerHTML = DOMPurify.sanitize(String(str), SANITIZE_OPTIONS);
    let unescaped = txt.textContent;

    const div = document.createElement('div');
    div.innerHTML = DOMPurify.sanitize(unescaped, SANITIZE_OPTIONS);
    return div.textContent || "";
}

function hl(text, query) {
    text = String(text || '');
    if (!query) return sanitizeHtmlForRender(encodePlainText(text));
    const q = String(query || '').toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return sanitizeHtmlForRender(encodePlainText(text));
    const before = encodePlainText(text.slice(0, idx));
    const match = encodePlainText(text.slice(idx, idx + q.length));
    const after = encodePlainText(text.slice(idx + q.length));
    return sanitizeHtmlForRender(`${before}<mark>${match}</mark>${after}`);
}

function ensureDomPurify(src = "https://cdn.jsdelivr.net/npm/dompurify@3.1.7/dist/purify.min.js") {
    const targetHref = new URL(src, document.baseURI).href;

    const existing = Array.from(document.querySelectorAll('script[src]')).find(s => {
        try { return new URL(s.getAttribute('src'), document.baseURI).href === targetHref; }
        catch { return false; }
    });

    return new Promise((resolve, reject) => {
        const finish = () => {
            installDomPurifyHooks();
            resolve(window.DOMPurify);
        };
        const waitForGlobal = () => {
            if (window.DOMPurify) return finish();
            setTimeout(waitForGlobal, 25);
        };

        if (existing) {
            if (window.DOMPurify) return finish();
            existing.addEventListener("load", finish, { once: true });
            existing.addEventListener("error", () => reject(new Error("Failed to load DOMPurify (existing script).")), { once: true });
            return waitForGlobal();
        }

        const el = document.createElement("script");
        el.src = targetHref;
        el.async = true;
        el.onload = finish;
        el.onerror = () => reject(new Error("Failed to load DOMPurify"));
        document.head.appendChild(el);
        waitForGlobal();
    });
}