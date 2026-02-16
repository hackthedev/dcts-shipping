function isAlreadyLink(msg, url, msgid) {
    let container = document.querySelector(`#content .message-container .content:not(.reply)[data-message-id='${msgid}']`);
    if (!container) return null;

    let img = container.querySelector(`img[data-original-url="${url}"]`);
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

async function updateMarkdownLinks(delay) {
    const elements = document.querySelectorAll(".contentRows .content p");
    const max = Math.min(elements.length, 50);

    let container = document.getElementById("content");
    const isScrolledDown = isScrolledToBottom(container);

    let firstElement = getLastMessage(container)
    let scrollPosition = getScrollPosition(container,  firstElement?.element);

    let markdownChanged = false;

    for (let i = elements.length - 1; i >= elements.length - max; i--) {
        const el = elements[i];
        if (!el || el.className.includes("hljs")) continue;
        if (el.parentNode.querySelector(".video-embed")) continue;

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

    setTimeout(() => updateMarkdownLinks(delay), delay);
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

        let proxy = url.startsWith(window.location.origin)
            ? url
            : `${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;

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
            isAlreadyLink(msg, url, msgid) !== "image" &&
            isAlreadyLink(msg, url, msgid) !== "audio" && changed === false) {
            msg = msg.replace(url,
                `<a draggable="false" data-media-type="link" data-message-id="${msgid.replace("msg-", "")}" href="${url}" ${url.startsWith(window.location.origin) ? "" : "target=\"_blank\""}>${url}</a>`
            );
            changed = true;
        }

    }

    return { isMarkdown: changed, message: msg };
}