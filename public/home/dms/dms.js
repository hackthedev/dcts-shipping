let socket = {};
socket.on = () => {}
socket.emit = () => {}

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

const ICONS = {
    edit_black: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#000" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.5l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
    edit: `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.5l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
    pin: `<svg viewBox="0 0 24 24"><path d="M16 9V3H8v6l-2 4v2h6v7l2-7h4v-2l-2-4z"/></svg>`,
    unpin: `<svg viewBox="0 0 24 24"><path d="M3 5.27 4.28 4l15.5 15.5L18.5 21l-6.5-6.5L9 21v-7H5v-2l2-4V5h1.73L3 5.27zM16 9l2 4v2h-2.73l-5-5H16V3h-2v4h2v2z"/></svg>`,
    del: `<svg viewBox="0 0 24 24"><path d="M6 7h12v2H6V7zm2 3h8l-1 9H9L8 10zm3-6h2l1 1h4v2H6V5h4l1-1z"/></svg>`
};

function editHero() {
    customPrompts.showPrompt(
        "Edit Home",
        `
          <div style="margin: 20px 0;">
            <label class="prompt-label">Title</label>
            <input type="text" class="prompt-input" name="homeTitle" value="${CONFIG.heroTitle}">
          </div>

          <div style="margin: 20px 0;">
            <label class="prompt-label">Subtitle</label>
            <input type="text" class="prompt-input" name="homeSubtitle" value="${CONFIG.heroSubtitle}">
          </div>

          <div style="margin: 20px 0;">
             <div class="prompt-form-group">
                  <label class="prompt-label" for="bannerImage">Banner Image</label>

                  <div class="profile-image-container" id="bannerImageContainer" onclick="document.getElementById('bannerImage').click()" style="width: 100% !important; border-radius: 8px !important;${CONFIG.bannerUrl ? `background-image: url('${CONFIG.bannerUrl}` : ""}'); background-size: cover;">
                      <img id="bannerImagePreview" src="${CONFIG.bannerUrl ? `${CONFIG.bannerUrl}` : ""}" alt="Banner Image" class="profile-image-preview">
                  </div>
                  <input class="prompt-input" type="file" name="bannerImage" id="bannerImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
              </div>
          </div>

          <li class="prompt-note">Click to choose a image and upload it automatically</li>
          <li class="prompt-note">Changes will apply upon pressing "Save"</li>
        `,

        async (values) => {

            let homeTitle = values.homeTitle;
            let homeSubtitle = values.homeSubtitle;
            let homeBannerUrl = "";

            // check banner and upload new one
            if (values.bannerImage) {
                const bannerUrl = await upload(values.bannerImage);

                if (!bannerUrl.error) {
                    console.log('Banner Image :', bannerUrl.urls);
                    homeBannerUrl = bannerUrl.urls;
                }
            }

            socket.emit("updateHero", {
                token: UserManager.getToken(), id: UserManager.getID(),
                bannerUrl: homeBannerUrl, title: values.homeTitle, subtitle: values.homeSubtitle
            }, async (response) => {
                if (response?.type !== "success") {
                    showSystemMessage({
                        title: response.title || "",
                        text: response.msg || response.error || "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: response.displayTime || 3000
                    });
                }

                // title
                if (homeTitle) {
                    CONFIG.heroTitle = homeTitle;
                }

                // subtitle
                if (homeSubtitle) {
                    CONFIG.heroSubtitle = homeSubtitle;
                }

                // banner
                if (homeBannerUrl) {
                    CONFIG.bannerUrl = homeBannerUrl;
                }

                showServerHome();
            });
        },
        ["Save", null],
        false,
        400
    );
}

function editHeroAbout() {
    customPrompts.showPrompt(
        "Edit Home",
        `
          <div style="margin: 20px 0;">
            <label class="prompt-label">About</label>
            <textarea rows=10 type="text" class="prompt-input" name="homeAbout" >${CONFIG.aboutHtml}</textarea
          </div>         
        `,

        async (values) => {

            // convert plain text back to html.
            // would be hard to edit if already rendered as html am i right
            let homeAbout = values.homeAbout;

            socket.emit("updateHeroAbout", {
                token: UserManager.getToken(), id: UserManager.getID(),
                about: homeAbout
            }, (response) => {

                if (response?.type !== "success") {
                    showSystemMessage({
                        title: response.title || "",
                        text: response.msg || response.error || "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: response.displayTime || 3000
                    });

                    return;
                }

                // about
                if (homeAbout) {
                    CONFIG.aboutHtml = homeAbout;
                }

                showServerHome();

            });
        },
        ["Save", null],
        false,
        400
    );
}



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

    // find an existing 1:1 DM
    const existing = CONFIG.threads.find(t => {
        if (!t || t.type === 'ticket') return false;
        const parts = Array.isArray(t.participants) ? t.participants.map(String) : [];
        // only consider true 1:1 threads
        if (parts.length !== 2) return false;
        return parts.includes(String(id)) && parts.includes(String(CURRENT_USER_ID));
    });

    if (existing) {
        openThread(existing.id);
        return;
    }

    // no existing 1:1 DM
    socket.emit('createThread', {
        type: 'dm',
        title: null,
        participants: [CURRENT_USER_ID, id],
        token: UserManager.getToken(),
        id: UserManager.getID()
    }, (ack) => {
        if (ack?.type !== 'success' || !ack.threadId) {
            console.warn('createThread failed', ack);
            return;
        }
        openThread(ack.threadId);
    });
}


function slugify(str) {
    return (str || '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 60);
}

// user connected must always happen before
socket.emit("userConnected", {
    id: UserManager.getID(), name: UserManager.getUsername(), icon: UserManager.getPFP(),
    status: UserManager.getStatus(), token: UserManager.getToken(),
    aboutme: UserManager.getAboutme(), banner: UserManager.getBanner(),
    pow: {
        challenge: localStorage.getItem("pow_challenge"),
        solution: localStorage.getItem("pow_solution")
    }
}, function (response) {

    // basically entry point
    initPow(() => {


        //introduceNewHome();
    });
});

async function getDMs(timestamp = null){

    return [
        {
            author:{
                id: 1234,
                name: "Your mom",
                status: "ligma ballz",
                icon: "/img/default_pfp.png"
            }
        },
        {
            author:{
                id: 56789,
                name: "WhiskeyCat",
                status: "yooooo",
                icon: "/img/default_pfp.png"
            }
        }
    ]

    return new Promise((resolve, reject) => {
        socket.emit('fetchDMs', {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            timestamp
        }, (response) => {
            console.log(response)
        });
    })
}

function getDMsNavContainer(){
    return document.querySelector("#navigation.home .dms");
}

async function renderDMs(){
    let dms = await getDMs();

    console.log(dms)

    let firstDm = false
    if(dms?.length > 0){
        for(let dm of dms){

            getDMsNavContainer().insertAdjacentHTML('beforeend',
            `<a class="entry ${!firstDm ? "selected" : ""}">
                        <img class="icon" src="${stripHTML(sanitizeHtmlForRender(dm.author.icon, false))}">
                        <div class="info">
                            <p>${dm.author.name}</p>
                            <p class="status">${dm.author.status ?? ""}</p>
                        </div>
                    </a>`
            )

            firstDm = true
        }
    }
}