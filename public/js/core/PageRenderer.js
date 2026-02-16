class PageRenderer {
    static #page = null;
    static #container = null;
    static #syncRAF = null;
    static #allowGrow = false;

    static Element(){
        return this.#page
    }

    static async renderHTML(container, html, allowGrow = false) {
        if (this.#page) await this.remove();

        this.#container = container;
        this.#allowGrow = allowGrow;

        const el = document.createElement("div");
        el.classList.add("page-renderer");
        this.#page = el;

        const bg = getComputedStyle(container).background;
        const isTransparent = (c) =>
            c === "transparent" || c.includes("rgba(0, 0, 0, 0)");

        if (isTransparent(bg)) el.style.backgroundColor = "hsl(from var(--main) h s calc(l * 1.25))";
        else el.style.background = bg;

        el.style.position = "fixed";
        el.style.opacity = "0";
        el.style.transform = "translateX(40px)";
        el.style.transition = "opacity 220ms ease, transform 220ms ease";
        el.style.zIndex = "10";
        el.style.overflow = "auto";

        el.innerHTML = html;
        document.body.appendChild(el);

        this.#sync();
        el.getBoundingClientRect();

        el.style.opacity = "1";
        el.style.transform = "translateX(0)";

        return el;
    }

    static #sync() {
        if (!this.#page || !this.#container) return;

        const el = this.#page;
        const rect = this.#container.getBoundingClientRect();

        const viewportTop = Math.max(rect.top, 0);
        const viewportBottom = Math.min(rect.bottom, window.innerHeight);
        const visibleHeight = Math.max(0, viewportBottom - viewportTop);

        el.style.left = rect.left + "px";
        el.style.top = viewportTop + "px";
        el.style.width = rect.width + "px";

        if (visibleHeight === 0) {
            el.style.height = "auto";
            el.style.maxHeight = (window.innerHeight - rect.top) + "px";
        } else {
            el.style.height = visibleHeight + "px";
            el.style.maxHeight = visibleHeight + "px";
        }

        this.#syncRAF = requestAnimationFrame(() => this.#sync());
    }



    static async remove() {
        if (!this.#page) return;

        cancelAnimationFrame(this.#syncRAF);

        const el = this.#page;
        this.#page = null;
        this.#container = null;

        el.style.opacity = "0";
        el.style.transform = "translateX(-40px)";

        await new Promise(r => setTimeout(() => {
            el.remove();
            r();
        }, 220));
    }
}
