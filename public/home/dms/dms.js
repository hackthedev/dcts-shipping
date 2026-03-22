let tooltipSystem;
let customPrompts;

document.addEventListener("DOMContentLoaded", async () => {
    registerDmIconTooltips();
})


document.addEventListener("set-e2ee", e => {
    let enabled = e?.detail?.enabled;
    if(enabled === undefined) throw new Error("E2EE Update event Error: Couldnt get value")

    updateHeaderStatusIcons();
});

function registerDmIconTooltips(){
    ContextMenu.registerTooltip(
        "dm chat indicators",
        [".dm-container .header .indicators .indicator"],
        (data) => {
            let status = data?.element?.dataset?.status;
            let text = data?.element?.dataset?.text;
            if(!status) return "BUG! NO ELEMENT FOUND!";

            return text || status;
        }
    )
}

function rewriteImg(img) {
    if (!img || !img.src) return;

    if (img.dataset.proxied === "1") return;

    const proxied = ChatManager.proxyUrl(img.src);
    if (proxied !== img.src) {
        img.src = proxied;
    }

    img.dataset.proxied = "1";
}

document.addEventListener("DOMContentLoaded", () => {
    tooltipSystem = new TooltipSystem();
    customPrompts = new Prompt();

    document.querySelectorAll("img").forEach(rewriteImg);

    new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;

                if (n.tagName === "IMG") {
                    rewriteImg(n);
                } else {
                    n.querySelectorAll?.("img").forEach(rewriteImg);
                }
            }
        }
    }).observe(document.body, {
        childList: true,
        subtree: true
    });


    socket.on('newDmMessage', async function (response) {
        if(response?.payload?.data?.roomId === ChatManager.getUrlParams("dm")){

            if(response?.payload?.messageEditId){
                updateEditedMessage(response.payload);
            }
            else{
                addNewMessageToChatLog(response.payload, "dm")
            }
        }
    })

    socket.on('roomInvitation', async function (response) {
        renderDMs();
    })
});



async function startDmWith(id) {
    if(!id || id?.length !== 12) throw new Error("id must be provided or was invalid");
    let createdRoom = await createDmRoom([id])
    if(!createdRoom?.error && createdRoom?.roomId){
        ChatManager.setUrlParam("dm", createdRoom.roomId)
        renderDmRoom(createdRoom?.roomId)
        renderDMs();
        markDmInNav(createdRoom?.roomId)
    }
    else{
        console.error(createdRoom.error)
    }
    // check if exists etc
}


function getDMsNavContainer(){
    return getNavContainer().querySelector(".dms");
}

function getNavContainer(){
    return document.querySelector("#navigation.home");
}


function getDmRoomCount(dm){
    return Object.keys(dm?.participants).length;
}

async function getDmRoomInfo(dm){
    let participantCount = getDmRoomCount(dm);

    let dmRoomIcon = null;
    let dmRoomName = null;

    if(participantCount > 2){
        dmRoomIcon = "/img/default_pfp.png";
        dmRoomName = dm.title.replaceAll(",", ", ");
    }
    else if(participantCount === 2){
        let oppositeParticipant = Object.values(dm.participants).find(x => x.id !== UserManager.getID());

        if(oppositeParticipant?.id === "system"){
            dmRoomIcon = "/img/default_icon.png";
            dmRoomName = "System"
        }
        else{
            dmRoomIcon = oppositeParticipant?.icon ?? "/img/default_icon.png";
            dmRoomName = oppositeParticipant?.name;
        }
    }
    else if(participantCount === 1){
        let participant = Object.values(dm.participants)[0];

        if(participant?.id === UserManager.getID()){
            dmRoomIcon = UserManager.getPFP()
            dmRoomName = UserManager.getUsername() + " (You)"
        }
    }

    return {
        icon: dmRoomIcon,
        title: dmRoomName
    }
}

async function checkDmParticipantPublicKey(participants) {
    for (let participant of Object.values(participants)) {
        participant.canDecrypt = !!participant?.publicKey && participant.publicKey.length > 0;
    }

    let keyless = Object.values(participants).filter(x => !x.canDecrypt);

    return {
        keyless,
        allCanDecrypt: keyless.length === 0,
    }
}

async function renderDMs(){
    let dms = await getDmRooms();
    let dmRooms = dms?.rooms;

    let firstDm = true

    // if we have actual dms
    if(dmRooms?.length > 0){
        // we will loop through all of em
        getDMsNavContainer().innerHTML = "";
        for(let dm of dmRooms){

            // here we get the amount of members inside one dm room.
            // 2 members are pretty much just a normal dm, whereas more than 2
            // could be considered a dm group chat.
            let {icon, title} = await getDmRoomInfo(dm);
            joinDmRoom(dm.roomId)

            getDMsNavContainer().insertAdjacentHTML('beforeend',
                `<a class="entry ${!firstDm ? "selected" : ""}" data-room-id="${dm.roomId}" onclick="renderDmRoom('${dm.roomId}')">
                        <img class="icon" src="${stripHTML(icon)}">
                        <div class="info">
                            <p>${stripHTML(title)}</p>
                            <p class="status">${stripHTML(dm.status) ?? ""}</p>
                        </div>
                    </a>`
            )
        }
    }

    getDMsNavContainer().fadeIn(200, "flex")
}

const statusIcons = {
    "shield-check": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
    "shield-off": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-2.34 5.86-4.32"/><path d="M9.3 3.28a1.17 1.17 0 0 1 1.4 0C12.51 4.81 15 6 17 6h2a1 1 0 0 1 1 1v7c0 .7-.08 1.37-.22 2"/></svg>`,
    "shield-alert": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
    "shield-x": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5"/><path d="m9.5 9.5 5 5"/></svg>`,
    "key": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key-round-icon lucide-key-round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
    "trash": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    "user-plus": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ABB0BE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus-icon lucide-user-plus"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>`,
};

function setDmStatus(key, value, color, text) {
    let dmContainer = getContentElement()?.querySelector(".dm-container");
    if (!dmContainer) return;

    let rightSide = dmContainer.querySelector(".header .right-side");
    if (!rightSide) return;

    let indicators = rightSide.querySelector(".indicators");
    if (!indicators) {
        rightSide.insertAdjacentHTML("afterbegin", `<div class="indicators"></div>`);
        indicators = rightSide.querySelector(".indicators");
    }

    let el = indicators.querySelector(`[data-status="${key}"]`);

    // null = hide
    if (value === null) {
        if (el) el.remove();
        return;
    }

    let svg = statusIcons[value];
    if (!svg) return;

    if (!el) {
        el = document.createElement("span");
        el.classList.add("indicator");
        el.dataset.status = key;
        indicators.appendChild(el);
    }

    el.innerHTML = svg;
    el.style.color = color || "";
    if (text) el.dataset.text = text;
    else delete el.dataset.text;
}

async function updateHeaderStatusIcons(data){
    renderDmMenu();

    if(data?.currentDmObj){
        // status icons etc
        let keyCheck = await checkDmParticipantPublicKey(data.currentDmObj.participants);
        if (keyCheck.allCanDecrypt === true) {
            setDmStatus("encryption", "shield-check", "#87de54", "End-to-end encrypted")
        } else {
            setDmStatus(
                "encryption",
                "shield-alert",
                "chocolate",
                "Some participants cant decrypt messages because they dont seem to own any public keys. E2EE is not available in the Web Version.")
        }
    }

    if(isLauncher() && await Crypto.getPublicKey() && Crypto.getE2EE() === true){
        setDmStatus(
            "use-encryption",
            "key",
            "mediumseagreen",
            "Your sent messages will be encrypted."
        )
    }
    else{
        setDmStatus(
            "use-encryption",
            "key",
            "chocolate",
            "Your sent messages WONT be encrypted."
        )
    }

}

function renderDmMenu() {
    let menu = getContentElement()?.querySelector(".dm-container .header .right-side .menu");
    if (!menu) return;

    let ul = menu.querySelector("ul");
    if (!ul) return;

    ul.innerHTML = `
        <li>
            ${statusIcons["user-plus"]} Add Member
        </li>
        ${
        isLauncher() && Crypto.getE2EE() === true ?
            `<li class="warning" onclick="Crypto.setE2EE(false)">
                    ${statusIcons["key"]} Disable Encryption
                </li>`
            : ""
    }
        ${
        isLauncher() && Crypto.getE2EE() === false ?
            `<li class="success" onclick="Crypto.setE2EE(true)">
                    ${statusIcons["key"]} Enable Encryption
                </li>`
            : ""
    }
        <li class="caution">
            ${statusIcons["trash"]} Delete Chat
        </li>
    `;
}

async function renderDmRoom(roomId){
    if(!roomId) throw new Error("Room ID is required");

    ChatManager.setUrlParam("dm", roomId)

    let dms = await getDmRooms();
    let dmRooms = dms?.rooms;

    let currentDmObj = Object.values(dmRooms ?? {}).find(x => x.roomId === roomId);

    if(currentDmObj){
        let {icon, title} = await getDmRoomInfo(currentDmObj);
        let dmContainer = getContentElement().querySelector(".dm-container");

        if(dmContainer){
            let iconEl = dmContainer?.querySelector(".header .icon img");
            if(iconEl) iconEl.src = stripHTML(icon);

            let titleEl = dmContainer.querySelector(".header .title");
            if(titleEl) titleEl.innerHTML = sanitizeHtmlForRender(title, false)

            let contentEl = dmContainer.querySelector(".content");
            if(contentEl) contentEl.innerHTML = "";
        }
        else{
            getContentElement().innerHTML = "";
            getContentElement().insertAdjacentHTML("beforeend",
                `
                <div class="dm-container">
                    <div class="header">
                        <div class="icon"><img src="${stripHTML(icon)}"></div>
                        <div class="title">${sanitizeHtmlForRender(truncateText(title, 50), false)}</div>
                        
                        <div class="right-side">    
                                            
                           <div class="indicators">                           
                            </div>
                        
                            <div class="menu">
                                <img class="activator" src="/img/ellipsis.png">                                
                                
                                <ul></ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="content"></div>
                    <div class="footer">
                        <div id="editor-hints"></div>
                        <div class="editor"></div>
                    </div>
                </div>
            `
            )
        }

        // menu handler
        getContentElement().addEventListener("click", e => {
            const menu = e.target.closest(".menu");

            getContentElement().querySelectorAll(".menu.open").forEach(m => {
                if (m !== menu) m.classList.remove("open");
            });

            if (menu) {
                menu.classList.toggle("open");
            }
        });

        observeContainer();
        let dmMessages = await getDmRoomMessages(roomId);

        // display messages if no messages are found.
        // that if could be used to show when there are no messages.
        if(Object.keys(dmMessages?.messages || {})?.length > 0){
            await displayMessagesInElement({
                data: Object.values(dmMessages.messages).reverse(),
                channelId: roomId,
                container: getContentMainContainer(),
                appendTop: false,
                index: null,
                refElement: null,
                messageType: "dm",
                getChannel: () => {
                    return roomId
                }
            })

            displayAwaitedMessages(getContentMainContainer())

            requestAnimationFrame(() => {
                scrollDown("dm", {
                    tolerancePx: 10
                });
            })
        }

        await updateMarkdownLinks(2000)
        await updateHeaderStatusIcons({
            currentDmObj
        });


        // after rendering stuff we will display the editor as it cant be placed into the html directly etc
        const dmEditor = new RichEditor({
            selector: ".layout.home .content .dm-container .footer .editor",
            toolbar: [
                ["bold", "italic", "underline", "strike"],
                ["clean", "link", "image", "video"],
                ["code", "code-block", "blockquote"]
            ],
            onImg: async (src) => {
                let upload = await ChatManager.srcToFile(src);
                dmEditor.insertImage(upload.path)
            },
            onSend: async(html) => {
                let wasSent = await sendDmMessage(html, currentDmObj)
                dmEditor.clear()
            }
        });

        window.quill = dmEditor.quill;
        editorHints = document.getElementById("editor-hints");
        window.editor = dmEditor.editorEl.querySelector(".ql-editor");
        markDmInNav(roomId);
    }
    else{
        startDmWith(ChatManager.getUrlParams("dm"))
    }
}

function markDmInNav(roomId){
    getNavContainer()?.querySelectorAll(`.entry`).forEach(x => {
        if(x?.classList.contains("selected")) x.classList.remove("selected");
    })
    getDMsNavContainer()?.querySelector(`.entry[data-room-id='${roomId}']`).classList.add("selected")
}

async function sendDmMessage(text, currentDmObj){
    if(!text) throw new Error("text is required");

    let payload = {
        data: {
            message: {},
            roomId: ChatManager.getUrlParams("dm"),
            author: {
                id: UserManager.getID(),
            },
            reply: {
                id: replyMessageId ?? null
            },
            timestamp: new Date().getTime()
        },
        messageEditId: editMessageId,
    }

    await setPayloadText(text, payload, currentDmObj);

    socket.emit("sendDmMessage", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        payload
    }, function (response) {
        if(response?.error){
            console.error("Couldnt send message:", response.error)
        }
    });

    async function setPayloadText(text, payload, currentDmObj){
        if (await Client() && Crypto.getE2EE() === true) {
            let plainText = text;

            try {
                for(let participant of Object.values(currentDmObj.participants)){
                    if (!participant.publicKey || participant.publicKey.length === 0){
                        // if the participant has NO public key, we will encrypt the message with our public key
                        // so that the participant will see its encrypted etc and the entire logic for showing the error etc
                        // will still work
                        payload.data.message[participant.id] = await Crypto.EncryptEnvelope(plainText, await Crypto.getPublicKey());
                    }
                    else{
                        payload.data.message[participant.id] = await Crypto.EncryptEnvelope(plainText, participant.publicKey); // encrypt for receiver
                    }
                }
                payload.data.encrypted = true; // just a simple flag
                payload.data.plainSig = await Client().SignString(plainText); // used to verify plaintext

                payload.data = await Crypto.signJson(payload.data); // signs everything to make it tamper proof
                // its shit like this that i absolutely love!!
                // theoretically other platforms could implement a plain text sig too
                // and still be able to handle encrypted message reports securely
                // without ever having to decrypt the data etc, therefore ensuring
                // privacy and moderation without compromises.
            } catch (msgEncryptionError) {
                console.error(msgEncryptionError);
            }
        }
        // and for the web client we do the same but in plain text
        else{
            for(let participant of Object.values(currentDmObj.participants)){
                payload.data.message[participant.id] = text;
            }
        }
    }
}


async function createDmRoom(participants){
    if(!participants) throw new Error("participants is required");
    if(!Array.isArray(participants)) throw new Error("participants is not an array");

    return new Promise(resolve => {
        socket.emit("createDmRoom", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            participants
        }, function (response) {
            resolve(response)
        });
    })
}

async function getDmRoomMessages(roomId, timestamp = null){
    if(!roomId) throw new Error("Room ID is required");

    return new Promise((resolve, reject) => {
        socket.emit('getDmRoomMessages', {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            roomId,
        }, (response) => {
            resolve(response)
        });
    })
}

async function joinDmRoom(roomId){
    if(!roomId) throw new Error("Room ID is required");

    return new Promise((resolve, reject) => {
        socket.emit('joinDmRoom', {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            roomId,
        }, (response) => {
            resolve(response)
        });
    })
}

async function getDmRooms(){
    return new Promise((resolve, reject) => {
        socket.emit('getDmRooms', {
            id: UserManager.getID(),
            token: UserManager.getToken(),
        }, (response) => {
            resolve(response)
        });
    })
}