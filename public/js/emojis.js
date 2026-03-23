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

                        const parsed = parseEmojiFilename(e.filename);
                        if (!parsed) continue;

                        const html = `
                            <img src="/emojis/${e.filename}" style="width:25px;height:25px;margin-right:8px;">
                            <span>${parsed.name}</span>
`;

                        ac.addEntry(parsed.name, e, html);
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
        const parsed = parseEmojiFilename(emojiObj.filename);

        quill.insertEmbed(pos, "emoji", {
            src: `/emojis/${emojiObj.filename}`,
            class: "inline-text-emoji",
            ["data-filehash"]: parsed.hash
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
        const dot = emojiObj.filename.lastIndexOf(".");
        if (dot === -1) return null;

        const base = emojiObj.filename.slice(0, dot);
        const firstUnderscore = base.indexOf("_");
        if (firstUnderscore === -1) return null;

        const id = base.slice(0, firstUnderscore);
        const name = base.slice(firstUnderscore + 1);

        return [id, name];
    }

    return null;
}

function parseEmojiFilename(filename) {
    const dot = filename.lastIndexOf(".");
    if (dot === -1) return null;

    const base = filename.slice(0, dot);
    const idx = base.indexOf("_");
    if (idx === -1) return null;

    return {
        hash: base.slice(0, idx),
        name: base.slice(idx + 1)
    };
}

function showEmojiPicker(x,y, callback, reverseHeight = false){
    var emojiBox = document.getElementById("emoji-box-container");
    if(!emojiBox){
        emojiBox = document.createElement("div");
        emojiBox.id = "emoji-box-container";
        emojiBox.innerHTML = ` 
                    <div id="emoji-box-header-container">
                        <div class='emoji-box-header' id="emoji-box-emojis"
                             onclick="getEmojis(); selectEmojiTab(this);">
                            <h2>Emojis</h2>
                        </div>
                        <div class='emoji-box-header' id="emoji-box-gifs" onclick="getGifs(); selectEmojiTab(this);">
                            <h2>GIFs</h2>
                        </div>
                        <div class='emoji-box-header' id="emoji-box-upload" onclick="document.getElementById('uploadCaller').click();">
                            <input type="file" id="uploadCaller" style="display:none" accept="image/*,video/*" /> 
                            <h2>Upload</h2>
                        </div>
                    </div>

                    <div id="emoji-entry-container"></div>
                    <div id="gif-entry-container"></div>`;

        document.body.appendChild(emojiBox);
    }

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

            let bypassCodes = [
                "2122"
            ]
            if(bypassCodes.includes(code)){
                continue
            }

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

        const parsed = parseEmojiFilename(emojiObject.filename);
        if (!parsed) return match;

        return `<img title="${parsed.name}"
            data-filehash="${parsed.hash}"
            onerror="this.src='/img/error.png'"
            class="inline-text-emoji ${sendBigEmoji}"
            src="/emojis/${emojiObject.filename}">`;
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
    const custom = emojiList.find(e => {
        const p = parseEmojiFilename(e.filename);
        return p && p.hash === emojiId;
    });

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


function queryTenorSearch(search) {
    Clock.start("gifSearch")
    socket.emit("searchTenorGif", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        search
    }, function (response) {
        if (response.type === "success") {
            console.log("Tenor Response", response);
        } else {
            showSystemMessage({
                title: response.msg || "",
                text: "",
                icon: response.type,
                img: null,
                type: response.type,
                duration: 1000
            });
        }
    });
}

function listenForGifSearch() {
    const gifContainer = document.getElementById("gif-entry-container");
    const emojiEntryContainer = document.getElementById("emoji-entry-container");

    var gifSearchbarInput = document.getElementById("gif-searchbar-input");
    // Execute a function when the user presses a key on the keyboard
    let gifSearchTimeout;
    gifSearchbarInput.addEventListener("input", function () {
        clearTimeout(gifSearchTimeout);

        gifSearchTimeout = setTimeout(() => {
            const query = gifSearchbarInput.value
            if (!query) return;

            queryTenorSearch(query);
        }, 500);
    });
}


function selectEmojiTab(element) {
    console.log(element)
    console.log(element?.parentNode)
    var parentnode = element.parentNode.children;

    for (let i = 0; i < parentnode.length; i++) {
        if (parentnode[i].classList.contains("SelectedTab")) {
            parentnode[i].classList.remove("SelectedTab");
        }
    }

    element.classList.add("SelectedTab");
}

function sendGif(url) {

    if (document.querySelector('.ql-editor').innerHTML.replaceAll(" ", "").length >= 1) {
        sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), document.querySelector('.ql-editor').innerHTML);
    }
    sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), url, true);
    closeEmojiBox();
    focusEditor()
}



function changeGIFSrc(url, element) {
    element.src = url;
}

function clearGifContainer() {
    let search = document.getElementById("gif-searchbar-input");
    document.getElementById("gif-entry-container").innerHTML = `<div id="gif-searchbar"><input autocomplete="off" id="gif-searchbar-input"
                                                       placeholder="Search anything, then press enter" type="text" value="${search?.value ? search?.value : ""}"></div>`;
    listenForGifSearch();
}

function getGifs() {
    var gifEntryContainer = document.getElementById("gif-entry-container");
    var emojiEntryContainer = document.getElementById("emoji-entry-container");

    emojiEntryContainer.style.display = "none"
    gifEntryContainer.style.display = "flex"
    clearGifContainer()
    queryTenorSearch("trending")

}


async function getEmojis(callback = null) {
    var emojiContainer = getEmojiContainerElement()
    var emojiEntryContainer = document.getElementById("emoji-entry-container");
    var gifEntryContainer = document.getElementById("gif-entry-container");
    gifEntryContainer.innerHTML = "";
    gifEntryContainer.style.display = "none"

    let emojiEntries = emojiContainer.querySelectorAll(".emoji-entry")
    emojiEntries.forEach(emoji => {
        let clone = emoji.cloneNode(true);
        emoji.replaceWith(clone);
    })

    socket.emit("getEmojis", { id: UserManager.getID(), token: UserManager.getToken() }, async function (response) {
        if (response.type === "success") {
            emojiEntryContainer.style.display = "flex";

            let groupBar = emojiEntryContainer.querySelector(".emoji-group-bar");
            if (!groupBar) {
                groupBar = document.createElement("div");
                groupBar.className = "emoji-group-bar";
                emojiEntryContainer.prepend(groupBar);
            }
            groupBar.innerHTML = "";

            let searchWrap = emojiEntryContainer.querySelector(".emoji-search-wrap");
            if (!searchWrap) {
                searchWrap = document.createElement("div");
                searchWrap.className = "emoji-search-wrap";
                const searchInput = document.createElement("input");
                searchInput.className = "emoji-search-input";
                searchInput.type = "text";
                searchInput.placeholder = "search emojis...";
                searchWrap.appendChild(searchInput);
                groupBar.parentNode ? emojiEntryContainer.insertBefore(searchWrap, groupBar.nextSibling) : emojiEntryContainer.prepend(searchWrap);
            }
            const searchInput = searchWrap.querySelector(".emoji-search-input");
            searchInput.value = "";
            setTimeout(() => searchInput.focus(), 50);

            const customTab = document.createElement("div");
            customTab.className = "emoji-group-tab active";
            customTab.setAttribute("data-group", "custom");
            customTab.title = "custom";

            const customIcon = document.createElement("img");
            customIcon.src = "/img/default_pfp.png";
            customIcon.className = "emoji-group-icon";
            customTab.appendChild(customIcon);
            groupBar.appendChild(customTab);

            for (const group of twemojiIndex) {
                const tab = document.createElement("div");
                tab.className = "emoji-group-tab";
                tab.setAttribute("data-group", group.group);
                tab.title = group.group;

                const icon = document.createElement("img");
                icon.src = `/img/default_emojis/${group.icon}.svg`;
                icon.className = "emoji-group-icon";
                tab.appendChild(icon);
                groupBar.appendChild(tab);
            }

            let contentContainer = emojiEntryContainer.querySelector(".emoji-group-content");
            if (!contentContainer) {
                contentContainer = document.createElement("div");
                contentContainer.className = "emoji-group-content";
                emojiEntryContainer.appendChild(contentContainer);
            }
            contentContainer.innerHTML = "";

            const customSection = document.createElement("div");
            customSection.className = "emoji-section";
            customSection.setAttribute("data-group", "custom");

            for (let emoji of response.data.reverse()) {
                const base = emoji.filename.replace(/\.[^/.]+$/, "");
                const parts = base.split("_");

                let parsed = parseEmojiFilename(emoji.filename)
                const emojiId = parsed.hash;
                const emojiName = parsed.name;

                if (hasEmojiInContainer(emojiId)) {
                    let existingEmojiElement = contentContainer.querySelector(`.emoji-entry[data-hash="${emojiId}"]`);
                    if (existingEmojiElement) registerEmojiCallback(existingEmojiElement, emoji);
                    continue;
                }

                const entry = document.createElement("div");
                entry.className = "emoji-entry";
                entry.setAttribute("data-hash", emojiId);
                entry.title = emojiName;

                const imgWrap = document.createElement("div");
                imgWrap.className = "emoji-img";

                const img = document.createElement("img");
                img.className = "emoji";
                img.src = `/emojis/${emoji.filename}`;

                imgWrap.appendChild(img);
                entry.appendChild(imgWrap);
                registerEmojiCallback(entry, emoji);
                customSection.appendChild(entry);
            }
            contentContainer.appendChild(customSection);

            for (const group of twemojiIndex) {
                const section = document.createElement("div");
                section.className = "emoji-section";
                section.setAttribute("data-group", group.group);
                section.style.display = "none";

                for (const e of group.emojis) {
                    const entry = document.createElement("div");
                    entry.className = "emoji-entry";
                    entry.setAttribute("data-default", "1");
                    entry.setAttribute("data-name", e.name);
                    entry.title = e.name;

                    const imgWrap = document.createElement("div");
                    imgWrap.className = "emoji-img";

                    const img = document.createElement("img");
                    img.className = "emoji";
                    img.src = `/img/default_emojis/${e.code}.svg`;
                    imgWrap.appendChild(img);
                    entry.appendChild(imgWrap);

                    entry.addEventListener("click", () => {
                        if (typeof callback === "function") {
                            callback({ code: e.code, name: e.name, default: true });
                            closeEmojiBox();
                        } else {
                            const sel = quill.getSelection(true);
                            quill.insertEmbed(sel.index, "emoji", {
                                src: `/img/default_emojis/${e.code}.svg`,
                                class: "inline-text-emoji default",
                                ["data-code"]: e.code
                            });
                            quill.setSelection(sel.index + 1);
                            if(!MobilePanel.isMobile()) focusEditor();
                            getEmojiContainerElement().style.display = "none";
                        }
                    });

                    section.appendChild(entry);
                }
                contentContainer.appendChild(section);
            }

            searchInput.addEventListener("input", () => {
                const query = searchInput.value.toLowerCase().trim();

                if (!query) {
                    groupBar.style.display = "";
                    const activeGroup = groupBar.querySelector(".emoji-group-tab.active")?.getAttribute("data-group") || "custom";
                    contentContainer.querySelectorAll(".emoji-section").forEach(s => {
                        s.style.display = s.getAttribute("data-group") === activeGroup ? "flex" : "none";
                        s.classList.remove("emoji-section-search");
                    });
                    contentContainer.querySelectorAll(".emoji-entry").forEach(e => e.style.display = "");
                    return;
                }

                groupBar.style.display = "none";
                contentContainer.querySelectorAll(".emoji-section").forEach(s => {
                    s.style.display = "";
                    s.classList.add("emoji-section-search");
                });

                contentContainer.querySelectorAll(".emoji-entry").forEach(entry => {
                    const name = (entry.title || entry.getAttribute("data-name") || "").toLowerCase();
                    entry.style.display = name.includes(query) ? "" : "none";
                });
            });

            groupBar.addEventListener("click", (ev) => {
                const tab = ev.target.closest(".emoji-group-tab");
                if (!tab) return;

                const groupName = tab.getAttribute("data-group");

                groupBar.querySelectorAll(".emoji-group-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");

                searchInput.value = "";
                contentContainer.querySelectorAll(".emoji-entry").forEach(e => e.style.display = "");
                contentContainer.querySelectorAll(".emoji-section").forEach(s => {
                    s.style.display = s.getAttribute("data-group") === groupName ? "flex" : "none";
                });
            });

            removeUnusedEmojisFromContainer(response);

        } else {
            showSystemMessage({
                title: response.msg || "",
                text: "",
                icon: response.type,
                img: null,
                type: response.type,
                duration: 1000
            });
        }
    });


    function registerEmojiCallback(element, emojiObj){
        element.addEventListener("click", async () => {
            if(!callback){
                insertEmoji(emojiObj, true);
                focusEditor();
            }
            else{
                await callback(emojiObj);
            }

            if(getEmojiContainerElement()) getEmojiContainerElement().style.display = "none";
        }, {once: true});
    }
}