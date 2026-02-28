
document.addEventListener("DOMContentLoaded", function () {
    ContextMenu.registerContextMenu(
        "servermessage",
        [
            ".contentRows .content",
            ".contentRows .content p",
            ".contentRows .content a",
            ".contentRows .content .iframe-container",
            ".contentRows .content span",
            ".message-container",
            ".message-container .row",
            ".message-container div"
        ],
        [
            {
                icon: "&#9998;",
                text: "Edit Message",
                callback: async (data) => {
                    let element = data.element;
                    let messageId = getMessageIdFromElement(element);
                    let isDM = !!document.querySelector(".threadArea")

                    if(isDM){
                        let msgElement = element.closest(".msg");
                        let threadId = msgElement.getAttribute("data-thread-id")
                        let targetId = msgElement.getAttribute("data-target-id")
                        if(onEditMsg){
                            onEditMsg(threadId, messageId, targetId)
                            return;
                        }

                        throw new Error("Editing messages in DMs is not supported yet")
                    }

                    editMessage(messageId);
                },
                condition: async (data) => {
                    let element = data.element;
                    let memberId = getMemberIdFromElement(element);

                    return (memberId === UserManager.getID())
                },
                type: "ok"
            },
            {
                icon: "&#128465;",
                text: "Delete Message",
                callback: async (data) => {
                    let element = data.element;
                    let messageId = getMessageIdFromElement(element) || data.element?.getAttribute("data-message-id");
                    let isDM = !!document.querySelector(".threadArea")

                    deleteMessageFromChat(messageId, isDM ? "dm" : "message");
                },
                condition: async (data) => {
                    console.log(data)
                    let element = data.element;
                    let memberId = getMemberIdFromElement(element);
                    return ((memberId === UserManager.getID()) || await UserManager.checkPermission("manageMessages") === true)
                },
                type: "error"
            },
            {
                icon: "&#9888;",
                text: "Report Message",
                callback: async (data) => {
                    let element = data.element;
                    let messageId = getMessageIdFromElement(element);
                    
                    let isDM = !!document.querySelector(".threadArea")
                    let plainText = decodeURIComponent(element?.closest(".content")?.getAttribute("data-plain-text"))
                    UserReports.reportMessage(messageId, isDM ? "dm" : "message", plainText)
                },
                condition: async (data) => {
                    let element = data.element;
                    let memberId = getMemberIdFromElement(element);
                    return (memberId !== UserManager.getID())
                },
                type: "warning"
            }
        ])

    ContextMenu.registerDoubleClickEvent(
        "openProfileDbl",
        [".content"],
        async (data) => {
            if(data?.element){
                let contentDiv = data.element.closest(".content:not(.reply)");
                if(!contentDiv) return;

                let messageId = contentDiv.getAttribute("data-message-id");
                let memberId = contentDiv.getAttribute("data-member-id");
                if(!messageId) return;

                // if we double click our message, lets edit it,
                // otherwise reply to it
                if(memberId === UserManager.getID()) {
                    editMessage(messageId)
                }
                else{
                    replyToMessage(messageId)
                }
            }
        }
    );



    ContextMenu.registerClickEvent(
        "embedImagePopup",
        [
            ".message-container .image-embed-container .image-embed",
            ".message-container .content img",
        ],
        async (data) => {
            let src = data.element.getAttribute("src");
            if (!src) {
                console.warn("Couldnt get img embed src");
                return;
            }

            // no img viewer on reactions
            if(data.element.parentNode?.classList?.contains("message-reaction-entry")) return;


            showImagePopup(src)
        }
    )


    ContextMenu.registerClickEvent(
        "message_reply_navigate",
        [
            ".row.reply .content.reply"
        ],
        async (data) => {
            let messageId = data.element.getAttribute("data-message-id");
            if(messageId) {
                navigateToMessage(messageId)
            }
            else{
                console.warn("Couldnt navigate to message from reply because messageid wasnt found")
            }
        }
    )

    ContextMenu.registerClickEvent(
        "video_click_event",
        [
            ".video-embed"
        ],
        async (data) => {
            handleVideoClick(data.event, data.element)
        }
    )

    ContextMenu.registerClickEvent(
        "message_reactions_toggler",
        [
            ".message-reaction-entry"
        ],
        async (data) => {
            let messageId = findAttributeUp(data.element, "data-message-id");
            let emojiHash = findAttributeUp(data.element, "data-emoji-hash")

            let messageObj = await ChatManager.resolveMessage(messageId);
            if(messageObj?.reactions.hasOwnProperty(emojiHash)){
                if(messageObj.reactions[emojiHash]?.includes(UserManager.getID() )){
                    removeMessageReaction(messageId, emojiHash)
                }
                else{
                    addMessageReaction(messageId, emojiHash)
                }
            }
        }
    )


    // embeds
    ContextMenu.registerContextMenu(
        "embeds",
        [
            ".image-embed-container img",
            ".video-embed",
            ".emoji-entry img",
            ".message-container .contentRows img",
            "#popup-content img",
        ],
        [
            {
                icon: "&#9741;",
                text: "Open in new tab",
                callback: async (data) => {
                    let url = data.element.src || data.element?.getAttribute("data-src")
                    if (!url) {
                        console.warn("Couldnt copy link because src wasnt found");
                        return;
                    }

                    openNewTab(url);
                }
            },
            {
                icon: "&#9741;",
                text: "Copy Link",
                callback: async (data) => {
                    let url = data.element?.getAttribute("data-original-url") || data.element.src || data.element?.getAttribute("data-src")
                    if (!url) {
                        console.warn("Couldnt copy link because src wasnt found");
                        return;
                    }

                    navigator.clipboard.writeText(url);
                }
            }
        ]
    );

    socket.on('receiveDeleteMessage', function (id) {
        try {
            var message = getMessageElementFromId(id)
            if (!message) {
                console.warn("Couldnt get message object in delete event");
                return;
            }

            let container = getMessageContainerFromMessage(message);
            if (!container) {
                console.warn("Couldnt get message cotnainer from message in delete event");
                return;
            }

            // now we delete the message to get the count afterwards
            message.remove();

            // also remove message actions
            if(container.querySelector(".row.reply")){
                container.querySelector(".row.reply").remove();
            }

            // if no message left, delete entire container too
            if(container.querySelectorAll(".content").length === 0){
                container.remove();
            }

            ChatManager.decreaseChannelMarkerCount(UserManager.getChannel());
        } catch (err) {
            console.log(err)
        }
    });



    socket.on('messageEdited', async function (message) {
        let markdownResult = await markdown(message.message, message.messageId);
        if (!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
        if (markdownResult.isMarkdown) message.message = markdownResult.message;

        let editElement = getMessageElementFromId(message.messageId);
        try{ message.message = await text2Emoji(message.message) } catch {}
        //editElement.innerHTML = message.message;

        let convertedMentions = await convertMention(message);
        editElement.innerHTML= convertedMentions.text
        editElement.innerHTML= sanitizeHtmlForRender(convertedMentions.text)

        editElement.innerHTML += getMessageEditedHTML(message);
        editElement.innerHTML += createMsgActions(message.messageId);

        if(isScrolledToBottom(document.getElementById("content"))) scrollDown("messageEdited")
    });
})

function registerMessageCreateEvent(){
    socket.on('updateReactions', function (messageObj) {
        updateMessageReactionsElementById(messageObj?.messageId);
    });

    
    socket.on('messageCreate', async function (message) {
        let container = document.getElementById("content");
        let isScrolledDown = isScrolledToBottom(container, 20);



        // lets increase the channel count first
        ChatManager.increaseChannelMarkerCount(message.channel)
        // then mark it for ourselves
        ChatManager.setChannelMarkerCounter(UserManager.getChannel())

        // the message was not created in the room we're currently in, but thats fine.
        // we will instead show the notification icon and return;
        if(message.room !== UserManager.getRoom()){
            ChatManager.setChannelMarker(message.channel, true);
            await updateUIIndicators(message)
            return;
        }

        if (await shouldAppendMessage(container, message) === true) {
            await showMessageInChat({
                container,
                message,
                append: true,
                mentions: true,
                pingMentions: true
            });
        } else {
            await showMessageInChat({
                container,
                message,
                append: false,
                mentions: true,
                pingMentions: true
            });
        }


        if(isScrolledDown) {
            scrollDown("messageCreated");
        }

        await updateUIIndicators(message)
    });

    async function updateUIIndicators(message){
        if(message.channel === UserManager.getChannel()) await Inbox.markAsRead(`${UserManager.getID()}-${message.messageId}`)

        setTimeout(() => {
            Inbox.updateInboxMessageEntries()
        }, 500)
    }
}

function registerMessageInfiniteLoad(element){
    element.addEventListener("scroll", async function () {
        if (element.scrollTop === 0) {
            const topElement = getFirstMessage(element);
            if (!topElement) return;

            const timeStamp = Number(topElement?.element?.getAttribute("data-timestamp"));
            await getChatlog(element, timeStamp, true, getScrollPosition(element, topElement?.element));
        }
    });
}


let editMessageId = null;
let replyMessageId = null;

function cancelMessageReply() {
    replyMessageId = null;
    if(editorHints) editorHints.innerHTML = ""
}

function cancelMessageEdit() {
    editMessageId = null;
    if(editorHints) editorHints.innerHTML = ""
}

function showRateLimitNotice(){
    let isScrolledDown = isScrolledToBottom(document.getElementById("content"));
    if (replyMessageId == null && editorHints ) {
        if(editorHints?.querySelector("#ratelimitHint") != null) editorHints?.querySelector("#ratelimitHint").remove();

        editorHints.insertAdjacentHTML("afterbegin", `<p id="ratelimitHint" >The server has been rate limited</p>`)
    }

    if(isScrolledDown) scrollDown("showRateLimitNotice")
}

function showSlowmodeNotice(timestamp){
    let isScrolledDown = isScrolledToBottom(document.getElementById("content"));
    if (replyMessageId == null && editorHints ) {
        if(editorHints?.querySelector("#slowmodeHint") != null) editorHints?.querySelector("#slowmodeHint").remove();

        editorHints.insertAdjacentHTML("afterbegin", `<p id="slowmodeHint" >Slowmode is active! You need to wait for ${getReadableDuration(new Date(timestamp))}</p>`)
    }

    if(isScrolledDown) scrollDown("showSlowmodeNotice")
}

function replyToMessage(messageId) {
    if (editMessageId) cancelMessageEdit();
    if (replyMessageId == null && editorHints && editorHints?.querySelector("pre#editMsgHint") == null) {
        editorHints.insertAdjacentHTML("afterbegin", `<p id="editMsgHint" onclick='cancelMessageReply()'>You are replying to a message &#128942;</p>`)
    }
    replyMessageId = messageId;

    if(focusEditor) focusEditor()
}

function editMessage(id) {
    if (replyMessageId) cancelMessageReply();
    if (editMessageId == null && editorHints && editorHints?.querySelector("pre.editMsgHint") == null) {
        editorHints.insertAdjacentHTML("afterbegin", `<p id="editMsgHint" onclick='cancelMessageEdit()'>You are editing a message &#128942;</p>`)
    }

    let msgContent = document.querySelector(`.message-container .content[data-message-id="${id}"]`).cloneNode(true);
    if (msgContent.querySelector(".messageActions")) {
        msgContent.querySelector(".messageActions").remove()
    }

    if (msgContent.querySelector(".edit-notice")) {
        msgContent.querySelector(".edit-notice").remove()
    }

    // handle mentions
    let mentions = msgContent.querySelectorAll(".mention");
    mentions.forEach(m => {
        let raw = "";

        if (m.classList.contains("member")) {
            raw = `<@${m.getAttribute("data-member-id")}>`;
        } else if (m.classList.contains("role")) {
            raw = `<!@${m.getAttribute("data-role-id")}>`;
        } else if (m.classList.contains("channel")) {
            raw = `<#@${m.getAttribute("data-channel-id")}>`;
        }

        m.insertAdjacentText("beforebegin", raw);
        m.remove();
    });


    // replace all iframes
    const iframes = msgContent.querySelectorAll("iframe");
    // convert them back to urls
    if (iframes.length > 0) {
        iframes.forEach(iframe => {
            const src = iframe.getAttribute("src");
            const urlEl = document.createElement("p");
            urlEl.textContent = src && src.trim() !== "" ? src : "";
            iframe.parentNode.replaceChild(urlEl, iframe);
        });
    }

    // try to find emojis and remove the big classname
    let emojis = msgContent.querySelectorAll(`.inline-text-emoji.big`);

    if (emojis != null) {
        for (let i = 0; i < emojis.length; i++) {
            // Set reference
            let emoji = emojis[i];

            // Clone emoji
            emoji.classList.remove("big");
        }
    }
    editMessageId = msgContent.getAttribute("data-message-id");

    // remove all url embeds
    let embeds = msgContent.querySelectorAll(".markdown-urlEmbed");
    if(embeds?.length > 0){
        for(let embed of embeds) {
            let url = embed.getAttribute("href");
            embed.replaceWith(url);
        }
        msgContent.innerHTML = msgContent.innerHTML.replace(/\s+/g, " ").trim();
    }

    setTimeout(() => {
        const regex = /<p>\s*<\/p>/gm;
        if(quill) quill.pasteUnconverted(msgContent.innerHTML.replace(regex, ''));

        focusEditor()
    }, 1);
}

function getMemberIdFromElement(element) {
    return findAttributeUp(element, "data-member-id");
}

function findAttributeUp(element, attr, maxDepth = 10) {
    for (let i = 0; i <= maxDepth && element; i++) {
        const val = element.getAttribute?.(attr);
        if (val !== null) return val;
        element = element.parentNode;
    }
    return null;
}



function getMessageIdFromElement(element) {
    return findAttributeUp(element, "data-message-id");
}

function getMessageElementFromId(messageId) {
    return document.querySelector(`.message-container .content:not(.reply)[data-message-id="${messageId}"]`)
}

function getMessageContainerFromMessage(element) {
    return element.closest(".message-container")
}

function getMessageCountFromContainer(element) {
    return element?.querySelectorAll(".content")?.length || 0;
}

async function shouldAppendMessage(container, message, appendTop = false) {
    if(!container) throw new Error("Container wasnt supplied for shouldAppendMessage");
    let messageElement = appendTop === true ? getFirstMessage(container) : getLastMessage(container)
    let timestamp = 0

    if (messageElement?.element) {
        let lastMsgTimestamp = messageElement?.element?.getAttribute("data-timestamp")
        if (lastMsgTimestamp) timestamp = lastMsgTimestamp;
    }

    return compareTimestamps(message.timestamp, timestamp) <= 5 && String(messageElement?.element.getAttribute("data-member-id")) === String(message.author.id) && message?.reply?.messageId == null;
}

function compareTimestamps(stamp1, stamp2) {
    // Calculate time passed
    var firstdate = stamp1 / 1000;

    var seconddate = stamp2 / 1000;
    var diff = firstdate - seconddate;
    var minutesPassed = Math.round(diff / 60);

    return minutesPassed;
}

function getMessageEditedHTML(message) {
    return `
            <div class="edit-notice">
                <span>Edited </span> <span class="editedMsg">(${new Date(message.lastEdited).toLocaleString("narrow")})</span>
            </div>
            `;
}

async function showMessageInChat({
                                     container,
                                     scrollPosition = 0,
                                     message,
                                     append = false,
                                     location = "beforeend",
                                     appendTop = false,
                                     mentions = false,
                                     pingMentions = false,
                                     waitWithDisplay = false,
                                 } = {}) {

    let markdownResult = await markdown(message.message, message.messageId);
    if (markdownResult.isMarkdown) message.message = markdownResult.message;

    // convert mentions and check if own userid is in it
    let convertedMentions = await convertMention(message);
    let isMention = false;
    message.message = convertedMentions.text

    // convert emojis
    try{ message.message = await text2Emoji(message.message) } catch {}

    // convert emojis and mentions for replies too
    if(message?.reply?.message) {
        try{ message.reply.message = await text2Emoji(message.reply.message); } catch {}

        let convertedReplyMentions = await convertMention(message.reply);
        message.reply.message = convertedReplyMentions.text
    }

    let messageElement = appendTop ? getFirstMessage(container) : getLastMessage(container);

    // create message code structure
    var messagecode = "";
    if (message.isSystemMsg === true) {
        messagecode = await createMsgHTML({
            message,
            append: append,
            isSystem: true,
            isMention,
            waitWithDisplay
        });
    } else {
        // dont append if the previous message was a system message
        if (messageElement?.element?.classList.contains("system")) append = false;
        messagecode = await createMsgHTML({
            message,
            append,
            isSystem: false,
            isMention,
            waitWithDisplay
        });
    }

    // display it
    if (append === true && !message?.isSystemMsg) {
        if (messageElement?.element && !messageElement?.element?.classList.contains("system")) {
            if (appendTop) {
                let firstMessage = getFirstMessage(container);
                if (firstMessage?.parent) {
                    firstMessage.parent.querySelector(".contentRows")?.insertAdjacentHTML(location, messagecode);
                    await resolveMentions(message, pingMentions)
                    return;
                }
            } else {
                messageElement.element?.parentNode?.insertAdjacentHTML(location, messagecode);
                await resolveMentions(message, pingMentions)
            }
            return;
        }
    }

    addToChatLog(container, messagecode, appendTop);
    await resolveMentions(message, pingMentions)
}


async function fixScrollAfterMediaLoad(container, scrollPosition, manualScroll = false) {
    if (!scrollPosition) return;

    toggleSmoothScroll(container, false);

    if (manualScroll === true) {
        setScrollPosition(container, scrollPosition);
    }

    let stableFrames = 0;
    let lastDiff = 0;

    const tick = () => {
        const before = container.scrollTop;

        requestAnimationFrame(() => {
            setScrollPosition(container, scrollPosition);

            const after = container.scrollTop;
            const diff = after - before;

            if (diff === lastDiff) {
                stableFrames++;
            } else {
                stableFrames = 0;
                lastDiff = diff;
            }

            if (stableFrames < 3) {
                tick();
            } else {
                toggleSmoothScroll(container, true);
            }
        });
    };

    tick();
}





function truncateText(text, length) {
    let actualLength = 0;
    if (text?.length <= length) {
        actualLength = text.length;
    } else {
        actualLength = length;
    }

    if(text?.length > length){
        return text?.substring(0, actualLength) + "..."
    }

    return text?.substring(0, actualLength)
}

function hidePopup() {
    let popup = document.querySelector("#popup-container");
    let popupContent = document.querySelector("#popup-content");

    popupContent.style.opacity = "0";
    popup.style.opacity = "0";

    setTimeout(() => {
        popup.style.display = "none";
    }, 250)
}

function showPopup() {
    let popup = document.querySelector("#popup-container");
    let popupContent = document.querySelector("#popup-content");

    popupContent.innerHTML = "";
    popup.style.display = "flex";

    // render tick
    setTimeout(() => {
        popupContent.style.opacity = "1";
        popup.style.opacity = "1";
    }, 1)

    popupContent.onclick = hidePopup;
}

function showImagePopup(src) {
    let popup = document.querySelector("#popup-container");
    let popupContent = document.querySelector("#popup-content");

    if (popup && popupContent && src) {

        showPopup();
        let img = document.createElement("img");
        img.src = src;

        popupContent.appendChild(img);
        img.onclick = hidePopup;
        popup.onclick = hidePopup;
    } else {
        console.log("no sourrce or smtrhg")
    }
}

function navigateToMessage(messageId){
    let message = document.querySelector(`.message-container .content:not(.reply)[data-message-id="${messageId}"]`);
    if(message){
        message.scrollIntoView({behavior: "smooth"});

        if(!message.classList.contains("highlight")){
            message.classList.add("highlight");
            setTimeout(() => {
                message.classList.remove("highlight");
            }, 2000)
        }
    }
    else{
        console.log("Couldnt find message for navigation")
    }
}

function deleteMessageFromChat(id, type = "message") {
    if(type === "dm"){
        socket.emit("deleteDMMessage", {messageId: id, token: UserManager.getToken(), id: UserManager.getID()}, (ack) => {
            if (ack?.type !== "success"){
                console.log(ack)
            }
        });

        return;
    }

    socket.emit("deleteMessage", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        messageId: id,
        group: UserManager.getGroup(),
        category: UserManager.getCategory(),
        channel: UserManager.getChannel()
    });
}

async function updateMessageReactionsElementById(messageId, container = document.getElementById("content")){
    let wasScrolledDown = isScrolledToBottom(container);

    let contentContainer = document.querySelector(`.message-container .content:not(.reply)[data-message-id="${messageId}"]`);
    let reactionRow = document.querySelector(`.message-reaction-row[data-message-id="${messageId}"]`);

    let messageObj = await ChatManager.resolveMessage(messageId);
    if(!messageObj) return console.error(`Couldnt find message object for message reaction update ${messageId}`);

    // no reactions were presen^t so add the container
    if(!reactionRow) {
        contentContainer.innerHTML += await getMessageReactionsHTML(messageObj);
        reactionRow = document.querySelector(`.message-reaction-row[data-message-id="${messageId}"]`);
    }

    reactionRow.outerHTML = await getMessageReactionsHTML(messageObj);
    if(wasScrolledDown) scrollDown()
}

async function getMessageReactionsHTML(messageObj){
    if(!messageObj?.reactions || Object.keys(messageObj?.reactions)?.length === 0) return "";

    let row = document.createElement("div");
    row.innerHTML =
        `
        <div class="message-reaction-row" data-message-id="${messageObj.messageId}"></div>
        `;

    let reactionRowContainer = row.querySelector(".message-reaction-row");

    for(let emojiHash in messageObj.reactions){
        let emojiObj = findEmojiByID(emojiHash);
        if(!emojiObj) {
            console.error("Emoji Obj not found")
            continue
        }

        reactionRowContainer.innerHTML += getEmojiReactionRowEntryHTML(messageObj, emojiObj);
    }

    return row.innerHTML;

    function getEmojiReactionRowEntryHTML(messageObj, emojiObj){
        let emojiPath = emojiObj?.code ? `/img/default_emojis/${emojiObj.code}.svg` : `/emojis/${emojiObj.filename}`;
        let emojiDetails = extractEmojiDetails(emojiObj);
        let emojiHash = emojiDetails[0]

        if(!emojiHash){
            console.error(`Emoji hash not found for emoji in reactions for message ${messageObj.messageId}: ${emojiObj?.filename} { ${emojiDetails}`)
            return "";
        }

        let hasReacted = messageObj.reactions[emojiHash].includes(UserManager.getID());

        return `
            <div class="message-reaction-entry ${hasReacted ? 'reacted' : ""}" data-message-id="${messageObj.messageId}" data-emoji-hash="${emojiHash}">
                <img class="inline-text-emoji" src="${emojiPath}">
                <span>${messageObj.reactions[emojiHash]?.length}</span>
            </div>    
        `
    }
}

async function createMsgHTML({
                                 message,
                                 append = false,
                                 isSystem = false,
                                 isMention = false,
                                 waitWithDisplay = false,
                                 createActions = true
} = {}) {
    let isSigned = message?.sig?.length > 10;
    let reply = message?.reply;

    if (message?.lastEdited != null) {
        message.editCode = getMessageEditedHTML(message);
    }

    // dm compatibility
    if(!message?.timestamp && message?.ts){
        message.timestamp = message.ts;
    }

    if(!message?.author?.name && message?.author?.id !== 0){
        message.author = await ChatManager.resolveMember(message?.author?.id) || message.author;
    }

    let isBanned = message?.author?.isBanned;
    let messageReactionsRow = await getMessageReactionsHTML(message);

    let messageRow =
        `
        <div class="content ${isSystem ? "system" : ""} ${waitWithDisplay ? "waitForDisplay" : ""}"  
            ${message?.plainText ? `data-plain-text="${encodeURIComponent(message.plainText)}"` : ""}
            data-message-id="${message.messageId}" 
            data-member-id="${message?.author?.id}" 
            data-timestamp="${message.timestamp}">
            
            ${createActions === true ? createMsgActions(message?.author?.id, isSystem) : ""}
            ${sanitizeHtmlForRender(message.message)}  ${message?.editCode ? message?.editCode : ""}    
            
            ${messageReactionsRow ? messageReactionsRow : ""}
        </div>
        `

    if (append === true && isSystem === false && reply?.messageId == null) {
        return messageRow;
    }

    if(!message?.author?.name) message.author.name = "Unkown Member?";
    if(reply?.messageId && !reply?.author?.name) message.author.name = "Unkown Member?";

    // if message was a reply
    let replyCode = "";
    if(reply?.messageId){
        replyCode = `
            <div class="row reply" data-message-id="${reply?.messageId}" data-member-id="${reply?.author?.id}">            
                <!-- very creative name indeed -->
                <div class="box"></div>
            
                <div class="icon-container">    
                    <img class="icon" draggable="false" src="${reply?.author?.icon}" data-member-id="${reply?.author?.id}" onerror="this.src = '/img/default_pfp.png';">
                </div>
                <div class="meta">
                    <label class="username" data-member-id="${reply?.author?.id}" style="color: ${reply?.author?.color}; background: ${reply?.author?.background}; background-clip: ${reply?.author?.backgroundClip};">
                        ${sanitizeHtmlForRender(truncateText(reply?.author?.name, 25))}
                    </label>
                </div>
                <div class="content reply" data-message-id="${reply?.messageId}" data-member-id="${reply?.author?.id}" data-timestamp="${reply?.timestamp}">
                    ${unescapeHtmlEntities(sanitizeHtmlForRender(reply?.message), false) || "[ Click to view message ]"} 
                </div>
            </div>
        `;
    }

    return `
        <div class="message-container ${isSystem ? "system" : ""} ${isBanned && message?.isAdmin ? "banned" : ""} ${waitWithDisplay ? "waitForDisplay" : ""}" data-member-id="${message?.author?.id}">
            
            ${replyCode}
            <div class="row ${isSystem === true ? `system` : ""}" data-message-id="${message?.messageId}" data-member-id="${message?.id}">
                ${isSystem !== true ?
                `<div class="icon-container">
                    <img class="icon" draggable="false" src="${message?.author?.icon}" data-member-id="${message?.author?.id}" onerror="this.src = '/img/default_pfp.png';">
                </div>` : ""}
                
               <div class="content-container" data-message-id="${message?.messageId}" data-member-id="${message?.author?.id}"> <!-- for the flex layout -->
                 <div class="meta">
                    ${isSystem !== true ?
                    `<label class="username" data-member-id="${message?.author?.id}" style="color: ${message?.author?.color}; background: ${message?.author?.background}; background-clip: ${message?.author?.backgroundClip};">${sanitizeHtmlForRender(truncateText(message?.author?.name, 25))}</label>` : ""}
                    <label class="timestamp" data-timestamp="${message.timestamp}">
                        ${new Date(message.timestamp).toLocaleString("narrow")}
                        
                        <!-- fuck i love programming -->
                        <label style="filter: grayscale(75%);" title="Signed Message">
                            ${isSigned ? `&bull; &#128272;` : ""}
                        </label>
                        
                        <!-- banned indicator -->
                        <label style="filter: grayscale(75%);" title="Banned member">
                            ${isBanned ? `&bull; &#9940;` : ""}
                        </label>
                    </label>
                 </div>
                
                 <div class="contentRows" data-member-id="${message?.author?.id}">
                    ${messageRow}
                 </div>
                
               </div>
            </div>
        </div>`
}

function actionReply(element) {
    if (!element) {
        console.warn("Cant reply because no element supplied");
        return;
    }

    let messageContent = element.closest(".message-container .content:not(.reply)");
    if (!messageContent) {
        console.warn("Cant reply because no message content was found");
        return;
    }

    // dont reply to system messages
    if (messageContent.classList.contains("system")) {
        console.warn("Cant repply to system messages");
        return;
    }

    let messageId = messageContent.getAttribute("data-message-id");
    if (!messageId) {
        console.warn("Cant reply because no message id was found");
        return;
    }

    replyToMessage(messageId);
}

function reactToMessageFromAction(element){
    if(!element){
        console.error("couldnt react to message from action as element wasnt found");
        return;
    }

    let contentContainer = element.closest(".content");
    if(!contentContainer){
        console.error("couldnt react to message from action as content container wasnt found");
        return;
    }

    let messageId = contentContainer.getAttribute("data-message-id");
    let memberId = contentContainer.getAttribute("data-member-id");

    let clientRec = element.getBoundingClientRect();
    if(!messageId){
        console.error("couldnt react to message from action as message id wasnt found");
        return;
    }

    showEmojiPicker(clientRec.x, clientRec.y, async (emoji) => {
        let emojiDetails = extractEmojiDetails(emoji);
        let emojiHash = emojiDetails[0]

        addMessageReaction(messageId, emojiHash, emoji?.default);
    }, true);
}

async function addMessageReaction(messageId, emojiHash, isDefault = false){
    socket.emit("addMessageReaction", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        messageId,
        emojiHash,
        default: isDefault
    }, async (response) => {
        if(response?.error){
            console.log(response.error);
            showSystemMessage({
                title: "Error while reacting",
                message: response.error,
                type: "error"
            })
        }
    })
}

async function searchParentElement(element, selector){

}

async function removeMessageReaction(messageId, emojiHash){
    socket.emit("removeMessageReaction", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        messageId,
        emojiHash
    }, async (response) => {
        if(response?.error){
            console.log(response.error);
            showSystemMessage({
                title: "Error while reacting",
                message: response.error,
                type: "error"
            })
        }
    })
}

function createMsgActions(messageId, isSystem = false) {

    return `<div class="messageActions">
                ${isSystem === false ? `<button style="" title="React" class="react" onclick="reactToMessageFromAction(this)">&#x1f412;</button>`: ""}
                ${isSystem === false ? `<button style="" title="Reply" onclick="actionReply(this)">&#10149;</button>`: ""}
                
                <!--
                <button class="approve">&#10004;</button>
                <button class="reject">&#10008;</button>
                <button class="delete">&#128465;</button>
                -->
            </div>`
}

async function displayMessagesInElement({
                                            data,
                                            channelId,
                                            container,
                                            appendTop = false,
                                            index = -1,
                                            scrollPosition = null,
                                        } = {}){

    let firstMessage = getFirstMessage(container);

    let loaded = 0;
    let channelbar = document.querySelector("#channelname-bar");

    for (let message of appendTop ? data.reverse() : data) {
        // if user switches channel we cancel this shit
        if(channelId !== UserManager.getChannel()) return;

        try {
            // stop trying to fetch new messages on last message
            if (data.length <= 1 && firstMessage) {
                let firstMessageTimestamp = Number(firstMessage?.element?.getAttribute("data-timestamp")) || null;

                if (firstMessageTimestamp) {
                    if (firstMessageTimestamp === message.timestamp) {
                        Clock.stop("load_messages")
                        return;
                    }
                }
            }

            // dont show messages again if duplicate
            let duplicate = document.querySelector(`#content .message-container .content:not(.reply)[data-message-id='${message.messageId}']`)
            if (duplicate != null) {
                continue;
            }

            // to append messages on the top
            let location = "beforeend";
            if (appendTop && index !== -1) location = "afterbegin";

            if (await shouldAppendMessage(container, message, appendTop) === true) {
                await showMessageInChat({
                    container,
                    scrollPosition,
                    message,
                    append: true,
                    location,
                    appendTop,
                    waitWithDisplay: true
                });
            } else {
                await showMessageInChat({
                    container,
                    scrollPosition,
                    message,
                    append: false,
                    location,
                    appendTop,
                    waitWithDisplay: true
                });
            }

            // this will help with the mentions etc
            if(Inbox.isUnread(message?.messageId) && message?.messageId){
                await Inbox.markAsRead(Inbox.getInboxIdFromMessageId(message.messageId))
            }

            loaded++;
            let percent = (loaded / data.length) * 100
            ElementLoader.setValue(channelbar, percent)
        } catch (error) {
            console.error(`Error processing message with ID ${message.messageId}:`, error);
        }
    }
}

function getChatlog(container, index = -1, appendTop = false, scrollPosition = null) {
    if(UserManager.getChannel() === null) return
    if(UserManager.getCategory() === null) return
    if(UserManager.getGroup() === null) return
    if(!container) throw new Error("Container wasnt supplied for chatlog");

    let channelId = UserManager.getChannel();
    let refElement = getFirstMessage(container)?.element
    let channelbar = document.querySelector("#channelname-bar");

    ElementLoader.start(channelbar, {
        style: "linear",
        color: "hsl(from var(--main) h s calc(l * 8))",
        value: 0
    });

    Clock.start("load_messages_request")
    Clock.start("load_messages_total")
    socket.emit("getChatlog", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        groupId: UserManager.getGroup(),
        categoryId: UserManager.getCategory(),
        channelId: UserManager.getChannel(),
        index
    }, async (response) => {
        Clock.stop("load_messages_request")

        // reset chat
        if (response?.error === "denied") container.innerHTML = ""; // fuck em
        if (response.data == null) {
            console.log("Data was null history");
            Clock.stop("load_messages_total")
            ElementLoader.stop(channelbar);
            return;
        }
        if (response.type === "voice") {
            Clock.stop("load_messages_total")

            ElementLoader.stop(channelbar);
            return;
        }

        Clock.start("load_messages_processing")
        const renderer = document.createElement("div");
        document.body.appendChild(renderer);

        await displayMessagesInElement({
            data: response.data,
            channelId,
            container: renderer,
            appendTop,
            index,
            refElement,
        })

        // set min-height on all images and listen for load
        const images = [...renderer.querySelectorAll("img:not(.icon):not(.memberlist-img):not(.inline-text-emoji)")];
        images.forEach(img => {
            img.style.minHeight = "200px";
            img.style.display = "block";

            // remove min-height as soon as image loads
            if (img.complete) {
                img.style.minHeight = "";
            } else {
                img.addEventListener("load", () => {
                    img.style.minHeight = "";
                }, { once: true });

                img.addEventListener("error", () => {
                    img.style.minHeight = "";
                }, { once: true });
            }
        });

        // wait max 500ms for images to load
        await Promise.race([
            Promise.all(
                images.map(el => {
                    return el.complete
                        ? Promise.resolve()
                        : el.decode().catch(() => {});
                })
            ),
            new Promise(resolve => setTimeout(resolve, 500))
        ]);

        // wait for videos
        await Promise.race([
            Promise.all(
                [...renderer.querySelectorAll("video")].map(el => {
                    if (el.readyState >= 1) return Promise.resolve();
                    return new Promise(res => {
                        el.addEventListener("loadedmetadata", res, { once: true });
                        el.addEventListener("error", res, { once: true });
                    });
                })
            ),
            new Promise(resolve => setTimeout(resolve, 500))
        ]);

        if(channelId !== UserManager.getChannel()){
            ElementLoader.stop(channelbar);
            Clock.stop("load_messages_processing")
            renderer.remove();
            return;
        }

        const frag = document.createDocumentFragment();
        while (renderer.firstElementChild) {
            frag.appendChild(renderer.firstElementChild);
        }
        renderer.remove();
        container.insertBefore(frag, container.firstElementChild);
        Clock.stop("load_messages_processing")

        if (response.data.length === 0 && UserManager.getChannel() && document.getElementById("content").innerText.trim().length === 0) {
            document.getElementById("content").insertAdjacentHTML("beforeend", `<div style="width: 100%;text-align: center; color: gray; font-style: italic;display: block !important; float: left !important;" id="msg-0">No messages yet... be the first one!</div>`);
        }

        ChatManager.setChannelMarkerCounter(UserManager.getChannel())
        ChatManager.setChannelMarker(UserManager.getChannel(), false)

        if (!appendTop) {
            displayAwaitedMessages(container)
            await fixScrollAfterMediaLoad(container, container.scrollHeight, true)

            // lock scroll position while remaining images load
            const remainingImages = [...container.querySelectorAll("img:not(.icon):not(.memberlist-img):not(.inline-text-emoji)")].filter(img => !img.complete);
            if (remainingImages.length > 0) {
                const lastMsg = getLastMessage(container);
                if (lastMsg?.element) {
                    const scrollPos = getScrollPosition(container, lastMsg.element);

                    remainingImages.forEach(img => {
                        img.addEventListener("load", () => {
                            requestAnimationFrame(() => {
                                setScrollPosition(container, scrollPos);
                            });
                        }, { once: true });
                    });
                }
            }

            updateMarkdownLinks(2000)
        }
        else{
            if (appendTop && scrollPosition !== null) {
                await fixScrollAfterMediaLoad(container, scrollPosition, true)

                // lock scroll position while remaining images load
                const remainingImages = [...container.querySelectorAll("img:not(.icon):not(.memberlist-img):not(.inline-text-emoji)")].filter(img => !img.complete);
                if (remainingImages.length > 0) {
                    remainingImages.forEach(img => {
                        img.addEventListener("load", () => {
                            requestAnimationFrame(() => {
                                setScrollPosition(container, scrollPosition);
                            });
                        }, { once: true });
                    });
                }
            }
            displayAwaitedMessages(container)
        }

        Clock.stop("load_messages_total")
        ElementLoader.stop(channelbar);

        Inbox.updateInboxMessageEntries();
    });
}

function waitForStableValue(getValueFn, stableMs, callback) {
    let last = getValueFn();
    let timeout = null;

    const check = () => {
        const now = getValueFn();
        if (now !== last) {
            last = now;
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(callback, stableMs);
        }
        requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
}


function toggleSmoothScroll(element, toggle){
    if(toggle === true){
        element.style.scrollBehavior = "smooth";
    }
    else{
        element.style.scrollBehavior = "auto";
    }
}

function getScrollPosition(container, refEl) {
    return {
        ref: refEl,
        offset: refEl ? refEl.getBoundingClientRect().top : 0
    };
}


function setScrollPosition(container, info) {
    if(typeof info === "number") return container.scrollTop = info;

    if (!info?.ref) return;

    let newOffset = info.ref.getBoundingClientRect().top;
    let diff = newOffset - info.offset;

    container.scrollTop += diff;
}





function displayAwaitedMessages(container){
    let messages = container.querySelectorAll(".waitForDisplay");
    messages.forEach(message => {
        message.classList.remove("waitForDisplay");
    })
}

function addToChatLog(element, text, appendTop = false, force = true) {
    element.insertAdjacentHTML(appendTop ? "afterbegin" : "beforeend", text);
}


function getFirstMessage(container) {
    if(!container) throw new Error("Container wasnt supplied");
    let message = container.querySelectorAll(".message-container .content:not(.reply)")[0];
    if (!message) {
        return null;
    }

    let parent = message.closest(".message-container");
    let memberId = message.getAttribute("data-member-id");
    let messageId = message.getAttribute("data-message-id");

    return {
        parent,
        element: message,
        memberId,
        messageId
    }
}

function getLastMessage(container) {
    if(!container) throw new Error("Container wasnt supplied");
    let elements = container.querySelectorAll(".message-container .content:not(.reply)");
    let lastMessageInChat = elements[elements.length - 1];

    if (lastMessageInChat) {
        let messageContainer = lastMessageInChat.closest(".message-container");


        let usernameElement = messageContainer.querySelector(".username");
        if (!usernameElement) {
            console.warn("Couldnt get last message because username element wasnt found")
            return null;
        }

        let userId = usernameElement.getAttribute("data-member-id");
        if (!userId) {
            console.warn("Couldnt get last message because user id wasnt found")
            return null;
        }

        return {
            parent: messageContainer,
            element: lastMessageInChat,
            userId
        }
    } else {
        console.warn("couldnt get last message")
    }
}