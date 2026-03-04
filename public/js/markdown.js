function isAlreadyLink(msg, url, msgid) {
    let container = document.querySelector(
        `#content .message-container .content:not(.reply)[data-message-id='${msgid}']`
    );
    if (!container) return null;

    if (container.closest("code, pre, blockquote")) return null;

    let el =
        container.querySelector(`img[data-original-url="${url}"]`) ||
        container.querySelector(`video[data-original-url="${url}"]`) ||
        container.querySelector(`audio[data-original-url="${url}"]`) ||
        container.querySelector(`iframe[data-original-url="${url}"]`) ||
        container.querySelector(`a[data-original-url="${url}"]`);

    if (el && el.closest("code, pre, blockquote")) return null;

    return el ? el.getAttribute("data-media-type") : null;
}

async function updateMissingMeta() {
    let embeds = document.querySelectorAll(".markdown-urlEmbed");
    for (let embed of embeds) {
        let titleEl = embed.querySelector(".meta-info.title");
        let descEl = embed.querySelector(".meta-info.description");

        if (titleEl && titleEl.textContent.trim()) continue;

        let url = embed.getAttribute("href");
        if (!url) continue;

        try {
            let urlMeta = await getUrlMeta(url);
            if (!urlMeta?.meta) continue;

            let container = document.getElementById("content");
            let lastMsg = getLastMessage(container)
            await withScrollLock(container, lastMsg?.element, async () => {
                if (titleEl) titleEl.textContent = truncateText(urlMeta.meta.title || "", 75);
                if (descEl) descEl.textContent = truncateText(urlMeta.meta.description || "", 300);

                embed.childNodes.forEach(n => {
                    if (n.nodeType === 3 && n.textContent.trim().includes(url)) {
                        n.textContent = "";
                    }
                });
            })
        } catch (e) {}
    }
}

async function updateMarkdownLinks(delay) {
    let container = document.getElementById("content")
    let isScrolledDown = isScrolledToBottom(container, 10)
    let lastMsg = getLastMessage(container)

    let elements = document.querySelectorAll(".contentRows .content p")
    let markdownChanged = false

    await withScrollLock(container, lastMsg?.element, async () => {
        for (let i = elements.length - 1; i >= 0; i--) {
            let el = elements[i]
            if (!el) continue
            if (el.className.includes("hljs")) continue
            if (el.hasAttribute("data-markdown-done")) continue
            if (!isElementVisible(el)) continue
            if (el.querySelector(".markdown-urlEmbed-container")) continue
            if (el.closest(".markdown-urlEmbed-container")) continue

            let messageId =
                el.getAttribute("data-message-id") ||
                el.parentNode?.getAttribute("data-message-id")
            if (!messageId) continue

            let originalText = el.textContent
            if (!originalText?.trim()) continue

            try {
                let marked = await markdown(originalText, messageId)
                if (!marked.isMarkdown) continue

                let wrapper = document.createElement("div")
                wrapper.innerHTML = sanitizeHtmlForRender(marked.message)
                let node = wrapper.firstElementChild || wrapper
                el.replaceWith(node)
                node.setAttribute("data-markdown-done", "true")
                markdownChanged = true
            } catch (err) {
                console.log(err)
            }
        }
    })

    // adjust new media stuff. would have been mindblowing to think about that earlier
    if (markdownChanged) {
        await updateMissingMeta()
        watchMediaLoads(container)
        if (isScrolledDown) scrollDown("updateMarkdown")
    } else {
        await updateMissingMeta()
    }

    setTimeout(() => updateMarkdownLinks(delay), delay)
}

async function getUrlMeta(url){
    try{

        let meta = await fetch(`/meta/${encodeURIComponent(url)}`)
        if(meta.status === 200){
            return await meta.json()
        }
    }
    catch{}
}

async function markdown(msg, msgid) {
    if (!msg || !msgid) return { isMarkdown: false, message: msg };

    let urls = getUrlFromText(msg);
    if (!urls?.length) return { isMarkdown: false, message: msg };

    let changed = false;

    for (const url of urls) {
        if (!isURL(url)) continue;

        let existing = isAlreadyLink(msg, url, msgid);
        if (existing) continue;

        let media = await checkMediaTypeAsync(url);
        let proxy = ChatManager.proxyUrl(url);
        let urlMeta = await getUrlMeta(url);

        if (url.includes("youtu.be") || url.includes("youtube.com/watch")) {
            msg = msg.replace(url, createYouTubeEmbed(url, msgid));
            changed = true;
            continue;
        }

        if (media === "image") {
            msg = msg.replace(
                url,
                ` <img draggable="false" class="image-embed"
                         src="${proxy}"
                         data-original-url="${url}"
                         data-media-type="image">`
            );
            changed = true;
            continue;
        }

        if (media === "audio") {
            msg = msg.replace(url, createAudioPlayerHTML(proxy, url));
            changed = true;
            continue;
        }

        if (media === "video") {
            msg = msg.replace(
                url,
                `<video class="video-embed" controls preload="auto"
                        src="${proxy}"
                        data-original-url="${url}"
                        data-media-type="video"></video>`
            );
            changed = true;
            continue;
        }

        let embed = `
            <div class="markdown-urlEmbed-container">
                <a class="markdown-urlEmbed"
                   data-media-type="link"
                   data-original-url="${url}"
                   href="${url}" ${url.startsWith(location.origin) ? "" : 'target="_blank"'}>
                    <span class="meta-info title">
                        ${urlMeta?.meta?.title ? unescapeHtmlEntities(sanitizeHtmlForRender(truncateText(urlMeta.meta.title, 75))) : ""}
                    </span>
                    <span class="meta-info description">
                        ${urlMeta?.meta?.description ? unescapeHtmlEntities(sanitizeHtmlForRender(truncateText(urlMeta.meta.description, 300))) : ""}
                    </span>
                </a>
            </div>`;

        msg = msg.replace(url, embed);
        changed = true;
    }

    return { isMarkdown: changed, message: msg };
}
