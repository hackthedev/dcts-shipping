function watchMediaLoads(container = document.getElementById("content")) {
    if (!container) return console.log("no container")

    let media = container.querySelectorAll(
        "img:not(.icon):not(.memberlist-img):not([data-media-watched]), " +
        "video:not([data-media-watched]), " +
        "audio:not([data-media-watched]), " +
        "iframe:not([data-media-watched])"
    )

    for (let el of media) {
        if (el.tagName === "IMG" && el.complete && el.naturalHeight !== 0) continue
        if ((el.tagName === "VIDEO" || el.tagName === "AUDIO") && el.readyState >= 1) continue

        el.setAttribute("data-media-watched", "true")

        let heightBefore = el.offsetHeight

        let adjust = function () {
            let newHeight = el.offsetHeight
            let grew = newHeight - heightBefore
            if (grew <= 0) return

            if (el.getBoundingClientRect().top < container.getBoundingClientRect().top) {
                toggleSmoothScroll(container, false)
                container.scrollTop += grew
                toggleSmoothScroll(container, true)
            }

            heightBefore = newHeight
        }

        if (el.tagName === "IMG") {
            el.addEventListener("load", adjust, { once: true })
        } else if (el.tagName === "VIDEO" || el.tagName === "AUDIO") {
            el.addEventListener("loadedmetadata", adjust, { once: true })
        } else if (el.tagName === "IFRAME") {
            el.addEventListener("load", adjust, { once: true })
        }
    }
}

async function withScrollLock(container = document.getElementById("content"), refEl, callback) {
    toggleSmoothScroll(container, false)

    let pos = getScrollPosition(container, refEl)

    if (callback) await callback()

    await new Promise(requestAnimationFrame)

    setScrollPosition(container, pos)

    toggleSmoothScroll(container, true)
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
function toggleSmoothScroll(element = document.getElementById("content"), toggle){
    if(toggle === true){
        element.style.scrollBehavior = "smooth";
    }
    else{
        element.style.scrollBehavior = "auto";
    }
}
