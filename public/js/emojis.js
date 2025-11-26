let emojiList = [];
let suggestionsIndex = -1;
let matches = [];

let emojiElement;
async function fetchEmojis() {
    if(!socket || !socket.connected){
        console.log(socket)
        console.log(socket?.connected)
    }
    return new Promise((resolve, reject) => {
        socket.emit("getEmojis",
            { id: UserManager.getID(), token: UserManager.getToken() },
            function (response) {
            console.log(response)
                if (response.type === "success") {
                    emojiList = response.data;
                    resolve(emojiList);
                } else {
                    console.log("Failed to fetch emojis:", response.msg);
                    reject(response.msg);
                    emojiList = [""]
                }
            }
        );
    });
}

function getTextBeforeCursor() {
    const range = quill.getSelection();
    if (!range) return "";

    const delta = quill.getContents(0, range.index);
    let text = "";

    delta.ops.forEach(op => {
        if (typeof op.insert === "string") {
            text += op.insert;
        } else {
            text += " ";
        }
    });

    return text.replace(/\s+$/, "");
}

async function initializeEmojiAutocomplete(element) {
    console.log("getting emojis")
    await fetchEmojis()
    console.log("got emojis")

    let savedCursor = 0;

    quill.on("selection-change", r => {
        if (r) savedCursor = r.index;
    });

    quill.on('text-change', function (delta, oldDelta, source) {
        const selection = quill.getSelection();
        if (!selection) return;

        const cursorPosition = selection.index;
        savedCursor = cursorPosition;

        const textBeforeCursor = getTextBeforeCursor()
        const match = textBeforeCursor.match(/:([^\s:]*)$/);


        if (match) {
            const searchTerm = match[1];

            if (searchTerm.length > 0) {
                console.log("emojiList =", emojiList.map(e => e.filename));
                console.log("searchTerm =", searchTerm);


                matches = emojiList.filter(emoji => {
                    const namePart = emoji.filename.split("_").slice(1).join("_").toLowerCase();
                    return namePart.startsWith(searchTerm.toLowerCase());
                });

                if (matches.length > 0) {
                    suggestionsIndex = -1;
                    showSuggestions(matches, element);
                } else {
                    hideSuggestions();
                }
            } else {
                hideSuggestions();
            }
        } else {
            hideSuggestions();
        }
    });

    function showSuggestions(matches, inputField) {
        let suggestionsContainer = document.getElementById("emoji-suggestions");

        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement("div");
            suggestionsContainer.id = "emoji-suggestions";
            suggestionsContainer.style.position = "absolute";
            suggestionsContainer.style.zIndex = "1000";
            suggestionsContainer.style.background = "#24292E";
            suggestionsContainer.style.color = "white";
            suggestionsContainer.style.border = "1px solid #60676e";
            suggestionsContainer.style.padding = "-5px";
            suggestionsContainer.style.maxWidth = "400px";
            suggestionsContainer.style.maxHeight = "250px";
            suggestionsContainer.style.overflowY = "auto";
            document.body.appendChild(suggestionsContainer);
        }

        suggestionsContainer.innerHTML = "";
        matches.forEach((match, index) => {
            const suggestion = document.createElement("div");
            suggestion.style.padding = "10px";
            suggestion.style.cursor = "pointer";
            suggestion.style.display = "flex";
            suggestion.style.alignItems = "center";
            suggestion.className = "emoji-suggestion-entry";
            suggestion.setAttribute("data-index", index);

            const [id, name] = extractEmojiDetails(match);

            const emojiImage = document.createElement("img");
            emojiImage.src = `/emojis/${match.filename}`;
            emojiImage.style.width = "25px";
            emojiImage.style.height = "25px";
            emojiImage.style.marginRight = "8px";

            const emojiName = document.createElement("span");
            emojiName.textContent = name;

            suggestion.appendChild(emojiImage);
            suggestion.appendChild(emojiName);

            suggestion.addEventListener("mousedown", (e) => {
                e.preventDefault();
                insertEmoji(match);
                hideSuggestions();
            });

            suggestionsContainer.appendChild(suggestion);
        });

        adjustDropdownPosition(suggestionsContainer, inputField);
    }

    function adjustDropdownPosition(suggestionsContainer, inputField) {
        const rect = inputField.getBoundingClientRect();
        const dropdownHeight = suggestionsContainer.offsetHeight;

        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
            suggestionsContainer.style.top = `${rect.bottom + window.scrollY}px`;
        } else {
            suggestionsContainer.style.top = `${rect.top + window.scrollY - dropdownHeight - 5}px`;
        }

        suggestionsContainer.style.left = `${rect.left + window.scrollX}px`;
        suggestionsContainer.style.width = `${rect.width}px`;
    }
}

function hideSuggestions() {
    const suggestionsContainer = document.getElementById("emoji-suggestions");
    if (suggestionsContainer) {
        suggestionsContainer.remove();
    }
}

function findEmojiTrigger() {
    const range = quill.getSelection();
    if (!range) return null;

    const index = range.index;

    const delta = quill.getContents(0, index);
    let text = "";

    delta.ops.forEach(op => {
        if (typeof op.insert === "string") {
            text += op.insert;
        } else {
            text += " ";
        }
    });

    const match = text.match(/:(\w*)$/);
    if (!match) return null;

    return {
        start: text.lastIndexOf(":"),
        end: text.length,
        search: match[1]
    };
}

function insertEmoji(emojiObj, force = false) {
    const trigger = findEmojiTrigger();

    if (!trigger && !force) return;

    let pos = 0;

    if (force) {
        const len = quill.getLength();
        const sel = quill.getSelection();

        if (sel && sel.index === len) {
            pos = len - 1;
        } else if (!sel) {
            pos = len - 1;
        } else {
            pos = sel.index;
        }

    } else {
        pos = trigger.start;
        quill.deleteText(trigger.start, trigger.end - trigger.start);
    }

    quill.insertEmbed(pos, "emoji", {
        src: `/emojis/${emojiObj.filename}`,
        class: "inline-text-emoji",
        ["data-filehash"]: emojiObj.filename.split("_")[0]
    });

    quill.setSelection(pos + 1);
    focusEditor();
}



function extractEmojiDetails(emojiObj) {
    const filename = emojiObj.filename;

    const lastUnderscore = filename.lastIndexOf("_");
    const id = filename.slice(0, lastUnderscore);
    const nameWithExt = filename.slice(lastUnderscore + 1);

    const name = nameWithExt.replace(/\.[^.]+$/, "");
    return [id, name];
}

function isOnlyText(html) {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    let text = temp.textContent || "";
    text = text.replace(/\s+/g, "").replace(/:([a-fA-F0-9]+):/g, "")
    return text.length === 0;
}

async function text2Emoji(text, returnCodeOnly = false) {
    const replacedText = text.replace(/:([a-fA-F0-9]+):/g, (match, emojiId) => {
        const emojiObject = findEmojiByID(emojiId);
        if (emojiObject) {
            const emojiName = String(emojiObject.filename.split("_")[1].split(".")[0])
            const sendBigEmoji = isOnlyText(text) ? "big" : "";
            let emojiFileHash = emojiObject.filename.split("_")[0];

            if (returnCodeOnly) {
                return `<img title="${emojiName}" data-filehash="${emojiFileHash}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${emojiObject.filename}">`;
            }

            return `<img title="${emojiName}" data-filehash="${emojiFileHash}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${emojiObject.filename}">`;
        }

        return match
    });

    return replacedText;
}

function findEmojiByID(emojiId) {
    return emojiList.find(e => e.filename.startsWith(`${emojiId}_`)) || null;
}
