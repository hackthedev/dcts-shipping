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

    try {
        const urls = getUrlFromText(msg);
        if (!urls?.length) return { isMarkdown: false, message: msg };

        for (const url of urls) {
            if (!isURL(url)) continue;

            if (isAlreadyLink(msg, url, msgid)) {
                return { isMarkdown: false, message: msg };
            }

            const mediaType = await checkMediaTypeAsync(url);

            let proxyUrl = `${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;
            if (url.toLowerCase().startsWith(window.location.origin.toLowerCase())) {
                proxyUrl = url;
            }

            if (mediaType === "audio") {
                msg = msg.replace(url, createAudioPlayerHTML(proxyUrl)).replaceAll("\n", "");
                return { isMarkdown: true, message: msg };
            }

            if (mediaType === "image") {
                msg = msg.replace(url, `
                    <div class="image-embed-container">
                        <img draggable="false" class="image-embed"
                             data-message-id="${msgid.replace("msg-", "")}"
                             id="msg-${msgid.replace("msg-", "")}"
                             alt="${proxyUrl}"
                             src="${proxyUrl}"
                             onerror="this.src = '/img/error.png';">
                    </div>`);
                return { isMarkdown: true, message: msg };
            }

            if (mediaType === "video") {
                msg = msg.replace(url, `
                    <p data-message-id="${msgid.replace("msg-", "")}">
                        <a href="${url}" target="_blank">${url}</a>
                    </p>
                    <video data-message-id="${msgid.replace("msg-", "")}"
                           data-src="${proxyUrl}"
                           preload="auto"
                           style="background-color: black;"
                           class="video-embed"
                           controls>
                        <source src="${proxyUrl}">
                    </video>`);
                return { isMarkdown: true, message: msg };
            }

            // youtube
            if (url.includes("youtube") || url.includes("youtu.be")) {
                msg = msg.replace(url, createYouTubeEmbed(url, msgid));
                return { isMarkdown: true, message: msg };
            }

            // default link
            msg = msg.replace(url, `<a data-message-id="${msgid.replace("msg-", "")}" href="${url}" ${url.startsWith(window.location.origin) ? "" : `target="_blank"`}>${url}</a>`);
            return { isMarkdown: true, message: msg };
        }

        return { isMarkdown: false, message: msg };
    } catch (err) {
        console.error("Error in markdown:", err);
        return { isMarkdown: false, message: msg };
    }
}
