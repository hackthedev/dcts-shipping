let tooltipSystem;
let customPrompts;

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
            console.log(response);
            addNewMessageToChatLog(response.payload, "dm")
        }
    })

    socket.on('roomInvitation', async function (response) {
        renderDMs();
    })
});

async function onEditMsg(threadId, messageId, targetId) {
    const t = CONFIG.threads.find(x => x.id === threadId);
    const m = (t?.messages || []).find(x => x.messageId === messageId);
    if (!m) {
        console.warn('Message not found', messageId);
        return;
    }

    let msg = m.text.content;
    let isEncrypted = isEncryptedMessage(msg)

    // if a message is encrypted we need to decrypt it again
    // and then edit that to later re-encrypt it. yep.
    if (isEncrypted) {
        if (isLauncher()) {
            msg = await Crypto.DecryptEnvelope(msg);
        } else {
            // show error and abort
            customPrompts.showConfirm("You can only edit encrypted messages with the desktop client!");
            return;
        }
    }

    customPrompts.showPrompt(
        isEncrypted ? "Edit encrypted message" : "Edit Message",
        `
              <div style="margin: 10px 0;">
                <textarea rows=10 class="prompt-input" type="text" name="editText">${encodePlainText(msg)}</textarea>
              </div>
            `,
        async (values) => {
            let text = values.editText;
            if (!text || text.length <= 0) return;

            let payload = {
                encrypted: false,
                content: text,
                sender: null,
                plainSig: null,
            }

            // if its encrypted we encrypt it again
            if (isEncrypted) {
                if (isLauncher()) {
                    let targetPublicKey = await UserManager.requestPublicKey(targetId);
                    if (targetPublicKey.error !== null) {
                        console.error("Couldnt encrypt edited message");
                        return;
                    }

                    payload.content = await Crypto.EncryptEnvelope(text, targetPublicKey.publicKey);
                    payload.sender = await Crypto.EncryptEnvelope(text);
                    payload.plainSig = await Client().SignString(text);
                    payload.encrypted = true;
                    payload = await Crypto.signJson(payload);
                } // no else as the above check should catch it
            }

            socket.emit("editMessage", {
                messageId,
                payload,
                token: UserManager.getToken(),
                id: UserManager.getID()
            }, (ack) => {
                if (ack?.type !== "success") alert("Edit failed");
                console.log(ack);
            });
        },
        ["Update", null],
        false,
        400
    );
}


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

function getDmRoomInfo(dm){
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
        }else{
            dmRoomIcon = oppositeParticipant?.icon ?? "/img/default_icon.png";
            dmRoomName = oppositeParticipant?.name;
        }
    }

    return {
        icon: dmRoomIcon,
        title: dmRoomName,
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
            let {icon, title} = getDmRoomInfo(dm);
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

async function renderDmRoom(roomId){
    if(!roomId) throw new Error("Room ID is required");

    ChatManager.setUrlParam("dm", roomId)

    let dms = await getDmRooms();
    let dmRooms = dms?.rooms;

    let currentDmObj = Object.values(dmRooms ?? {}).find(x => x.roomId === roomId);

    if(currentDmObj){
        let {icon, title} = getDmRoomInfo(currentDmObj);
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
                        <div class="title">${sanitizeHtmlForRender(title, false)}</div>
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
                console.log("scrolled down")
            })
        }

        await updateMarkdownLinks(2000)

        // after rendering stuff we will display the editor as it cant be placed into the html directly etc
        const dmEditor = new RichEditor({
            selector: ".layout.home .content .dm-container .footer .editor",
            toolbar: [
                ["bold", "italic", "underline", "strike"],
                ["clean", "link", "image", "video"],
                ["code", "code-block", "blockquote"]
            ],
            onImg: async (src) => {
                console.log("Uploading and replacing src " + src)
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
            message: text,
            roomId: ChatManager.getUrlParams("dm"),
            author: {
                id: UserManager.getID(),
            },
            reply: {
                id: replyMessageId ?? null
            },
            timestamp: new Date().getTime()
        }
    }

    if (await Client() && getDmRoomCount(currentDmObj) <= 2) {
        let target = Object.values(currentDmObj.participants).find(x => x.id !== UserManager.getID())
        let targetPublicKey = await UserManager.requestPublicKey(target);

        if (true /*targetPublicKey?.error === null && targetPublicKey?.publicKey?.length > 10*/) {
            let plainText = payload.data.message;
            try {
                payload.data.message = await Crypto.EncryptEnvelope(plainText, targetPublicKey?.publicKey); // encrypt for receiver
                payload.data.sender = await Crypto.EncryptEnvelope(plainText);  // encrypt so you can read it yourself lol
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
        } else {
            console.warn("Couldnt get public key from target user ", target);
            console.warn(targetPublicKey)
        }
    }

    socket.emit("sendDmMessage", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        payload
    }, function (response) {
        if(response?.error){
            console.error("Couldnt send message:", response.error)
        }
    });
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