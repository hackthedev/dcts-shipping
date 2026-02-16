
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
    ]
};

function sanitizeHtmlForRender(html, wrapParagraphs = true) {
    if (html == null) return '';

    let raw = unescapeHtmlEntities(String(html || ''), true).trim();

    const hasTags = /<\/?[a-z][\s\S]*?>/i.test(raw);
    if (!hasTags) {
        const paras = raw.replace(/\r/g, '').split(/\n{2,}/)
            .map(s => s.trim())
            .filter(Boolean);

        let out = paras.map(p => {
            const withBreaks = encodePlainText(p).replace(/\n/g, '<br>');
            return wrapParagraphs ? `<p>${withBreaks}</p>` : withBreaks;
        }).join(wrapParagraphs ? '' : '<br><br>');

        const clean = DOMPurify.sanitize(out, SANITIZE_OPTIONS);
        return `${clean}`;
    }

    let clean = DOMPurify.sanitize(raw, SANITIZE_OPTIONS);

    if (wrapParagraphs) {
        clean = clean.replace(/<p[^>]*>\s*(?:&nbsp;|\s|\u00A0)*<\/p>/gi, '');
    } else {
        clean = clean.replace(/<\/?p[^>]*>/gi, '');
    }

    clean = clean.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');

    return `${clean.trim()}`;
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
        txt.innerHTML = String(str);
        return txt.value;
    }

    const txt = document.createElement('label');
    txt.innerHTML = String(str);
    return txt.textContent;
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
        const finish = () => resolve(window.DOMPurify);
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