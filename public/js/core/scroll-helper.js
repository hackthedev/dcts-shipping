document.addEventListener("DOMContentLoaded", async () => {

    const container = document.getElementById("content");
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
})


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