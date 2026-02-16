class RichEditor {
    constructor({
                    selector,
                    placeholder = "Write something…",
                    onSend = null,
                    onImg = null,
                    toolbar = [
                        ["bold", "italic", "underline"],
                        ["code-block", "link"]
                    ]
                }) {
        this.hostSelector = selector;
        this.placeholder = placeholder;
        this.onSend = onSend;
        this.onImg = onImg;
        this.toolbar = toolbar;

        this.init();
    }

    init() {
        const Delta = Quill.import("delta");

        const host = document.querySelector(this.hostSelector);
        if (!host) return;

        host.innerHTML = "";

        this.wrapper = document.createElement("div");
        this.wrapper.className = "rich-editor";

        this.toolbarEl = document.createElement("div");
        this.toolbarEl.className = "ql-toolbar ql-snow";

        this.editorEl = document.createElement("div");
        this.editorEl.className = "editor";

        this.wrapper.appendChild(this.toolbarEl);
        this.wrapper.appendChild(this.editorEl);
        host.appendChild(this.wrapper);

        this.renderToolbar();

        hljs.configure({
                           languages: ["javascript","python","ruby","xml","json","css","bash"]
                       });

        this.quill = new Quill(this.editorEl, {
            theme: "snow",
            placeholder: this.placeholder,
            modules: {
                syntax: true,
                toolbar: {
                    container: this.toolbarEl,
                    handlers: {
                        link: value => {
                            if (!value) return this.quill.format("link", false);
                            const href = prompt("Enter the URL");
                            if (href) this.quill.format("link", href);
                        }
                    }
                },
                keyboard: {
                    bindings: {
                        enter: {
                            key: 13,
                            handler: () => false
                        }
                    }
                }
            }
        });

        this.quill.clipboard.addMatcher("img", (node, delta) => {
            const src = node.getAttribute("src");
            if (this.onImg) {
                this.onImg(src, {
                    insert: url => this.insertImage(url)
                });
                return new Delta();
            }
            return delta;
        });

        this.quill.on("text-change", (d, o, source) => {
            if (source === "user") this.highlightCode();
        });

        this.bindSend();
    }

    renderToolbar() {
        this.toolbarEl.innerHTML = "";

        this.toolbar.forEach(group => {
            const span = document.createElement("span");
            span.className = "ql-formats";

            group.forEach(item => {
                const btn = document.createElement("button");
                btn.className = `ql-${item}`;
                span.appendChild(btn);
            });

            this.toolbarEl.appendChild(span);
        });
    }

    insertImage(url) {
        const range = this.quill.getSelection(true);
        this.quill.insertEmbed(range.index, "image", url, "user");
        this.quill.setSelection(range.index + 1);
    }

    highlightCode() {
        this.quill.root
            .querySelectorAll("pre code")
            .forEach(b => hljs.highlightElement(b));
    }

    bindSend() {
        this.quill.root.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.onSend?.(this.getHTML());
            }
        });
    }

    getHTML() {
        return this.quill.root.innerHTML;
    }

    getTrim() {
        return this.quill.root.innerText.trim().length === 0
            ? null
            : this.quill.root.innerText.trim();
    }

    getElement() {
        return this.wrapper;
    }


    focus() {
        this.quill.focus();
        const len = this.quill.getLength();
        this.quill.setSelection(len - 1, 0, Quill.sources.SILENT);
    }

    clear() {
        this.quill.setText("");
    }

    destroy() {
        this.wrapper.remove();
        this.quill = null;
    }
}
