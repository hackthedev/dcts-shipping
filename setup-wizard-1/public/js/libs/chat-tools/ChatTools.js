class ChatTools {
    static Scroll = class {
        static scrollDown(containerElement, opts = {}) {
            const el = containerElement
            if (!el) return;

            const tolerancePx = Number.isFinite(opts.tolerancePx) ? opts.tolerancePx : 2;
            const maxMs = Number.isFinite(opts.maxMs) ? opts.maxMs : 5000;
            const stableMs = Number.isFinite(opts.stableMs) ? opts.stableMs : 250;

            if (!el._scrollDownState) el._scrollDownState = {};
            const state = el._scrollDownState;

            state.seq = (state.seq || 0) + 1;
            const seq = state.seq;

            if (state.raf) cancelAnimationFrame(state.raf);
            if (state.mo) state.mo.disconnect();
            if (state.ro) state.ro.disconnect();

            const start = performance.now();
            let lastChange = performance.now();

            const jumpBottom = () => {
                const top = Math.max(0, el.scrollHeight - el.clientHeight);
                if (el.scrollTop !== top) el.scrollTop = top;
            };

            const onAnyChange = () => { lastChange = performance.now(); };

            state.mo = new MutationObserver(onAnyChange);
            state.mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });

            state.ro = new ResizeObserver(onAnyChange);
            state.ro.observe(el);

            const bindMedia = () => {
                const nodes = el.querySelectorAll("img,video");
                nodes.forEach(n => {
                    if (n._sdBound) return;
                    n._sdBound = true;

                    if (n.tagName === "IMG") {
                        if (!n.complete) {
                            n.addEventListener("load", onAnyChange, { once: true });
                            n.addEventListener("error", onAnyChange, { once: true });
                        }
                    } else {
                        if (n.readyState < 2) {
                            n.addEventListener("loadeddata", onAnyChange, { once: true });
                            n.addEventListener("loadedmetadata", onAnyChange, { once: true });
                            n.addEventListener("error", onAnyChange, { once: true });
                        }
                    }
                });
            };

            const tick = () => {
                if (el._scrollDownState.seq !== seq) return;

                bindMedia();
                jumpBottom();

                const now = performance.now();
                const bottomOk = this.isScrolledToBottom(el, tolerancePx);
                const stableEnough = bottomOk && (now - lastChange) >= stableMs;

                if (stableEnough || (now - start) >= maxMs) {
                    if (state.mo) state.mo.disconnect();
                    if (state.ro) state.ro.disconnect();
                    state.mo = null;
                    state.ro = null;
                    state.raf = null;
                    return;
                }

                state.raf = requestAnimationFrame(tick);
            };

            lastChange = performance.now();
            tick();
        }

        static observeContainer(containerElement) {
            let container = containerElement;
            let savedHeight = 0;

            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {

                    if(container.scrollHeight !== savedHeight){
                        let diff = container.scrollHeight - savedHeight;

                        this.toggleSmoothScroll(container, false)
                        container.scrollTop += diff;
                        this.toggleSmoothScroll(container, true)
                        savedHeight = container.scrollHeight;
                    }
                }
            });

            const observeNode = (node) => {
                if (node?.nodeType !== 1) return;
                resizeObserver.observe(node);
                for (const child of node.querySelectorAll("*")) {
                    resizeObserver.observe(child);
                }
            };

            if(container){
                observeNode(container);

                // for other fucking elements
                new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        for (const node of m.addedNodes) observeNode(node);
                    }
                }).observe(container, { childList: true, subtree: true });
            }
            else{
                console.warn("Container not found for resize observing")
            }
        }

        static toggleSmoothScroll(element, toggle) {
            if(!element) throw new Error("Could not toggle smooth scroll container not set")
            element.style.scrollBehavior = toggle ? "smooth" : "auto"
        }

        static isScrolledToBottom(element, tolerancePx = 50) {
            if(!element) throw new Error("no element provoded in isScrollToBottom");
            if(!element?.scrollHeight) return true;
            const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
            return (maxTop - element.scrollTop) <= tolerancePx;
        }
    }

    static Media = class {
        static mediaResolver = null;
        static metaResolver = null;
        static urlProxy = null;

        static isAlreadyLink(url, identifier, containerElement, nodeBlacklist = null) {
            if (!containerElement) return null;

            // default of not present or incorrect
            if(!nodeBlacklist && !Array.isArray(nodeBlacklist)){
                nodeBlacklist =  [
                    "pre",
                    "blockquote",
                    "code",
                ]
            }

            if (containerElement.closest("code, pre, blockquote")) return null;

            let el =
                containerElement.querySelector(`img[data-original-url="${url}"]`) ||
                containerElement.querySelector(`video[data-original-url="${url}"]`) ||
                containerElement.querySelector(`audio[data-original-url="${url}"]`) ||
                containerElement.querySelector(`iframe[data-original-url="${url}"]`) ||
                containerElement.querySelector(`a[data-original-url="${url}"]`);

            if (nodeBlacklist?.some(node => node?.contains(el))) return null;

            return el ? el.getAttribute("data-media-type") : null;
        }

        static isURL(text) {
            try {
                const url = new URL(text);
                return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === "data:";

            } catch (err) {
                return false;
            }
        }

        static isElementVisible(element) {
            if(!element) throw new Error("No element provided");
            const rect = element.getBoundingClientRect();
            return rect.top < window.innerHeight &&
                rect.bottom > 0 &&
                rect.left < window.innerWidth &&
                rect.right > 0;
        }

        static handleVideoClick(event, videoElement) {
            if(!event) throw new Error("No event provided");
            if(!videoElement) throw new Error("No videoElement provided");

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

        static createYouTubeEmbed(url, identifier) {
            if(!url) throw new Error("No url provided");
            if(!identifier) throw new Error("No identifier provided");

            let u = new URL(url.trim());
            let host = u.hostname.replace("www.", "").toLowerCase();

            let code = "";
            let t = "";

            if (u.searchParams.has("t")) t = u.searchParams.get("t");
            if (u.hash.startsWith("#t=")) t = u.hash.replace("#t=", "");
            if (u.hash.startsWith("#")) t = u.hash.replace("#", "");

            if (host === "youtube.com" || host === "m.youtube.com") {
                // watch?v=
                if (u.searchParams.has("v")) {
                    code = u.searchParams.get("v");
                }
                // embed
                else if (u.pathname.startsWith("/embed/")) {
                    code = u.pathname.replace("/embed/", "");
                }
                // shorts
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
                <div data-identifier="${identifier}" class="iframe-container" id="${identifier}">
                    <a href="${url}" target="_blank">${url}</a><br>
                    <iframe
                        data-original-url="${url}"
                        data-identifier="${identifier}"
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

        static getUrlFromText(text) {
            if(!text) throw new Error("No text provided");
            var geturl = new RegExp("(^|[ \t\r\n])((ftp|http|https|mailto|file):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))", "g");
            return text.match(geturl)
        }


        static async markdown({
                                  htmlInput = null,
                                  identifier = null,
                                  containerElement = null,
                                  nodeBlacklist = null,
                              } = {}) {
            if (!htmlInput || !identifier || !containerElement) return {isMarkdown: false, html: htmlInput};

            let urls = this.getUrlFromText(htmlInput);
            if (!urls?.length) return {isMarkdown: false, html: htmlInput};

            let changed = false;

            for (const url of urls) {
                if (!this.isURL(url)) continue;

                let existing = this.isAlreadyLink(url, identifier, containerElement, nodeBlacklist)
                if (existing) continue;

                // optionally if we wanna use a proxy or nah.
                // generally would recommend it depending on the
                // setup to avoid shit like ip grabbers.
                let proxy = this.urlProxy ? await this.urlProxy(url) : url;

                // this is also absolutely needed
                if(!this.mediaResolver) throw new Error("No media resolver set");
                if(!this.metaResolver) throw new Error("No meta resolver set");

                // because what we wanna do here is get the meta data and media data of an url
                let [media, urlMeta] = await Promise.all([
                    this.mediaResolver(url),
                    this.metaResolver(url)
                ]);

                // fallback.
                if(!urlMeta) urlMeta = {};
                if(!media) media = null;

                // depending on the url we can just create a youtube embed directly
                if (url.includes("youtu.be") || url.includes("youtube.com/watch")) {
                    htmlInput = htmlInput.replace(url, this.createYouTubeEmbed(url, identifier));
                    changed = true;
                    continue;
                }

                // lets try to convert the url to html if it matches and
                // skip execution if it did so.
                let convertedHTML = this.convertUrlToHTML(url, media)
                if(convertedHTML !== htmlInput) {
                    htmlInput = convertedHTML;
                    changed = true;
                    continue;
                }

                // otherwise we can continue to check for meta stuff to properly
                // embed an url, like a github url or whatever
                if (urlMeta?.meta?.title || urlMeta?.meta?.description) {
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

                    htmlInput = htmlInput.replace(url, embed);
                    changed = true;
                    continue;
                }

                // fallback to make it a clickable link
                htmlInput = htmlInput.replace(url,
                    `<a draggable="false" data-media-type="link" data-message-id="${identifier}" href="${url}" ${url.startsWith(location.origin) ? "" : "target=\"_blank\""}> ${unescapeHtmlEntities(sanitizeHtmlForRender(url))} </a>`
                );
                changed = true;
            }

            return { isMarkdown: changed, html: htmlInput };
        }

        static convertUrlToHTML({
                                    url,
                                    proxy,
                                    media,
                                    htmlInput,
                                }){
            if (media === "image") {
                htmlInput = htmlInput.replace(
                    url,
                    ` <img decoding="async" loading="lazy" draggable="false" class="image-embed"
                         src="${proxy}"
                         data-original-url="${url}"
                         data-media-type="image">`
                );

                return htmlInput;
            }

            if (media === "audio") {
                htmlInput = htmlInput.replace(url, this.createAudioPlayerHTML(proxy));
                return htmlInput;
            }

            if (media === "video") {
                htmlInput = htmlInput.replace(
                    url,
                    `<video class="video-embed" controls preload="auto"
                        src="${proxy}"
                        data-original-url="${url}"
                        data-media-type="video"></video>`
                );

                return htmlInput;
            }

            // fallback
            return htmlInput;
        }

        static createAudioPlayerHTML(src) {
            const filename = src.split('/').pop().split("_").splice(2).join('_');
            return `
                <div class="audio-player">
                    <p>${filename}</p>
                    <audio
                        controls
                        preload="metadata"
                        src="${src}">
                    </audio>
                </div>
            `;
        }
    }
}
