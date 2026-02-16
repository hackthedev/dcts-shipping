class JsonEditor{
    static getSettingElement(jsonKey, displayName, description, onChange = null){
        if(jsonKey === null || jsonKey === undefined) throw new Error("No json key provided!");

        let element = document.createElement("div")
        element.style.display = "flex";
        element.style.flexDirection = "column";
        element.style.width = "100%";
        element.style.margin = "10px 0";
        element.style.flexShrink = "1";
        element.style.flexWrap = "wrap";
        element.style.userSelect = "none";
        element.classList.add("json-editor-setting");

        element.innerHTML = `
            <hr style="width: 100%; ">
            <div style="display: flex; color: white;flex-wrap: wrap;max-width: 100%;">
                <div style="max-width: 300px;">
                    <p class="json-editor-setting-headline" style="font-weight: bold">${displayName ? displayName : jsonKey}</p>
                    ${description ? `<div class="json-editor-setting-description" style="margin-bottom: 10px; font-style: italic">${description}</div>` : ""}
                </div>
                <div class="json-editor-inputs" style="margin-left: auto;">${this.getInputHTMLBasedOnType(jsonKey)}</div>
            </div>            
        `

        element.onclick = (e) => {
            let tagName = e.target.tagName.toLowerCase();
            if(tagName === "button") return;
            if(tagName === "input") return;

            let inputs = element.querySelectorAll("input");
            if(inputs?.length === 1){
                if(inputs[0].type === "checkbox"){
                    inputs[0].checked = !inputs[0].checked;
                    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
                    return;
                }

                inputs[0].focus()
            }
        }

        element.addEventListener("input", e => {
            if(Array.isArray(jsonKey)){
                const inputs = element.querySelectorAll(".json-editor-array-item input");
                const values = [];

                inputs.forEach(i => {
                    if(i.type === "number"){
                        if(i.value === "") return;
                        values.push(Number(i.value));
                        return;
                    }

                    if(i.type === "checkbox"){
                        values.push(i.checked);
                        return;
                    }

                    if(i.value === "" || i.value === null) return;
                    values.push(i.value);
                });

                onChange?.(values);
                return;
            }

            let value =
                e.target.type === "number" ? Number(e.target.value) :
                    e.target.type === "checkbox" ? e.target.checked :
                        e.target.value;

            onChange?.(value);
        });

        return element
    }

    static encodePlainText(s) {
        return String(s || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    static createInputElement(value){
        let type = typeof value;
        if (type === "string") type = "text";
        if (type === "number") type = "number";
        if (type === "boolean") type = "checkbox";

        if (type === "checkbox") {
            return `<input type="checkbox"${value ? " checked" : ""}>`;
        }

        return `<input type="${type}" value="${this.encodePlainText(String(value))}">`;
    }


    static getInputHTMLBasedOnType(jsonKey){
        if(typeof(jsonKey) === "string") return this.createInputElement(jsonKey);
        if(typeof(jsonKey) === "number") return this.createInputElement(jsonKey);
        if(typeof(jsonKey) === "boolean") return this.createInputElement(jsonKey);

        if(Array.isArray(jsonKey)){
            let html = `<div style='display: flex; flex-wrap: wrap;flex-direction: column;gap: 4px;'>
                                <button onclick="JsonEditor.addArrayElement(this)">Add &#128935;</button>`;

            for(let i = 0; i < jsonKey.length; i++){
                html += this.getArrayItemHTML(jsonKey[i]);
            }
            return `${html}</div>`;
        }
    }

    static getArrayItemHTML(jsonKey){
        return `<div class="json-editor-array-item" >
                        ${this.getInputHTMLBasedOnType(jsonKey)}
                        <button onclick="JsonEditor.removeArrayItem(this)">&#128942;</button>
                    </div>`;
    }

    static removeArrayItem(itemElement){
        let parent = itemElement.parentElement;
        let input = parent.querySelector("input");
        if(input) input.value = "";
        parent.closest(".json-editor-setting").dispatchEvent(new Event("input", { bubbles: true }))
        parent.remove();
    }

    static addArrayElement(itemElement){
        let parent = itemElement.parentElement;
        parent.insertAdjacentHTML("beforeend",
            `${this.getArrayItemHTML("")}
        `);
    }
}
