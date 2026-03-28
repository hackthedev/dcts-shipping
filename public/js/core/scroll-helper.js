function observeContainer() {
    let container = getContentMainContainer();
    let savedHeight = 0;

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {

            if(container.scrollHeight !== savedHeight){
                let diff = container.scrollHeight - savedHeight;

                toggleSmoothScroll(container, false)
                container.scrollTop += diff;
                toggleSmoothScroll(container, true)
                savedHeight = container.scrollHeight;
            }
        }
    });

    const observeNode = (node) => {
        if (node.nodeType !== 1) return;
        resizeObserver.observe(node);
        for (const child of node.querySelectorAll("*")) {
            resizeObserver.observe(child);
        }
    };

    observeNode(container);

    // for other fucking elements
    new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) observeNode(node);
        }
    }).observe(container, { childList: true, subtree: true });
}

function getContentMainContainer(){
    let container = document.getElementById("content");
    if(!container) container = document.querySelector(".layout.home > .content .dm-container > .content");
    return container
}

function watchMediaLoads(container = document.getElementById("content")) {}
async function withScrollLock(container = document.getElementById("content"), refEl, callback) {
    if (callback) await callback()
}

function setScrollPosition(container, info) {
    if(!container) throw new Error("Could not set scroll position because container not set")
    if (typeof info === "number") {
        container.scrollTop = info
        return
    }

    if (!info?.ref || !info.ref.isConnected) return

    let cTop = container.getBoundingClientRect().top
    let rTop = info.ref.getBoundingClientRect().top

    let diff = (rTop - cTop) - info.offset
    container.scrollTop += diff
}

function getScrollPosition(container, refEl) {
    if(!container) throw new Error("Could not find scroll position because container not set")
    if (!refEl) return container.scrollTop

    let cTop = container.getBoundingClientRect().top
    let rTop = refEl.getBoundingClientRect().top

    return {
        ref: refEl,
        offset: rTop - cTop
    }
}

function toggleSmoothScroll(element = document.getElementById("content"), toggle) {
    if(!element) throw new Error("Could not toggle smooth scroll container not set")
    element.style.scrollBehavior = toggle ? "smooth" : "auto"
}

function isScrolledToBottom(element, tolerancePx = 100) {
    if(!element) throw new Error("no element provoded in isScrollToBottom");
    if(!element?.scrollHeight) return true;
    const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
    return (maxTop - element.scrollTop) <= tolerancePx;
}

function scrollDown(functionCaller, opts = {}) {
    const el = getContentMainContainer();
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
        const bottomOk = isScrolledToBottom(el, tolerancePx);
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

    if (functionCaller) console.log(`ScrollDown called by ${functionCaller}`);
}

document.addEventListener("DOMContentLoaded", observeContainer);