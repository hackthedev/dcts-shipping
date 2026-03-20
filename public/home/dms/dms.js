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
});

async function renderMessages(thread) {
    if (!socket.connected) return;
    const area = document.getElementById('threadArea');
    if (!area) return;
    area.innerHTML = "";

    const cutoff = thread.lastReadAt ? +new Date(thread.lastReadAt) : null;
    let dividerPlaced = false;

    let previousMessage = null;
    let previousElement = null;
    for (let message of thread.messages) {
        const ts = message.ts ? +new Date(message.ts) : 0;

        // needed
        if (!message?.text?.sender) message.text.sender = message?.text?.content;


        if (!dividerPlaced && cutoff && ts > cutoff && message.authorId !== CURRENT_USER_ID) {
            const divi = document.createElement('div');
            divi.style.cssText = "text-align:center;opacity:.7;font-size:11px;margin:0 0;";
            divi.textContent = "— New —";
            area.appendChild(divi);
            dividerPlaced = true;
        }

        const mine = message.authorId === CURRENT_USER_ID;
        const name = displayNameForMessage(message);
        const div = document.createElement('div');
        div.className = 'msg' + (mine ? ' mine' : '');


        const canEdit = message.authorId === CURRENT_USER_ID;
        const canDelete = message.authorId === CURRENT_USER_ID;

        // system is allowed to use html messages hehehe
        const isSystem = message.authorId === "system";

        // get other participant
        let target = otherParticipant(thread);
        let messageText = await getMessageText(message, mine, target.id);
        let isEncrypted = isEncryptedMessage(message, mine);

        message.plainText = messageText;
        message = makeMessageCompatible(message, messageText, isSystem);

        div.setAttribute("data-thread-id", thread.id);
        div.setAttribute("data-target-id", target.id);

        // now handle display logic
        let minutesPassed = compareTimestamps(new Date(message.ts).getTime(), new Date(previousMessage?.ts).getTime());
        let appendMessage = Math.abs(minutesPassed) <= 5 && message?.authorId === previousMessage?.authorId;
        let previousElementContent = previousElement?.querySelector('.contentRows');
        let duplicateMessage = previousElementContent?.querySelector(`.content[data-message-id="${message.messageId}"]`);

        if (appendMessage && previousMessage && previousElementContent && !isSystem && !duplicateMessage) {
            previousElementContent.innerHTML += await createMsgHTML({
                message,
                append: true,
                createActions: false,
            })

            continue;
        } else {
            div.innerHTML = await createMsgHTML({
                message,
                append: false,
                createActions: false,
            })
        }


        area.appendChild(div);
        previousElement = div;
        previousMessage = JSON.parse(JSON.stringify(message));


        /*div.innerHTML = `
          <div>${messageText}</div>
          <div class="meta">
            ${encodePlainText(new Date(message.ts).toLocaleString() || '')}
            <span style="margin-left:8px; opacity:.8;">
              ${canEdit ? `<button class="linkBtn" onclick="onEditMsg('${thread.id}','${message.id}', '${target}')">Edit</button>` : ''}
              ${canDelete ? `<button class="linkBtn" onclick="onDeleteMsg('${thread.id}','${message.id}')">Delete</button>` : ''}
              ${mine === false && isSystem === false && ( (isEncrypted === false && isLauncher()) || (isEncrypted === true && isLauncher()) ) ? `<button class="linkBtn" onclick="onReportMsg('${thread.id}','${message.id}', '${messageText}')">Report</button>` : ""}
            </span>
          </div>`;*/
    }

    area.scrollTop = area.scrollHeight;

    socket.emit('markRead', {
        threadId: thread.id,
        id: UserManager.getID(),
        token: UserManager.getToken(),
    }, (ack) => {
        if (ack?.type === 'success') {
            thread.lastReadAt = ack.last_read_at;
            thread.unread = 0;
        }
    });
}

function makeMessageCompatible(message, messageText, isSystem) {
    // ok now we need to make this shit compatible now.
    // make structure compatible for message display pipeline
    message.message = messageText;
    if (!message?.author) {
        message.author = {
            id: message?.authorId.replace("m_", ""),
        }
    }
    // fix sig structure check
    if (message?.text?.plainSig) message.sig = message.text.plainSig;
    // fix system message type to not show system notification
    // like member joined messages
    if (isSystem) {
        message.author.name = "System";
    }

    if (!message?.messageId) message.messageId = message.id.replace("m_", "");
    return message;
}

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


async function sendMessage(thread) {
    const identity = document.getElementById("ticketIdentity")?.value || "self";
    const inp = document.getElementById("sendInput");
    const txt = (inp?.value || "").trim();
    if (!txt) return;

    let payload = {
        threadId: STATE.activeThreadId,
        authorId: CURRENT_USER_ID,
        text: {
            content: txt,
            sender: null,
            encrypted: false,
            plainSig: null,
        },
        supportIdentity: identity,
        authorName: UserManager.getUsername(),
        token: UserManager.getToken(),
        id: UserManager.getID()
    }


    if (await Client() && thread.type !== "ticket") {
        let target = (thread.participants.filter(x => x !== UserManager.getID()))[0];
        let targetPublicKey = await UserManager.requestPublicKey(target);

        if (targetPublicKey?.error === null && targetPublicKey?.publicKey?.length > 10) {
            let plainText = payload.text.content;
            try {
                console.log(await Crypto.EncryptEnvelope(plainText, targetPublicKey?.publicKey))
                payload.text.content = await Crypto.EncryptEnvelope(plainText, targetPublicKey?.publicKey); // encrypt for receiver
                payload.text.sender = await Crypto.EncryptEnvelope(plainText);  // encrypt so you can read it yourself lol
                payload.text.encrypted = true; // just a simple flag
                payload.text.plainSig = await Client().SignString(plainText); // used to verify plaintext

                payload.text = await Crypto.signJson(payload.text); // signs everything to make it tamper proof
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

    socket.emit("sendMessage", payload, (ack) => {
        if (ack?.type === "success") inp.value = "";
    });
}

function startDmWith(id) {
    if (!id) {
        id = ChatManager.getDMFromUrl();
        if (!id) return;
    }

    window.history.replaceState(null, null, `?dm=${id}`);

    // check if exists etc
}

function slugify(str) {
    return (str || '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 60);
}

function getDMsNavContainer(){
    return document.querySelector("#navigation.home .dms");
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
        dmRoomIcon = oppositeParticipant?.icon ?? "/img/default_icon.png";
        dmRoomName = oppositeParticipant?.name;
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
        for(let dm of dmRooms){

            // here we get the amount of members inside one dm room.
            // 2 members are pretty much just a normal dm, whereas more than 2
            // could be considered a dm group chat.
            let {icon, title} = getDmRoomInfo(dm);

            getDMsNavContainer().insertAdjacentHTML('beforeend',
                `<a class="entry ${!firstDm ? "selected" : ""}" data-room-id="${dm.roomId}" onclick="renderDmRoom('${dm.roomId}')">
                        <img class="icon" src="${stripHTML(icon)}">
                        <div class="info">
                            <p>${title}</p>
                            <p class="status">${dm.status ?? ""}</p>
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

    let targetRoom = Object.values(dmRooms).find(x => x.roomId === roomId);
    if(targetRoom){
        let {icon, title} = getDmRoomInfo(targetRoom);
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
                editor.insertImage(upload.path)
            },
            onSend: async(html) => {
                let wasSent = await sendDmMessage(html)
                dmEditor.clear()
            }
        });

        window.quill = dmEditor.quill;
        editorHints = document.getElementById("editor-hints");
        window.editor = dmEditor.editorEl.querySelector(".ql-editor");
    }
}

async function sendDmMessage(text){
    if(!text) throw new Error("text is required");

    let payload = {
        message: text,
        roomId: ChatManager.getUrlParams("dm"),
        author: {
            id: UserManager.getID(),
        },
        reply: {
            id: replyMessageId ?? null
        }
    }

    // todo: add signing and crypto shit

    socket.emit("sendDmMessage", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        message: payload
    }, function (response) {
        console.log(response)
        if(!response?.error && response.message){
            addNewMessageToChatLog(response.message, "dm")
        }
    });
}


async function createDmRoom(){
    socket.emit("createDmRoom", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        participants: ["123456789012"]
    }, function (response) {
        console.log(response)
    });
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