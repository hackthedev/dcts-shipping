class ContextMenu {

    static events = [];
    static scope = document.body

    static clickEvents = {}
    static dblclickEvents = {}
    static contextMenus = {};
    static ContextMenuHTML = null;

    static injectCSS() {
        let contextMenuHTML = document.getElementById("context-menu");
        if(!contextMenuHTML){
            contextMenuHTML = document.createElement("div");
            contextMenuHTML.id = "context-menu";
            document.body.appendChild(contextMenuHTML);
        }


        if(document.querySelector("#context-menu-css")) return;

        const style = document.createElement("div");
        style.id = "context-menu-css";
        document.body.appendChild(style);


        style.innerHTML = `      
        <style>     
            #context-menu {
                position: fixed;
                z-index: 200;
                width: fit-content;
                border-radius: 6px;
                display: none;
            
                backdrop-filter: blur(6px);
                overflow: hidden;
            }
            
            #context-menu .item {
                font-size: 12px !important;
                color: #eee;
                cursor: pointer;
                padding: 8px;
                opacity: 1;
                filter: none;
            }
            
            #context-menu .item:hover {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 2px;
            }
            
            #context-menu.visible {
                display: block;
            }
            
            #context-menu label.icon {
                display: inline-block;
                height: 100%;
                margin-right: 10px;
                margin-top: auto;
                margin-bottom: auto;
            }
            #context-menu .item.context-item-success {
                color: rgba(135, 222, 84, 1);
            }
            
            #context-menu .item.context-item-success:hover {
                background-color: rgba(75, 161, 53, 0.5);
                color: white;
            }
            
            #context-menu .item.context-item-error {
                color: #eb5055;
            }
            
            #context-menu .item.context-item-error:hover {
                background-color: rgba(235, 80, 85, 0.5);
                color: white;
            }
            
            #context-menu .item.context-item-ok {
                color: #5d7fe3;
            }
            
            #context-menu .item.context-item-ok:hover {
                background-color: rgba(93, 127, 227, 0.5);
                color: white;
            }
            
            #context-menu .item.context-item-warning {
                color: orange;
            }
            
            #context-menu .item.context-item-warning:hover {
                background-color: rgba(255, 165, 0, 0.5);
                color: white;
            }
        </style>
        `
    }

    static matchesSelector(el, sel){
        let match = el.matches(sel) || el.closest(sel);
        if (!match && sel.startsWith(".") && sel.includes(".")) {
            const classes = sel.slice(1).split(".");
            match = classes.every(c => el.classList.contains(c));
        }
        if (!match && sel === "body") match = el === document.body;
        return match;
    }

    static insertSeparator() {
        const hr = document.createElement("hr");
        this.ContextMenuHTML.appendChild(hr);
    }


    static init() {
        ContextMenu.scope = document.body;
        this.injectCSS()
        this.ContextMenuHTML = document.getElementById("context-menu");


        ContextMenu.scope.addEventListener("click", (event) => {
            const {clientX: mouseX, clientY: mouseY} = event;
            const el = event.target;
            if(this.ContextMenuHTML.contains(el)) return;

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
            if(this.ContextMenuHTML.contains(el)) return;

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

            const { clientX: mouseX, clientY: mouseY } = event;
            const el = document.elementFromPoint(mouseX, mouseY);
            if (this.ContextMenuHTML.contains(el)) return;

            this.resetContextMenuItem();

            const groups = [];

            for (const { elements, items } of Object.values(this.contextMenus)) {
                let matched = false;

                for (const sel of elements) {
                    if (this.matchesSelector(el, sel)) {
                        matched = true;
                        break;
                    }
                }
                if (!matched) continue;

                const validItems = [];

                for (const item of items) {
                    const ctx = { element: el };
                    if (!item.condition || (await item.condition(ctx)) === true) {
                        validItems.push(item);
                    }
                }

                if (validItems.length) {
                    groups.push(validItems);
                }
            }

            if (!groups.length) return;

            // render this shit
            let first = true;
            for (const group of groups) {
                if (!first) {
                    const hr = document.createElement("hr");
                    hr.style.margin = "4px 0";
                    hr.style.border = "none";
                    hr.style.borderTop = "1px solid rgba(255,255,255,0.15)";
                    this.ContextMenuHTML.appendChild(hr);
                }
                first = false;

                for (const { text, callback, type, icon } of group) {
                    await this.displayContextMenuItem(text, callback, el, type, icon);
                }
            }

            this.showContextMenu(mouseY, mouseX);
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
        const menu = this.ContextMenuHTML;

        menu.style.top = "0px";
        menu.style.left = "0px";
        menu.classList.add("visible");

        const menuHeight = menu.offsetHeight;
        const menuWidth = menu.offsetWidth;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let top = mouseY;
        let left = mouseX + Number(14);

        if (top + menuHeight > vh) {
            top = mouseY - menuHeight;
        }

        if (left + menuWidth > vw) {
            left = vw - menuWidth - 4;
        }

        if (top < 0) top = 4;
        if (left < 0) left = 4;

        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
    }


    static hideContextMenu() {
        this.ContextMenuHTML.classList.remove("visible");
    }
}
