class ChatTools {
    static Scroll = class {
        static async registerMessageInfiniteLoad(element, callback = null) {
            if(!element) throw new Error("Element for infinite scroll not found");

            if(!element.getAttribute("data-scroll-init")){
                element.addEventListener("scroll", async function () {
                    if (element.scrollTop === 0) {
                        if(callback && typeof callback === "function") await callback(element);
                    }
                });

                element.setAttribute("data-scroll-init", true)
            }
        }

        static scrollDown(containerElement, opts = {}) {
            const el = containerElement
            if (!el || typeof el === "string"){
                console.trace();
                throw new Error("Scroll down doesnt support strings");
            }

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

        static observeContainer(containerElement, {
            adjustDiff = true,
        } = {}) {
            if(!containerElement) throw new Error("Could not find container");
            let container = containerElement;
            let savedHeight = 0;

            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {

                    if(container.scrollHeight !== savedHeight){
                        let diff = container.scrollHeight - savedHeight;

                        this.toggleSmoothScroll(container, false)
                        if(adjustDiff) container.scrollTop += diff;
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
            if (toggle) {
                element.style.scrollBehavior = "smooth";
            } else {
                element.style.removeProperty("scroll-behavior");
            }
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

            if (nodeBlacklist?.some(selector => el?.closest(selector))) {
                return null
            }

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

            let embed = "https://www.youtube-nocookie.com/embed/" + code;
            if (t) embed += "?start=" + parseInt(t);

            return `
                <div data-identifier="${ChatTools.Sanitize.stripHTML(identifier)}" class="iframe-container" id="${identifier}">
                    <a href="${url}" target="_blank">${ChatTools.Sanitize.forRender(url)}</a><br>
                    <iframe
                        data-original-url="${ChatTools.Sanitize.stripHTML(url)}"
                        data-identifier="${ChatTools.Sanitize.stripHTML(identifier)}"
                        data-media-type="youtube"
                        style="border:none"
                        src="${embed}"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen>
                    </iframe>
        
                </div>
            `;
        }

        static getUrlFromText(text) {
            if (!text) return []

            const regex = /\b(?:https?|mailto):[^\s<>"']+/gi
            return text.match(regex) ?? []
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

            urls = urls.filter(url => {
                let cleanUrl = ChatTools.Sanitize.stripHTML(url);
                let escapedUrl = cleanUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

                return !new RegExp(`(?:src|href|data-original-url|data-media-type)=["']${escapedUrl}["']`).test(htmlInput);
            });

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
                let convertedHTML = this.convertUrlToHTML({
                    url,
                    proxy,
                    media,
                    htmlInput
                });

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
                               data-original-url="${ChatTools.Sanitize.stripHTML(url)}"
                               href="${ChatTools.Sanitize.stripHTML(url)}" ${url.startsWith(location.origin) ? "" : 'target="_blank"'}>
                                <span class="meta-info title">
                                    ${urlMeta?.meta?.title ? ChatTools.Sanitize.stripHTML(ChatTools.Sanitize.truncateText(urlMeta.meta.title, 75)) : ""}
                                </span>
                                <span class="meta-info description">
                                    ${urlMeta?.meta?.description ? ChatTools.Sanitize.stripHTML(ChatTools.Sanitize.truncateText(urlMeta.meta.description, 300)) : ""}
                                </span>
                            </a>
                        </div>`;

                    htmlInput = htmlInput.replace(url, embed);
                    changed = true;
                    continue;
                }

                // fallback to make it a clickable link
                htmlInput = htmlInput.replace(url,
                    `<a draggable="false" data-media-type="link" data-message-id="${ChatTools.Sanitize.stripHTML(identifier)}" href="${ChatTools.Sanitize.stripHTML(url)}" ${url.startsWith(location.origin) ? "" : "target=\"_blank\""}> ${ChatTools.Sanitize.unescapeHtmlEntities(ChatTools.Sanitize.forRender(url))} </a>`
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
                         src="${ChatTools.Sanitize.stripHTML(proxy)}"
                         data-original-url="${ChatTools.Sanitize.stripHTML(url)}"
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
                        src="${ChatTools.Sanitize.stripHTML(proxy)}"
                        data-original-url="${ChatTools.Sanitize.stripHTML(url)}"
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
                    <p>${ChatTools.Sanitize.stripHTML(filename)}</p>
                    <audio
                        controls
                        preload="metadata"
                        src="${ChatTools.Sanitize.stripHTML(src)}">
                    </audio>
                </div>
            `;
        }
    }

    static Sanitize = class {
        static _hooksInstalled = false;
        static SANITIZE_OPTIONS = {
            ALLOWED_TAGS: [
                'div',
                'source',
                'video',
                'audio',
                'span',
                'p',
                'br',
                'b',
                'i',
                'u',
                's',
                'a',
                'ul',
                'ol',
                'li',
                'h1',
                'h2',
                'h3',
                'pre',
                'code',
                "label",
                'blockquote',
                'strong',
                "details",
                "summary",
                'em',
                'img',
                'mark',
                "button",
                "iframe" // needed for embeds
            ]
            ,

            ALLOWED_ATTR: [
                'href',
                'target',
                'rel',
                'src',
                'alt',
                'class',
                //'style', // needs to be removed but with testing
                'data-id',
                'controls',
                'title',
                'data-member-id',
                'data-message-id'
            ],

            //ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            //ALLOW_DATA_ATTR: false,
            //FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
        };

        static stripHTML(html) {
            if(typeof html === "object") return;
            if(Array.isArray(html)) return;
            if (html == null) return '';
            return DOMPurify.sanitize(String(html), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        }
        static forRender(html, wrapParagraphs = false) {
            if (html == null) return '';

            this.installDomPurifyHooks();
            let clean = DOMPurify.sanitize(String(html), this.SANITIZE_OPTIONS);

            if (wrapParagraphs) {
                clean = `<p>${clean}</p>`;
            }

            return clean.trim();
        }

        static encodePlainText(s) {
            return String(s || '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        }

        static unescapeHtmlEntities(str, raw = false) {
            if (str == null) return '';

            if(raw === true){
                const txt = document.createElement('textarea');
                txt.innerHTML = DOMPurify.sanitize(String(str), this.SANITIZE_OPTIONS);
                return txt.value;
            }

            const txt = document.createElement('label');
            txt.innerHTML = DOMPurify.sanitize(String(str), this.SANITIZE_OPTIONS);
            let unescaped = txt.textContent;

            const div = document.createElement('div');
            div.innerHTML = DOMPurify.sanitize(unescaped, this.SANITIZE_OPTIONS);
            return div.textContent || "";
        }

        static installDomPurifyHooks() {
            if (this._hooksInstalled || !window.DOMPurify) return;
            this._hooksInstalled = true;

            DOMPurify.addHook('afterSanitizeAttributes', (node) => {
                if (node.tagName === 'A') {
                    node.setAttribute('target', '_blank');
                    node.setAttribute('rel', 'noopener noreferrer nofollow');

                    const href = (node.getAttribute('href') || '').toLowerCase().trim();
                    if (href.startsWith('javascript:') || href.startsWith('data:') || href.startsWith('vbscript:')) {
                        node.removeAttribute('href');
                    }
                }

                if (node.tagName === 'IMG') {
                    const src = (node.getAttribute('src') || '').toLowerCase().trim();
                    if (src.startsWith('javascript:') || src.startsWith('data:') || src.startsWith('vbscript:')) {
                        node.remove();
                    }
                }
            });
        }

        static normalizeVar(v) {
            if (v === null || v === undefined) return null;

            if (typeof v === "string") {
                const val = v.trim().toLowerCase();

                if (val === "true") return true;
                if (val === "false") return false;
                if (val === "null" || val === "undefined" || val === "") return null;

                if (/^-?\d+(\.\d+)?$/.test(val)) {
                    if (val.length < 10) {
                        return Number(val);
                    }
                }
            }

            return String(v);
        }

        static truncateText(text, length) {
            text = String(text || "");
            if (text.length <= length) return text;
            return text.substr(0, length) + "\u2026";
        }

        static truncateHTML(html, length, wrapParagraphs = false) {
            html = String(html || "");
            if (html.length <= length) return html;

            // so this is different in a way that we try to truncate only the text
            // inside the html and ignore text like <tag> so its truly just the text
            let tempDom = document.createElement('div');
            tempDom.innerHTML = this.forRender(html, wrapParagraphs);

            // and this will be the small logic to either display "..." or not
            let addCutoff = tempDom.textContent?.length > length;
            tempDom.textContent = html.substr(0, length) + `${addCutoff ? "\u2026" : ""}`

            return tempDom.innerHTML;
        }
    }

    static Dom = class {
        static findAttributeUp(element, attr, maxDepth = 10) {
            if(!element) throw new Error('element is required');
            
            for (let i = 0; i <= maxDepth && element; i++) {
                const val = element.getAttribute?.(attr);
                if (val !== null) return val;
                element = element.parentNode;
            }
            return null;
        }

        static async waitForFrame(){
            return new Promise(resolve => requestAnimationFrame(resolve));
        }

        static async renderAfterExecution(element, callback, transition = 150){
            if(!element) throw new Error('element not found');
            if(!callback) throw new Error('callback not found');

            await this.hideElement(element, transition);
            await callback();
            await this.showElement(element, transition);
        }

        static async hideElement(element, transition = 150){
            if(!element) throw new Error('element not found');
            element.style.transition = `opacity ${transition}ms ease`;
            element.style.opacity = "0";

            await new Promise(resolve => {
                setTimeout(resolve, transition);
            });
        }

        static async showElement(element, transition = 150){
            if(!element) throw new Error('element not found');
            element.style.transition = `opacity ${transition}ms ease`;

            await this.waitForFrame();
            element.style.opacity = "1";

            await new Promise(resolve => {
                setTimeout(resolve, transition);
            });
        }

    }
}
