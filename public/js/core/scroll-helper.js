function watchMediaLoads(container = document.getElementById("content")) {
    if (!container) return console.log("no container")
    if (container._mediaCleanup) container._mediaCleanup()

    let anchor = null
    let skipScroll = false
    let pendingCorrection = null

    function findAnchor() {
        let scrollTop = container.scrollTop
        let rect = container.getBoundingClientRect()

        for (let child of container.children) {
            if (child.offsetTop + child.offsetHeight > scrollTop) {
                return {
                    el: child,
                    offset: child.getBoundingClientRect().top - rect.top
                }
            }
        }
        return null
    }

    function correct() {
        if (!anchor || !anchor.el.isConnected) return

        if (container._scrollLocked) {
            anchor = findAnchor()
            return
        }

        let rect = container.getBoundingClientRect()
        let currentOffset = anchor.el.getBoundingClientRect().top - rect.top
        let drift = currentOffset - anchor.offset

        if (Math.abs(drift) < 1) return

        skipScroll = true
        toggleSmoothScroll(container, false)
        container.scrollTop += drift
        toggleSmoothScroll(container, true)
        anchor.offset = anchor.el.getBoundingClientRect().top - rect.top
    }

    function scheduleCorrection() {
        if (pendingCorrection || container._scrollLocked) return
        pendingCorrection = requestAnimationFrame(() => {
            pendingCorrection = null
            correct()
        })
    }

    container.addEventListener("scroll", () => {
        if (container._scrollLocked) return

        if (skipScroll) {
            skipScroll = false
            return
        }

        anchor = findAnchor()
    }, { passive: true })

    anchor = findAnchor()

    let ro = new ResizeObserver(() => correct())

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
}

async function withScrollLock(container = document.getElementById("content"), refEl, callback) {
    container._scrollLocked = true
    toggleSmoothScroll(container, false)

    let pos = getScrollPosition(container, refEl)
    let heightBefore = container.scrollHeight

    if (callback) await callback()

    if (typeof pos === "number") {
        container.scrollTop = pos + (container.scrollHeight - heightBefore)
    } else {
        setScrollPosition(container, pos)
    }

    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)

    if (typeof pos === "number") {
        container.scrollTop = pos + (container.scrollHeight - heightBefore)
    } else {
        setScrollPosition(container, pos)
    }

    toggleSmoothScroll(container, true)
    container._scrollLocked = false
}
function setScrollPosition(container, info) {
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
    if (!refEl) return container.scrollTop

    let cTop = container.getBoundingClientRect().top
    let rTop = refEl.getBoundingClientRect().top

    return {
        ref: refEl,
        offset: rTop - cTop
    }
}

function toggleSmoothScroll(element = document.getElementById("content"), toggle) {
    element.style.scrollBehavior = toggle ? "smooth" : "auto"
}