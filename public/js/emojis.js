let emojiList = [];
let suggestionsIndex = -1;
let matches = [];

// expanding this will be ass but at least it works that way
const twemojiIndex = [
    {
        group: "smileys",
        icon: "1f600",
        emojis: [ // char is pretty much useless, i just wanna know what emoji im editing
            { code: "1f60a", char: "😊", name: "grinning" },
            { code: "1f602", char: "😂", name: "joy" },
            { code: "1f605", char: "😅", name: "sweat_smile" },
            { code: "1f609", char: "😉", name: "wink" },
            { code: "1f60d", char: "😍", name: "heart_eyes" },
        ]
    },
    {
        group: "gestures",
        icon: "1f44d",
        emojis: [
            { code: "1f44d", char: "👍", name: "thumbsup" },
            { code: "1f44e", char: "👎", name: "thumbsdown" },
            { code: "1f44b", char: "👋", name: "wave" },
            { code: "1f44c", char: "👌", name: "nice" },
            { code: "1f449", char: "👉", name: "fingerright" },
        ]
    },
    {
        group: "animals",
        icon: "1f436",
        emojis: [
            { code: "1f436", char: "🐶", name: "dog" },
            { code: "1f431", char: "🐱", name: "cat" },
        ]
    }
];

function getEmojiContainerElement(){
    return document.querySelector("#emoji-box-container");
}

let emojiElement;
let ac = null;

async function fetchEmojis() {
    if (!socket || !socket.connected) return;

    return new Promise((resolve, reject) => {
        socket.emit(
            "getEmojis",
            { id: UserManager.getID(), token: UserManager.getToken() },
            function (response) {
                if (response.type !== "success") {
                    emojiList = [];
                    reject(response.msg);
                    return;
                }

                emojiList = response.data;

                if (ac) {
                    for (const e of emojiList) {
                        if (!e.filename) continue;

                        const name = e.filename
                            .split("_")
                            .slice(1)
                            .join("_")
                            .replace(/\.[^.]+$/, "");

                        const html = `
                            <img src="/emojis/${e.filename}" style="width:25px;height:25px;margin-right:8px;">
                            <span>${name}</span>
                        `;

                        ac.addEntry(name, e, html);
                    }

                    for (const group of twemojiIndex) {
                        for (const e of group.emojis) {
                            const html = `
                                <img src="/img/default_emojis/${e.code}.svg" style="width:25px;height:25px;margin-right:8px;">
                                <span>${e.name}</span>
                            `;

                            ac.addEntry(
                                e.name,
                                { code: e.code, name: e.name, default: true },
                                html
                            );
                        }
                    }
                }

                resolve(emojiList);
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

    if (emojiObj.default) {
        quill.insertEmbed(pos, "emoji", {
            src: `/img/default_emojis/${emojiObj.code}.svg`,
            class: "inline-text-emoji default",
            ["data-code"]: emojiObj.code
        });
    } else {
        quill.insertEmbed(pos, "emoji", {
            src: `/emojis/${emojiObj.filename}`,
            class: "inline-text-emoji",
            ["data-filehash"]: emojiObj.filename.split("_")[0]
        });
    }

    quill.setSelection(pos + 1);
}

function extractEmojiDetails(emojiObj) {
    if (!emojiObj) return null;

    if (emojiObj.code && emojiObj.name) {
        return [emojiObj.code, emojiObj.name];
    }

    if (typeof emojiObj.filename === "string") {
        const lastUnderscore = emojiObj.filename.lastIndexOf("_");
        if (lastUnderscore === -1) return null;

        const id = emojiObj.filename.slice(0, lastUnderscore);
        const nameWithExt = emojiObj.filename.slice(lastUnderscore + 1);
        const name = nameWithExt.replace(/\.[^.]+$/, "");
        return [id, name];
    }

    return null;
}

function showEmojiPicker(x,y, callback, reverseHeight = false){
    var emojiBox = document.getElementById("emoji-box-container");
    if(!emojiBox) return;

    if (emojiBox.style.display === "flex") {
        closeEmojiBox();
    } else {
        emojiBox.style.display = "flex";
        selectEmojiTab(document.getElementById("emoji-box-emojis"))
        getEmojis(callback)
        emojiBox.style.position = "fixed";

        const margin = 8;
        let top, left;

        if (reverseHeight) {
            top = y + 40;
            left = x - (emojiBox.offsetWidth / 2);
        } else {
            top = y - emojiBox.offsetHeight - 40;
            left = x - emojiBox.offsetWidth;
        }

        const maxTop = window.innerHeight - emojiBox.offsetHeight - margin;
        const maxLeft = window.innerWidth - emojiBox.offsetWidth - margin;

        emojiBox.style.top = Math.max(margin, Math.min(top, maxTop)) + "px";
        emojiBox.style.left = Math.max(margin, Math.min(left, maxLeft)) + "px";
    }
}

function closeEmojiBox() {
    var emojiContainer = document.getElementById("emoji-box-container");
    emojiContainer.style.display = "none";

    var emojiEntryContainer = document.getElementById("emoji-entry-container");
    var gifEntryContainer = document.getElementById("emoji-entry-container");
    //emojiEntryContainer.innerHTML = "";

    emojiEntryContainer.style.display = "flex";
    gifEntryContainer.style.display = "none";

    var emojiTab = document.getElementById("emoji-box-emojis");
    var gifTab = document.getElementById("emoji-box-gifs");

    try {
        emojiTab.classList.add("SelectedTab");
        gifTab.classList.remove("SelectedTab");
    } catch (e) {
        console.log(e)
    }
}

function isOnlyText(html) {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

    let out = "";
    for (const { segment } of segmenter.segment(temp.textContent || "")) {
        const isEmoji =
            /\p{Extended_Pictographic}/u.test(segment) ||
            /\p{Regional_Indicator}{2}/u.test(segment) ||
            /\p{Emoji_Presentation}/u.test(segment);

        if (!isEmoji) out += segment;
    }

    out = out.replace(/\s+/g, "").replace(/:([a-fA-F0-9]+):/g, "");
    return out.length === 0;
}


function emojiCodeToImg(str, forceSmall = false) {
    if (!str) return str;

    const tags = [];
    str = str.replace(/<[^>]+>/g, m => {
        tags.push(m);
        return `__TAG_${tags.length - 1}__`;
    });

    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    let out = "";

    for (const { segment } of segmenter.segment(str)) {
        const isEmoji =
            /\p{Extended_Pictographic}/u.test(segment) ||
            /\p{Regional_Indicator}{2}/u.test(segment) ||
            /\p{Emoji_Presentation}/u.test(segment);


        if (isEmoji) {
            const code = Array.from(segment, c =>
                c.codePointAt(0).toString(16).toLowerCase()
            ).join("-");


            const file = code + ".svg";

            const big = forceSmall ? "" : isOnlyText(str) ? "big" : "";
            out += `<img src="/img/default_emojis/${file}" alt="${segment}" data-code="${code}" class="inline-text-emoji ${big} default">`;
        } else {
            out += segment;
        }
    }

    return out.replace(/__TAG_(\d+)__/g, (_, i) => tags[i]);
}





async function text2Emoji(text, returnCodeOnly = false, forceSmall = false) {
    text = emojiCodeToImg(text, forceSmall);

    let replacedText = text.replace(/:([a-fA-F0-9]+):/g, (match, emojiId) => {
        const emojiObject = findEmojiByID(emojiId);
        if (!emojiObject) return match;

        const sendBigEmoji = forceSmall === false ? isOnlyText(text) ? "big" : "" : "";

        if (emojiObject.code) {
            return `<img title="${emojiObject.name}" data-code="${emojiObject.code}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji} default" src="/img/default_emojis/${emojiObject.code}.svg">`;
        }

        const emojiName = String(emojiObject.filename.split("_")[1].split(".")[0]);
        let emojiFileHash = emojiObject.filename.split("_")[0];
        return `<img title="${emojiName}" data-filehash="${emojiFileHash}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${emojiObject.filename}">`;
    });

    if (!forceSmall && isOnlyText(replacedText)) {
        replacedText = replacedText.replace(/class="inline-text-emoji([^"]*)"/g, (m, rest) => {
            if (rest.includes("big")) return m;
            return `class="inline-text-emoji big${rest}"`;
        });
    }

    return replacedText;
}

function findEmojiByID(emojiId) {
    const custom = emojiList.find(e => e.filename.startsWith(`${emojiId}_`));
    if (custom) return custom;

    for (const group of twemojiIndex) {
        const match = group.emojis.find(e => e.code === emojiId);
        if (match) return match;
    }

    return null;
}

function hasEmojiInContainer(emojiHash){
    let emojiEntries = getEmojiContainerElement()?.querySelectorAll(`.emoji-entry`);
    return [...emojiEntries].some(e => e.getAttribute("data-hash") === emojiHash);
}

function removeUnusedEmojisFromContainer(emojiResponseData){
    let allListedEmojis = getEmojiContainerElement()?.querySelectorAll(`.emoji-entry`);
    if(allListedEmojis) allListedEmojis = [...allListedEmojis];
    if(allListedEmojis){
        let removedEmojis = allListedEmojis.filter(emoji => {
            !emojiResponseData.data.find(e => e.filename.split("_")[0] === emoji.getAttribute("data-hash")) &&
            emoji.getAttribute("data-default") == null
        });
        removedEmojis.forEach(emoji => emoji.remove());
    }
}
