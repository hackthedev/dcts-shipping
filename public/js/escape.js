
function stripHTML(html) {
    return ChatTools.Sanitize.stripHTML(html);
}
function sanitizeHtmlForRender(html, wrapParagraphs = false) {
    return ChatTools.Sanitize.forRender(html, wrapParagraphs)
}

function encodePlainText(s) {
    return ChatTools.Sanitize.encodePlainText(s)
}

function unescapeHtmlEntities(str, raw = false) {
    return ChatTools.Sanitize.unescapeHtmlEntities(str, raw)
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