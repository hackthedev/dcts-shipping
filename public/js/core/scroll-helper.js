document.addEventListener("DOMContentLoaded", async () => {

    const container = document.getElementById("content");
    let savedHeight = 0;

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {

            if(container.scrollHeight !== savedHeight){
                let diff = container.scrollHeight - savedHeight;
                console.log(diff)

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


function watchMediaLoads(container = document.getElementById("content")) {


    /*
    if (!container) return
    if (container._mediaCleanup) container._mediaCleanup()

    let anchor = null
    let pendingCorrection = null

    function findAnchor() {
        let rect = container.getBoundingClientRect()

        for (let child of container.children) {
            let r = child.getBoundingClientRect()

            if (r.bottom > rect.top) {
                return { el: child, offset: r.top - rect.top }
            }
        }

        return null
    }

    function correct() {
        if (!anchor || !anchor.el.isConnected || container._scrollLocked) return

        let rect = container.getBoundingClientRect()
        let now = anchor.el.getBoundingClientRect().top - rect.top
        let drift = now - anchor.offset

        if (Math.abs(drift) < 1) return

        container.style.scrollBehavior = "auto"
        container.scrollTop += drift
    }

    function scheduleCorrection() {
        if (container._scrollLocked) return

        if (pendingCorrection) cancelAnimationFrame(pendingCorrection)

        pendingCorrection = requestAnimationFrame(() => {
            pendingCorrection = null
            correct()
        })
    }

    container.addEventListener("scroll", () => {
        if (container._scrollLocked) return
        if (pendingCorrection) return

        anchor = findAnchor()
    }, { passive: true })

    anchor = findAnchor()

    let ro = new ResizeObserver(() => scheduleCorrection())

    function observe(el) {
        if (el.hasAttribute("data-watched")) return
        el.setAttribute("data-watched", "true")
        ro.observe(el)
    }

    function scan() {
        for (let el of container.querySelectorAll(".message-container:not([data-watched])")) {
            observe(el)
        }
    }

    scan()

    let mo = new MutationObserver(mutations => {
        let added = false

        for (let m of mutations) {
            if (m.addedNodes.length) { added = true; break }
        }

        if (!added) return

        scan()
        scheduleCorrection()
    })

    mo.observe(container, { childList: true, subtree: true })

    container._mediaCleanup = () => {
        ro.disconnect()
        mo.disconnect()
        if (pendingCorrection) cancelAnimationFrame(pendingCorrection)
        delete container._mediaCleanup
        delete container._scrollLocked
    }

     */
}
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