let emojiList = [];
let suggestionsIndex = -1;
let matches = [];

function getEmojiContainerElement(){
    return document.querySelector("#emoji-box-container");
}

let emojiElement;
let ac = null;

async function fetchEmojis() {
    if(!socket || !socket.connected){
        console.log(socket)
        console.log(socket?.connected)
    }
    return new Promise((resolve, reject) => {
        socket.emit("getEmojis",
            { id: UserManager.getID(), token: UserManager.getToken() },
            function (response) {
                if (response.type === "success") {
                    emojiList = response.data;
                    if(ac){
                        emojiList.forEach(e => {
                            const name = e.filename.split("_").slice(1).join("_").replace(/\.[^.]+$/, "");
                            const html = `
                                <img src="/emojis/${e.filename}" style="width:25px;height:25px;margin-right:8px;">
                                <span>${name}</span>
                            `;
                            ac.addEntry(name, e, html);
                        });
                    }
                    resolve(emojiList);
                } else {
                    reject(response.msg);
                    emojiList = [""];
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
        if (typeof op.insert === "string") text += op.insert;
        else text += " ";
    });

    return text.replace(/\s+$/, "");
}

async function initializeEmojiAutocomplete(element) {
    ac = new Autocomplete(element, {
        maxWidth: 400,
        maxHeight: 250,
        offsetY: -50 ,
        bg: "hsl(from var(--main) h s calc(l * 2) / 100%)",
        color: "hsl(from var(--main) h s calc(l * 10) / 100%)",
        borderColor: "hsl(from var(--main) h s calc(l * 10) / 20%)",
        highlightBg: "hsl(from var(--main) h s calc(l * 2.5))",
        highlightColor: "hsl(from var(--main) h s calc(l * 12) / 100%)",
    });

    ac.onSelect = item => {
        element.focus();
        insertEmoji(item.data);
    };

    await fetchEmojis();
    startEmojiAutocompleteListener();

    document.addEventListener("keydown", e => {
        if (e.key === "Tab" && ac && ac.container.style.display !== "none") {
            e.preventDefault();
            ac.onKey(e);
        }
    }, true);

}

function startEmojiAutocompleteListener() {
    document.addEventListener("keydown", e => {
        if (!ac) return;
        ac.onKey(e);
    });

    quill.on("text-change", () => {
        const text = getTextBeforeCursor();
        const match = text.match(/:([^\s:]*)$/);

        if (!match) {
            ac.hide();
            return;
        }

        const searchTerm = match[1];
        if (!searchTerm) {
            ac.hide();
            return;
        }

        ac.showFiltered(searchTerm);
    });
}

function hideSuggestions() {
    const suggestionsContainer = document.getElementById("emoji-suggestions");
    if (suggestionsContainer) suggestionsContainer.remove();
}

function findEmojiTrigger() {
    const range = quill.getSelection();
    if (!range) return null;

    const delta = quill.getContents(0, range.index);
    let text = "";

    delta.ops.forEach(op => {
        if (typeof op.insert === "string") text += op.insert;
        else text += " ";
    });

    const match = text.match(/:([^\s:]*)$/);
    if (!match) return null;

    return {
        start: text.lastIndexOf(":"),
        end: text.length,
        search: match[1]
    };
}

function insertEmoji(emojiObj, force = false) {
    quill.focus();

    const trigger = findEmojiTrigger();
    if (!trigger && !force) return;

    let pos = 0;

    if (force) {
        const len = quill.getLength();
        const sel = quill.getSelection();
        if (sel && sel.index === len) pos = len - 1;
        else if (!sel) pos = len - 1;
        else pos = sel.index;
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
    text = text.replace(/\s+/g, "").replace(/:([a-fA-F0-9]+):/g, "");
    return text.length === 0;
}

async function text2Emoji(text, returnCodeOnly = false, forceSmall = false) {
    const replacedText = text.replace(/:([a-fA-F0-9]+):/g, (match, emojiId) => {
        const emojiObject = findEmojiByID(emojiId);
        if (emojiObject) {
            const emojiName = String(emojiObject.filename.split("_")[1].split(".")[0]);
            const sendBigEmoji = forceSmall === false ? isOnlyText(text) ? "big" : "" : "";
            let emojiFileHash = emojiObject.filename.split("_")[0];

            return `<img title="${emojiName}" data-filehash="${emojiFileHash}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${emojiObject.filename}">`;
        }
        return match;
    });

    return replacedText;
}

function findEmojiByID(emojiId) {
    return emojiList.find(e => e.filename.startsWith(`${emojiId}_`)) || null;
}

function hasEmojiInContainer(emojiHash){
    let emojiEntries = getEmojiContainerElement()?.querySelectorAll(`.emoji-entry`);
    return [...emojiEntries].some(e => e.getAttribute("data-hash") === emojiHash);
}

function removeUnusedEmojisFromContainer(emojiResponseData){
    let allListedEmojis = getEmojiContainerElement()?.querySelectorAll(`.emoji-entry`);
    if(allListedEmojis) allListedEmojis = [...allListedEmojis];
    if(allListedEmojis){
        let removedEmojis = allListedEmojis.filter(emoji => !emojiResponseData.data.find(e => e.filename.split("_")[0] === emoji.getAttribute("data-hash")));
        removedEmojis.forEach(emoji => emoji.remove());
    }
}
