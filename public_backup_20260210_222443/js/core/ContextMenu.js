class ContextMenu {

    static events = [];
    static scope = document.body

    static clickEvents = {}
    static dblclickEvents = {}
    static contextMenus = {};
    static ContextMenuHTML = null;

    static matchesSelector(el, sel){
        let match = el.matches(sel) || el.closest(sel);
        if (!match && sel.startsWith(".") && sel.includes(".")) {
            const classes = sel.slice(1).split(".");
            match = classes.every(c => el.classList.contains(c));
        }
        if (!match && sel === "body") match = el === document.body;
        return match;
    }

    static init() {
        ContextMenu.scope = document.body;
        this.ContextMenuHTML = document.getElementById("context-menu");

        ContextMenu.scope.addEventListener("click", (event) => {
            const {clientX: mouseX, clientY: mouseY} = event;
            const el = event.target;

            if (el.offsetParent !== this.ContextMenuHTML) {
                this.hideContextMenu();
            }

            Object.entries(this.clickEvents).forEach(([_, {elements, callback, condition}]) => {
                elements.forEach(async sel => {
                    if (this.matchesSelector(el, sel)) {
                        el.style.cursor = "pointer";
                        const ctx = {element: el, X: mouseX, Y: mouseY, event};
                        if (!condition || (await condition(ctx)) === true) await callback(ctx);
                    }
                });
            });
        });

        ContextMenu.scope.addEventListener("dblclick", (event) => {
            const el = event.target;

            Object.entries(this.dblclickEvents).forEach(([_, {elements, callback, condition}]) => {
                elements.forEach(async sel => {
                    if (this.matchesSelector(el, sel)) {
                        const ctx = {element: el, event};
                        if (!condition || (await condition(ctx)) === true) await callback(ctx);
                    }
                });
            });
        });

        ContextMenu.scope.addEventListener("contextmenu", async (event) => {
            event.preventDefault();

            const {clientX: mouseX, clientY: mouseY} = event;
            const el = document.elementFromPoint(mouseX, mouseY);
            for (const {elements, items} of Object.values(this.contextMenus)) {
                for (const sel of elements) {
                    if (this.matchesSelector(el, sel)) {
                        this.resetContextMenuItem();

                        for (const {text, callback, condition, type, icon} of items) {
                            const ctx = {element: el};
                            if (!condition || (await condition(ctx)) === true)
                                await this.displayContextMenuItem(text, callback, el, type, icon);
                        }

                        this.showContextMenu(mouseY, mouseX);
                        return;
                    }
                }
            }
        });
    }

    static registerClickEvent(name, elements, callback, condition){
        this.clickEvents[name] = {elements, callback, condition};
    }

    static registerDoubleClickEvent(name, elements, callback, condition){
        this.dblclickEvents[name] = {elements, callback, condition};
    }

    static registerContextMenu(name, elements, items) {
        this.contextMenus[name] = {elements, items};
    }

    static resetContextMenuItem() {
        document.getElementById("context-menu").innerHTML = "";
    }

    static async displayContextMenuItem(displayname, callback = null, clickedElement = null, itemType = null, icon = null) {
        let item = document.createElement("div");
        item.classList.add("item");
        item.innerHTML = icon ? `<label class="icon">${icon}</label>${displayname}` : displayname;
        item.onclick = async () => {
            if (callback) await callback({element: clickedElement});
            this.hideContextMenu();
        };

        if (itemType) {
            switch (itemType) {
                case "success":
                    item.classList.add("context-item-success");
                    break;
                case "error":
                    item.classList.add("context-item-error");
                    break;
                case "warning":
                    item.classList.add("context-item-warning");
                    break;
                case "ok":
                    item.classList.add("context-item-ok");
                    break;
            }
        }

        this.ContextMenuHTML.appendChild(item);
    }

    static showContextMenu(mouseY, mouseX) {
        if ((this.ContextMenuHTML.offsetHeight * 4) + mouseY > document.body.offsetHeight) {
            this.ContextMenuHTML.style.top = `${mouseY - this.ContextMenuHTML.offsetHeight}px`;
            this.ContextMenuHTML.style.left = `${mouseX}px`;
        } else {
            this.ContextMenuHTML.style.top = `${mouseY}px`;
            this.ContextMenuHTML.style.left = `${mouseX}px`;
        }

        this.ContextMenuHTML.classList.add("visible");
    }

    static hideContextMenu() {
        this.ContextMenuHTML.classList.remove("visible");
    }
}
