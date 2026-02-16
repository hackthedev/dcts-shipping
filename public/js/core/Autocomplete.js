class Autocomplete {
    constructor(anchorElement, options = {}) {
        this.anchor = anchorElement;
        this.entries = [];
        this.filtered = [];
        this.index = -1;

        this.offsetX = options.offsetX || 0;
        this.offsetY = options.offsetY || 0;
        this.maxHeight = (options.maxHeight || 200);

        this.bg = options.bg || "#24292E";
        this.color = options.color || "white";
        this.borderColor = options.borderColor || "#60676e";
        this.highlightBg = options.highlightBg || "#3a3f45";
        this.highlightColor = options.highlightColor || this.color;
        this.entryPadding = options.entryPadding || "8px";

        this.container = document.createElement("div");
        this.container.style.position = "absolute";
        this.container.style.zIndex = "1000";
        this.container.style.background = this.bg;
        this.container.style.color = this.color;
        this.container.style.border = "1px solid " + this.borderColor;
        this.container.style.overflowY = "auto";
        this.container.style.maxHeight = this.maxHeight + "px";
        this.container.style.display = "none";
        this.container.style.pointerEvents = "auto";
        document.body.appendChild(this.container);

        window.addEventListener("resize", () => this.updatePosition());
    }

    addEntry(label, data = {}, html = null) {
        this.entries.push({ label, data, html });
    }

    removeEntry(label) {
        this.entries = this.entries.filter(e => e.label !== label);
    }

    filterEntries(term) {
        return this.entries.filter(e =>
            e?.label?.toLowerCase().includes(term.toLowerCase())
        );
    }

    clear() {
        this.entries = [];
        this.filtered = [];
        this.index = -1;
        this.container.innerHTML = "";
        this.hide();
    }

    showFiltered(term) {
        if (this.hiddenBySelect) return;
        this.filtered = this.filterEntries(term);
        this.index = this.filtered.length > 0 ? 0 : -1;
        this.render();
    }


    onKey(e) {
        if (this.container.style.display === "none") return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            this.move(1);
        }
        else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.move(-1);
        }
        else if (e.key === "Enter") {
            if (this.index >= 0) {
                e.preventDefault();
                this.anchor.focus();
                this.select(this.filtered[this.index]);
            }
        }
        else if (e.key === "Tab") {
            if (this.index >= 0) {
                e.preventDefault();
                this.anchor.focus();
                this.select(this.filtered[this.index]);
            }
        }
    }

    move(dir) {
        if (this.filtered.length === 0) return;

        this.index += dir;

        if (this.index < 0) this.index = this.filtered.length - 1;
        if (this.index >= this.filtered.length) this.index = 0;

        this.highlight();
    }

    highlight() {
        const children = [...this.container.children];

        children.forEach((c, i) => {
            if (i === this.index) {
                c.style.background = this.highlightBg;
                c.style.color = this.highlightColor;
            } else {
                c.style.background = "transparent";
                c.style.color = this.color;
            }
        });

        if (this.index < 0) return;

        const active = children[this.index];
        if (!active) return;

        const cTop = active.offsetTop;
        const cBottom = cTop + active.offsetHeight;
        const viewTop = this.container.scrollTop;
        const viewBottom = viewTop + this.container.clientHeight;

        if (cTop < viewTop) this.container.scrollTop = cTop;
        else if (cBottom > viewBottom) this.container.scrollTop = cBottom - this.container.clientHeight;
    }

    select(item) {
        this.hiddenBySelect = true;
        this.hide();
        if (this.onSelect) this.onSelect(item);
        setTimeout(() => this.hiddenBySelect = false, 50);
    }

    render() {
        this.container.innerHTML = "";

        if (this.filtered.length === 0) {
            this.hide();
            return;
        }

        this.filtered.forEach((item) => {
            const div = document.createElement("div");
            div.style.padding = this.entryPadding;
            div.style.cursor = "pointer";
            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.gap = "8px";
            div.style.background = "transparent";
            div.style.color = this.color;
            div.innerHTML = item.html || item.label;

            div.addEventListener("mousedown", ev => {
                ev.preventDefault();
                this.anchor.focus();
                this.select(item);
            });

            this.container.appendChild(div);
        });

        this.show();
        this.highlight();
    }

    updatePosition() {
        const rect = this.anchor.getBoundingClientRect();
        const height = this.container.offsetHeight;

        const top = (rect.top + window.scrollY) - height + this.offsetY;
        const left = rect.left + window.scrollX + this.offsetX;

        this.container.style.top = top + "px";
        this.container.style.left = left + "px";
        this.container.style.width = rect.width + "px";
    }

    show() {
        this.container.style.display = "block";
        this.updatePosition();
    }

    hide() {
        this.container.style.display = "none";
    }
}
