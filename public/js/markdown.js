function isAlreadyLink(msg, url, msgid) {
    url = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "");

    let container = document.querySelector(`#content .message-container .content:not(.reply)[data-message-id='${msgid}']`);
    if (!container) return null;

    let img = container?.querySelector(`img[data-original-url="${url}"]`);
    if (img) return img.getAttribute("data-media-type") || "image";

    let video = container.querySelector(`video[data-original-url="${url}"]`);
    if (video) return video.getAttribute("data-media-type") || "video";

    let audio = container.querySelector(`audio[data-original-url="${url}"]`);
    if (audio) return audio.getAttribute("data-media-type") || "audio";

    let youtube = container.querySelector(`iframe[data-original-url="${url}"]`);
    if (youtube) return youtube.getAttribute("data-media-type") || "youtube";


    let link = container.querySelector(`a[href="${url}"]`);
    if (link) return link.getAttribute("data-media-type") || "link";

    return null;
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

            if (titleEl) titleEl.textContent = truncateText(urlMeta.meta.title || "", 75);
            if (descEl) descEl.textContent = truncateText(urlMeta.meta.description || "", 300);

            embed.childNodes.forEach(n => {
                if (n.nodeType === 3 && n.textContent.trim().includes(url)) {
                    n.textContent = "";
                }
            });
        } catch (e) {}
    }
}

async function updateMarkdownLinks(delay) {
    const elements = document.querySelectorAll(".contentRows .content p");
    const max = Math.min(elements.length, 50);

    let container = document.getElementById("content");
    const isScrolledDown = isScrolledToBottom(container);

    let firstElement = getLastMessage(container)
    let scrollPosition = getScrollPosition(container,  firstElement?.element);

    let markdownChanged = false;

    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (!el || el.className.includes("hljs")) continue;
        if (el.parentNode.querySelector(".video-embed")) continue;
        if (el.hasAttribute("data-markdown-done")) continue;

        try {
            if (el.innerText.trim().length === 0) continue;

            // skip if the element isnt visible. some way
            // to avoid the chat log from jumping all the time
            if (!isElementVisible(el)) continue;

            const messageId = el.getAttribute("data-message-id") || el.parentNode?.getAttribute("data-message-id");
            const marked = await markdown(el.innerText, messageId);

            if (marked.message != null &&
                ((!marked.isMarkdown && marked.message !== el.innerText) ||
                    (marked.isMarkdown && marked.message !== el.innerHTML))) {

                bypassCounter[el.id] = (bypassCounter[el.id] || 0) + 1;
                if (!bypassElement[el.id]) {

                    el.innerHTML = marked.isMarkdown
                        ? sanitizeHtmlForRender(marked.message)
                        : el.innerText;

                    if (marked.isMarkdown) el.setAttribute("data-markdown-done", "true");
                    markdownChanged = true;

                    fixScrollAfterMediaLoad(container, scrollPosition);
                }
            }
        } catch (err) {
            console.log(err);
        }
    }

    if (markdownChanged && isScrolledDown) {
        scrollDown("updateMarkdown");
    }

    await updateMissingMeta();

    setTimeout(() => updateMarkdownLinks(delay), delay);
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
    let contentElement = document.querySelector("#content");
    let scrolledDown = isScrolledToBottom(contentElement);

    for (const url of urls) {
        if (!isURL(url)) continue;

        let media = await checkMediaTypeAsync(url);
        let proxy = ChatManager.proxyUrl(url);
        let urlMeta = await getUrlMeta(url)

        if (media === "image" && isAlreadyLink(msg, url, msgid) !== "image") {
            msg = msg.replace(url,
                `<div class="image-embed-container">
                    <img draggable="false" class="image-embed"                        
                        data-message-id="${msgid.replace("msg-", "")}"
                        id="msg-${msgid.replace("msg-", "")}"
                        alt="${proxy}"
                        src="${proxy}"
                        data-original-url="${proxy}"
                        data-media-type="${media}">
                </div>`
            );
            changed = true;
            continue;
        }

        if (media === "audio" && isAlreadyLink(msg, url, msgid) !== "audio") {
            msg = msg.replace(url, createAudioPlayerHTML(proxy));
            changed = true;
            continue;
        }

        if (media === "video" && isAlreadyLink(msg, url, msgid) !== "video") {
            msg = msg.replace(url,
                `<p data-message-id="${msgid.replace("msg-", "")}">
                    <a draggable="false" href="${url}" target="_blank">${url}</a>
                </p>
                <video data-message-id="${msgid.replace("msg-", "")}"
                       data-src="${proxy}"
                       data-original-url="${url}"
                       data-media-type="${media}"
                       preload="auto"
                       class="video-embed"
                       controls>
                    <source src="${proxy}">
                </video>`
            );
            changed = true;
            continue;
        }

        if ((url.includes("youtu.be") || url.includes("youtube")) && isAlreadyLink(msg, url, msgid) !== "youtube") {
            msg = msg.replace(url, createYouTubeEmbed(url, msgid));
            changed = true;
            continue;
        }

        if(isAlreadyLink(msg, url, msgid) !== "link" &&
            isAlreadyLink(msg, url, msgid) !== "youtube" &&
            isAlreadyLink(msg, url, msgid) !== "video" &&
            isAlreadyLink(msg, url, msgid) !== "image" ) {

            let linkText = msg.replace(url, "").trim();

            let embed = `
            <a                     
                class="markdown-urlEmbed"
                draggable="false" 
                data-media-type="link" 
                data-message-id="${msgid.replace("msg-", "")}" 
                href="${url}" ${url.startsWith(window.location.origin) ? "" : 'target="_blank"'}
            >
                <span class="meta-info title">
                    ${urlMeta?.meta?.title ? truncateText(urlMeta?.meta?.title, 75) : ""}
                </span>
                <span class="meta-info description">                    
                    ${urlMeta?.meta?.description ? truncateText(urlMeta?.meta?.description, 300) : ""}
                </span>        
                ${!urlMeta ? url : ""}
            </a>`;

            msg = (linkText ? linkText + "" : "") + embed;
            changed = true;
        }
    }

    return { isMarkdown: changed, message: msg };
}