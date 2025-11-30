function isAlreadyLink(msg, url, msgid) {
    let message = document.querySelector(`#content .message-container .content:not(.reply)[data-message-id='${msgid}']`)
    let isHTML = false;
    if(message?.innerHTML.includes("<a") ||
        message?.innerHTML.includes("<iframe") ||
        message?.innerHTML.includes("<img")
    ){
        isHTML = true;
    }

    return isHTML
}

async function markdown(msg, msgid) {
    if (!msg || !msgid) return { isMarkdown: false, message: msg };

    let urls = getUrlFromText(msg);
    if (!urls?.length) return { isMarkdown: false, message: msg };

    let changed = false;

    for (const url of urls) {
        if (!isURL(url)) continue;
        if (isAlreadyLink(msg, url, msgid)) continue;

        let media = await checkMediaTypeAsync(url);

        let proxy = url.startsWith(window.location.origin)
            ? url
            : `${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;

        if (media === "image") {
            msg = msg.replace(url,
                `<div class="image-embed-container">
                    <img draggable="false" class="image-embed"
                        data-message-id="${msgid.replace("msg-", "")}"
                        id="msg-${msgid.replace("msg-", "")}"
                        alt="${proxy}"
                        src="${proxy}"
                        onerror="this.src='/img/error.png'">
                </div>`
            );
            changed = true;
            continue;
        }

        if (media === "audio") {
            msg = msg.replace(url, createAudioPlayerHTML(proxy));
            changed = true;
            continue;
        }

        if (media === "video") {
            msg = msg.replace(url,
                `<p data-message-id="${msgid.replace("msg-", "")}">
                    <a draggable="false" href="${url}" target="_blank">${url}</a>
                </p>
                <video data-message-id="${msgid.replace("msg-", "")}"
                       data-src="${proxy}"
                       preload="auto"
                       class="video-embed"
                       controls>
                    <source src="${proxy}">
                </video>`
            );
            changed = true;
            continue;
        }

        if (url.includes("youtu.be") || url.includes("youtube")) {
            msg = msg.replace(url, createYouTubeEmbed(url, msgid));
            changed = true;
            continue;
        }

        msg = msg.replace(url,
            `<a draggable="false" data-message-id="${msgid.replace("msg-", "")}" href="${url}" ${url.startsWith(window.location.origin) ? "" : "target=\"_blank\""}>${url}</a>`
        );
        changed = true;
    }

    if (changed) scrollDown();

    return { isMarkdown: changed, message: msg };
}
