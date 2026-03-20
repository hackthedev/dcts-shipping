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
    let updates = []

    for (let embed of embeds) {
        let titleEl = embed.querySelector(".meta-info.title");
        let descEl = embed.querySelector(".meta-info.description");

        if (titleEl && titleEl.textContent.trim()) continue;

        let url = embed.getAttribute("href");
        if (!url) continue;

        try {
            let urlMeta = await getUrlMeta(url);
            if (!urlMeta?.meta) continue;
            updates.push({ titleEl, descEl, urlMeta, embed, url })
        } catch (e) {}
    }

    if (updates.length === 0) return

    let container = document.getElementById("content")
    await withScrollLock(container, null, () => {
        for (let { titleEl, descEl, urlMeta, embed, url } of updates) {
            if (titleEl) titleEl.textContent = truncateText(urlMeta.meta.title || "", 75);
            if (descEl) descEl.textContent = truncateText(urlMeta.meta.description || "", 300);

            embed.childNodes.forEach(n => {
                if (n.nodeType === 3 && n.textContent.trim().includes(url)) {
                    n.textContent = "";
                }
            });
        }
    })
}

async function updateMarkdownLinks(delay) {
    let container = getContentMainContainer()
    if(!container) throw new Error("no container found!");
    let isScrolledDown = isScrolledToBottom(container, 10)

    let elements = container.querySelectorAll(".contentRows .content p")
    let markdownChanged = false

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
    let metaCache = localStorage.getItem(`urlMetaJson_${url}`);
    if(metaCache){
        try{
            return JSON.parse(metaCache);
        }
        catch{}
    }

    try{
        let meta = await fetch(`/meta/${encodeURIComponent(url)}`)
        if(meta?.status === 200){
            let metaJson = await meta.json();

            if(metaJson) localStorage.setItem(`urlMetaJson_${url}`, JSON.stringify(metaJson))
            return await metaJson;
        }
    }
    catch{}
}

function isURL(text) {
    try {
        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === "data:";

    } catch (err) {
        return false;
    }
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

        let proxy = ChatManager.proxyUrl(url);

        let [media, urlMeta] = await Promise.all([
            checkMediaTypeAsync(url),
            getUrlMeta(url)
        ]);

        if (url.includes("youtu.be") || url.includes("youtube.com/watch")) {
            msg = msg.replace(url, createYouTubeEmbed(url, msgid));
            changed = true;
            continue;
        }

        if (media === "image") {
            msg = msg.replace(
                url,
                ` <img decoding="async" loading="lazy" draggable="false" class="image-embed"
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

        if (urlMeta?.meta?.title || urlMeta?.meta?.description) {
            console.log(urlMeta)

            let embed = `
            <div class="markdown-urlEmbed-container">
                <a class="markdown-urlEmbed"
                   data-media-type="link"
                   data-original-url="${url}"
                   href="${url}" ${url.startsWith(location.origin) ? "" : 'target="_blank"'}>
                    <span class="meta-info title">
                        ${urlMeta?.meta?.title ? stripHTML(truncateText(urlMeta.meta.title, 75)) : ""}
                    </span>
                    <span class="meta-info description">
                        ${urlMeta?.meta?.description ? stripHTML(truncateText(urlMeta.meta.description, 300)) : ""}
                    </span>
                </a>
            </div>`;

            msg = msg.replace(url, embed);
            changed = true;
            continue;
        }

        msg = msg.replace(url,
            `<a draggable="false" data-media-type="link" data-message-id="${msgid.replace("msg-", "")}" href="${url}" ${url.startsWith(location.origin) ? "" : "target=\"_blank\""}> ${unescapeHtmlEntities(sanitizeHtmlForRender(url))} </a>`
        );
        changed = true;
    }

    return { isMarkdown: changed, message: msg };
}

function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;
}

async function checkMediaTypeAsync(url) {
    return new Promise((resolve, reject) => {

        if (!isURL(url)) {
            resolve("unkown");
            return;
        }

        // try to cache urls etc for speed
        let cachedMediaType = localStorage.getItem(`mediaType_cache_${url}`);
        if(cachedMediaType && cachedMediaType !== "unkown") {
            resolve(cachedMediaType)
        }

        socket.emit("checkMediaUrlCache", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            url: url
        }, function (response) {
            if (response.isCached === true && response?.mediaType !== "unknown") {
                if(response?.mediaType){
                    localStorage.setItem(`mediaType_cache_${url}`, response.mediaType)
                }

                // return cached media type
                resolve(response.mediaType);
            } else {
                // url wasnt cached
                let xhr = new XMLHttpRequest();
                xhr.open('HEAD', `${ChatManager.proxyUrl(url)}`, false); // false makes the request synchronous
                try {
                    xhr.send();
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let contentType = xhr.getResponseHeader('Content-Type');

                        if (contentType) {
                            if (contentType.startsWith('audio/')) {
                                resolve('audio');
                            } else if (contentType.startsWith('video/')) {
                                resolve('video');
                            } else if (contentType.startsWith('image/')) {
                                resolve('image');
                            } else {
                                resolve('unknown');
                            }
                        } else {
                            console.log("Content-Type missing")
                            throw new Error('Content-Type header is missing');
                        }
                    } else {
                        if (xhr.status === 404) resolve ("404");

                        throw new Error(`HTTP error! status: ${xhr.status}`);
                    }
                } catch (error) {
                    console.error('Error checking media type:', error);
                    resolve('error');
                }
            }

        });

    });
}

function handleVideoClick(event, videoElement) {
    event.preventDefault();
    event.stopPropagation();
    const shouldPlay = videoElement.paused;
    document.querySelectorAll(".video-embed").forEach(player => {
        if (player !== videoElement && !player.paused) {
            player.pause();
        }
    });

    if (shouldPlay) {
        videoElement.play().catch(err => console.warn(err));
    } else {
        videoElement.pause();
    }
}

function createYouTubeEmbed(url, messageId) {
    let u = new URL(url.trim());
    let host = u.hostname.replace("www.", "").toLowerCase();

    let code = "";
    let t = "";

    if (u.searchParams.has("t")) t = u.searchParams.get("t");
    if (u.hash.startsWith("#t=")) t = u.hash.replace("#t=", "");
    if (u.hash.startsWith("#")) t = u.hash.replace("#", "");

    if (host === "youtube.com" || host === "m.youtube.com") {
        // watch?v=...
        if (u.searchParams.has("v")) {
            code = u.searchParams.get("v");
        }
        // /embed/...
        else if (u.pathname.startsWith("/embed/")) {
            code = u.pathname.replace("/embed/", "");
        }
        // /shorts/...
        else if (u.pathname.startsWith("/shorts/")) {
            code = u.pathname.replace("/shorts/", "").split("?")[0];
        }
    } else if (host === "youtu.be") {
        code = u.pathname.replace("/", "");
    }

    if (!code) {
        console.warn("No youtube code found in url")
        return;
    }

    let embed = "https://www.youtube.com/embed/" + code;
    if (t) embed += "?start=" + parseInt(t);

    return `
        <div data-message-id="${messageId.replace("msg-", "")}" class="iframe-container" id="msg-${messageId}">
            <a href="${url}" target="_blank">${url}</a><br>
            <iframe
                data-original-url="${url}"
                data-message-id="${messageId.replace("msg-", "")}"
                data-media-type="youtube"
                style="border:none"
                src="${embed}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin">
            </iframe>

        </div>
    `;
}


var notAImage = []
var notAImageCount = []
var validImage = []

function isImage(url) {

    const img = new Image();

    img.src = url;


    if (img.height > 0 && img.width > 0) {
        if (validImage.includes(url) == false) {
            validImage.push(url);
        }


        return true;
    } else {

        // Try to load a image 6 times
        if (notAImage.includes(url) == false && notAImageCount[url] > 6) {
            notAImage.push(url);
        }

        notAImageCount[url]++;
        return false;
    }
}

function isAudio(url) {
    return /\.(mp3|wav|ogg)$/.test(url.toLowerCase());
}

function isVideo(url) {
    return new Promise((resolve) => {
        const vid = document.createElement("video");

        vid.onloadedmetadata = function () {
            resolve(vid.videoWidth > 0 && vid.videoHeight > 0);
        };

        vid.onerror = function () {
            resolve(false);
        };

        vid.src = url;
    });
}
