class ContextMenu {

    static events = [];
    static scope = document.body

    static clickEvents = {}
    static contextMenus = {};
    static ContextMenuHTML = null;

    static init() {
        ContextMenu.scope = document.body;
        this.ContextMenuHTML = document.getElementById("context-menu");

        ContextMenu.scope.addEventListener("click", (event) => {

            const {clientX: mouseX, clientY: mouseY} = event;
            var clickedElement = event.target

            if (event.target.offsetParent !== this.ContextMenuHTML) {
                this.hideContextMenu()
            }

            Object.keys(this.clickEvents).forEach(key => {
                let clickEvent = this.clickEvents[key];
                let clickEventCondition = clickEvent.condition;
                let clickEventCallback = clickEvent.callback;
                let clickElements = clickEvent.elements;

                clickElements.forEach(async element => {
                    let elementId = element.substring(1, element.length);
                    let elementType = null;

                    if (element.startsWith(".")) elementType = "class"
                    if (element.startsWith("#")) elementType = "id"

                    let didMatch = false;

                    // selector flag
                    if (element.includes(" ")) {
                        if (clickedElement.closest(element)) didMatch = true;
                    }

                    if (
                        (elementType === "class" && clickedElement?.classList.contains(elementId)) ||
                        (elementType === "id" && clickedElement?.id === elementId) ||
                        didMatch === true
                    ) {
                        // some small nice addition
                        clickedElement.style.cursor = "pointer";

                        if(clickEventCondition && clickEventCallback){
                            if(await clickEventCondition({element: clickedElement, X: mouseX, Y: mouseY}) === true) clickEventCallback({element: clickedElement, X: mouseX, Y: mouseY, event});
                        }
                        else{
                            if(clickEventCallback) await clickEventCallback({element: clickedElement, X: mouseX, Y: mouseY, event});
                        }
                    }
                })

            });
        });

        ContextMenu.scope.addEventListener("contextmenu", async (event) => {
            event.preventDefault();

            const {clientX: mouseX, clientY: mouseY} = event;
            var clickedElement = document.elementFromPoint(mouseX, mouseY);

            for (const key of Object.keys(this.contextMenus)) {
                let contextMenuElements = this.contextMenus[key].elements;

                for (const element of contextMenuElements) {
                    let elementId = element.substring(1);
                    let elementType = null;

                    if (element.startsWith(".")) elementType = "class";
                    if (element.startsWith("#")) elementType = "id";

                    let didMatch = false;
                    if (element.includes(" ")) {
                        if (clickedElement.matches(element)) didMatch = true;
                    }


                    if (
                        (elementType === "class" && clickedElement?.classList.contains(elementId)) ||
                        (elementType === "id" && clickedElement?.id === elementId) ||
                        didMatch === true
                    ) {
                        let contextMenuItems = this.contextMenus[key].items;
                        this.resetContextMenuItem();

                        for (const item of contextMenuItems) {
                            let itemText = item.text;
                            let itemCallback = item.callback;
                            let itemCondition = item.condition;
                            let itemType = item.type;
                            let itemIcon = item.icon;

                            if (itemCondition) {
                                if (await itemCondition({ element: clickedElement }) === true) {
                                    await this.displayContextMenuItem(itemText, itemCallback, clickedElement, itemType, itemIcon);
                                }
                            } else {
                                await this.displayContextMenuItem(itemText, itemCallback, clickedElement, itemType, itemIcon);
                            }
                        }

                        this.showContextMenu(mouseY, mouseX);
                    }
                }
            }

        });
    }


    static registerClickEvent(name, elements, callback, condition){
        if(!this.clickEvents[name]) this.clickEvents[name] = {};

        this.clickEvents[name].elements = elements;
        this.clickEvents[name].callback = callback;
        this.clickEvents[name].condition = condition;
    }

    static registerContextMenu(name, elements, items) {
        if (!this.contextMenus[name]) this.contextMenus[name] = {};
        this.contextMenus[name].elements = elements;
        this.contextMenus[name].items = items;
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