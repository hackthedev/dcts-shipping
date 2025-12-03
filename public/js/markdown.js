function isAlreadyLink(msg, url, msgid) {
    let container = document.querySelector(`#content .message-container .content:not(.reply)[data-message-id='${msgid}']`);
    if (!container) return null;

    let img = container.querySelector(`img[data-original-url="${url}"]`);
    if (img) return img.getAttribute("data-media-type") || "image";

    let video = container.querySelector(`video[data-original-url="${url}"]`);
    if (video) return video.getAttribute("data-media-type") || "video";

    let audio = container.querySelector(`audio[data-original-url="${url}"]`);
    if (audio) return audio.getAttribute("data-media-type") || "audio";

    let link = container.querySelector(`a[href="${url}"]`);
    if (link) return link.getAttribute("data-media-type") || "link";

    let youtube = container.querySelector(`iframe[href="${url}"]`);
    if (youtube) return youtube.getAttribute("data-media-type") || "youtube";

    return null;
}


async function markdown(msg, msgid) {
    if (!msg || !msgid) return { isMarkdown: false, message: msg };

    let urls = getUrlFromText(msg);
    if (!urls?.length) return { isMarkdown: false, message: msg };

    let changed = false;
    let scrolledDown = isScrolledToBottom(document.querySelector("#content"));

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
                        data-original-url="${url}"
                        data-media-type="${media}"
                        onerror="this.src='/img/error.png'">
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

        msg = msg.replace(url,
            `<a draggable="false" data-media-type="$url" data-message-id="${msgid.replace("msg-", "")}" href="${url}" ${url.startsWith(window.location.origin) ? "" : "target=\"_blank\""}>${url}</a>`
        );
        changed = true;
    }

    if (changed && scrolledDown) scrollDown();

    return { isMarkdown: changed, message: msg };
}
