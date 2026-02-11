class PermUI {
    static checkboxCallbacks = {};

    static init() {
        if (!document.getElementById("PermsUIStyles")) {
            const style = document.createElement("style");
            style.id = "PermsUIStyles";
            style.innerHTML = `
                .permContainer {
                    float: left;
                    display: block;
                    width: 100%;
                }

                .permui_hr{
                    border: 1px solid #3c3f44;
                    margin: 4px 0px !important;
                    display: block;
                    float: left;
                    width: 100%;
                }
                .permStateBox {
                    width: 10px;
                    height: 10px;
                    border-radius: 4px;
                    border: 2px solid #ccc;
                    background-color: #888;
                    float: right;
                    transition: background-color 0.3s ease;

                    margin: 4px 0;
                }
                .permStateBox[data-state="1"] {
                    background-color:rgb(39, 173, 122);
                    border-color:rgb(35, 207, 141);
                }
                .permStateBox[data-state="0"] {
                    background-color: #888888;
                    border-color:rgb(193, 192, 192);
                }
                .permStateBox[data-state="-1"] {
                    background-color: indianred;
                    border-color:rgb(242, 122, 122);
                }
                .permContainer .entry:hover {
                    background-color: #292B2F;
                }
                .permContainer .entry {
                    font-weight: bold;
                    display: block;
                    float: left;
                    user-select: none;
                    padding: 8px !important;

                    
                    width: calc(100% - 16px);
                }
                .permContainer label {
                    font-style: italic;
                    font-size: 12px;
                    color: #828a8d;
                    width: 100%;
                    display: block;
                    float: left;
                    margin: 8px 0;
                }
                .permContainer input[type=number] {
                    color: #ABB8BE;
                    background-color: #292B2F;
                    border: 2px solid #3c3f44;
                    outline: none;
                    padding: 4px 8px;
                    float: right;
                    margin: 4px 0 0 0;
                    border-radius: 6px;
                    resize: none;
                    width: 15%;
                }
            `;
            document.head.appendChild(style);

            console.log("Loaded PermUI")
        }
    }

    static showSetting(container, settingId, displayName, type, description = "", defaultValue = 0, onChange = null) {
        if (!container) {
            console.error("PermUI.showSetting: container element not found.");
            return;
        }

        const permWrapper = document.createElement("div");
        permWrapper.className = "permContainer";

        let innerHTML = `<hr class="permui_hr"><div class="entry" id="${settingId}"><strong>${displayName}</strong>`;

        if (type === "checkbox") {
            innerHTML += `<div class="permStateBox" data-state="${defaultValue}"></div>`;
        }

        if (type === "int") {
            innerHTML += `<input type="number" id="${settingId}_input" value="${defaultValue}">`;
        }

        if (description.length > 0) {
            innerHTML += `<label>${description}</label>`;
        }

        innerHTML += `</div>`;
        permWrapper.innerHTML = innerHTML;
        container.appendChild(permWrapper);

        // handle checkbox interaction + callback
        if (type === "checkbox") {
            permWrapper.addEventListener("click", () => {
                const nextState = this._cycleCheckbox(settingId);
                if (typeof onChange === "function") {
                    onChange(nextState); // Only value, not element
                }
            });
        }

        // handle int input change
        if (type === "int" && typeof onChange === "function") {
            const input = permWrapper.querySelector(`#${settingId}_input`);
            if (input) {
                input.addEventListener("change", () => {
                    const newValue = parseInt(input.value);
                    if (!isNaN(newValue)) {
                        onChange(newValue); // Only value, not element
                    }
                });
            }
        }
    }

    static _cycleCheckbox(settingId) {
        const box = document.querySelector(`#${settingId} .permStateBox`);
        let state = parseInt(box.getAttribute("data-state"));
        const nextState = state === 1 ? -1 : state + 1;

        box.setAttribute("data-state", nextState);
        box.parentElement.setAttribute("data-state", nextState);

        return nextState;
    }
}
