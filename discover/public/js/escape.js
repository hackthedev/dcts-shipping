
const SANITIZE_OPTIONS = {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'b', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'pre', 'code', 'blockquote', 'strong', 'em', 'img', 'mark'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style']
};

function sanitizeHtmlForRender(html) {
    if (html == null) return '';

    let raw = unescapeHtmlEntities(String(html || '')).trim();

    const hasTags = /<\/?[a-z][\s\S]*?>/i.test(raw);
    if (!hasTags) {
        const paras = raw.replace(/\r/g, '').split(/\n{2,}/)
            .map(s => s.trim())
            .filter(Boolean);

        let out = paras.map(p => {
            const withBreaks = encodePlainText(p).replace(/\n/g, '<br>');
            return `<p>${withBreaks}</p>`;
        }).join('');

        const clean = DOMPurify.sanitize(out, SANITIZE_OPTIONS);
        return `<div class="sanitized-content">${clean}</div>`;
    }

    let clean = DOMPurify.sanitize(raw, SANITIZE_OPTIONS);

    clean = clean.replace(/<p[^>]*>\s*(?:&nbsp;|\s|\u00A0)*<\/p>/gi, '');

    clean = clean.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');

    return `<div class="sanitized-content">${clean.trim()}</div>`;
}

function encodePlainText(s) {
    return String(s || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function unescapeHtmlEntities(str) {
    if (str == null) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = String(str);
    return txt.value;
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