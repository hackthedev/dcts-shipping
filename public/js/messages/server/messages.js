
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
                    deleteMessageFromChat(messageId);
                },
                condition: async (data) => {
                    let element = data.element;
                    let memberId = getMemberIdFromElement(element);
                    return ((memberId === UserManager.getID()) || await (await checkPermission("manageMessages")).permission === "granted")
                },
                type: "error"
            },
            {
                icon: "&#9888;",
                text: "Report Message",
                callback: async (data) => {
                    let element = data.element;
                    let messageId = getMessageIdFromElement(element);

                    UserReports.reportMessage(messageId)
                },
                condition: async (data) => {
                    let element = data.element;
                    let memberId = getMemberIdFromElement(element);
                    return (memberId !== UserManager.getID())
                },
                type: "warning"
            }
        ])


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


    // embeds
    ContextMenu.registerContextMenu(
        "embeds",
        [
            ".image-embed-container .image-embed",
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
                    let url = data.element.src || data.element?.getAttribute("data-src")
                    if (!url) {
                        console.warn("Couldnt copy link because src wasnt found");
                        return;
                    }

                    navigator.clipboard.writeText(url);
                }
            },
            {
                icon: "&#128465;",
                text: "Delete Embed",
                callback: async (data) => {
                    let element = data.element;
                    let messageId = getMessageIdFromElement(element);

                    deleteMessageFromChat(messageId);
                },
                condition: async (data) => {
                    let element = data.element;
                    let memberId = getMemberIdFromElement(element);
                    let messageId = getMessageIdFromElement(element);
                    return ((memberId === UserManager.getID() && messageId != null) || await (await checkPermission("manageMessages")).permission === "granted") && messageId != null
                },
                type: "error"
            },
            {
                icon: "&#9888;",
                text: "Report Message",
                callback: async (data) => {
                    let element = data.element;
                    let messageId = getMessageIdFromElement(element);

                    UserReports.reportMessage(messageId)
                },
                condition: async (data) => {
                    let element = data.element;
                    let messageId = getMessageIdFromElement(element);
                    if (!messageId) {
                        console.warn("Couldnt show report option because messageid not found");
                        return;
                    }

                    if (messageId) return true;
                },
                type: "warning"
            }
        ]
    );

})

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

async function convertMention(message) {
    try {
        let text = message.message.toString();
        const userIds = [];
        const matches = [...text.matchAll(/&lt;@(\d+)&gt;/g)];

        for (const match of matches) {
            const userId = match[1];
            if (!userIds.includes(userId)) userIds.push(userId);

            const member = await ChatManager.resolveMember(userId);
            if (!member) continue;

            const html = `<label class="mention" data-member-id="${member.id}" id="mention-${member.id}">@${member.name}</label>`;
            text = text.replace(match[0], html);
        }

        return { text, userIds };
    } catch (err) {
        console.log(err);
        return { text: message.message, userIds: [] };
    }
}


function getMemberIdFromElement(element) {
    if (!element?.getAttribute("data-member-id")) {
        element = element.parentNode;
        if (!element?.getAttribute("data-member-id")) {
            element = element.parentNode;
            if (!element?.getAttribute("data-member-id")) {
                element = element.parentNode;
                if (!element?.getAttribute("data-member-id")) {
                    console.warn("Couldnt edit message because data-member-id wasnt found");
                    return null;
                }
            }
        }

        return element.getAttribute("data-member-id");
    }

    return !element?.getAttribute("data-member-id")
}

function getMessageIdFromElement(element) {
    if (!element?.getAttribute("data-message-id")) {
        element = element.parentNode;
        if (!element?.getAttribute("data-message-id")) {
            element = element.parentNode;
            if (!element?.getAttribute("data-message-id")) {
                element = element.parentNode;
                if (!element?.getAttribute("data-message-id")) {
                    console.warn("Couldnt edit message because data-message-id wasnt found");
                    return null;
                }
            }
        }

        return element.getAttribute("data-message-id");
    }

    return element?.getAttribute("data-message-id");
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

async function shouldAppendMessage(message, appendTop = false) {
    let messageElement = appendTop === true ? getFirstMessage() : getLastMessage()
    let timestamp = 0

    if (messageElement?.element) {
        let lastMsgTimestamp = messageElement?.element?.getAttribute("data-timestamp")
        if (lastMsgTimestamp) timestamp = lastMsgTimestamp;
    }


    return compareTimestamps(message.timestamp, timestamp) <= 5 && messageElement?.element.getAttribute("data-member-id") === message.id && message?.reply == null;
}

socket.on('messageCreate', async function (message) {
    const isScrolledDown = isScrolledToBottom(document.getElementById("content"));

    // lets increase the channel count first
    ChatManager.increaseChannelMarkerCount(message.channel)
    // then mark it for ourselves
    ChatManager.setChannelMarkerCounter(UserManager.getChannel())

    // play a sound too if its not us
    if(message.id !== UserManager.getID() && message.channel === UserManager.getChannel()){
        playSound("message", 0.5);
    }

    // the message was not created in the room we're currently in, but thats fine.
    // we will instead show the notification icon and return;
    if(message.room !== UserManager.getRoom()){
        ChatManager.setChannelMarker(message.channel, true);
        return;
    }

    // if message contains reply
    let repliedMessage = null;
    if (message?.reply) {
        repliedMessage = await resolveMessage(message.reply);
    }

    if (await shouldAppendMessage(message) === true) {
        await showMessageInChat({
            message,
            append: true,
            reply: repliedMessage,
            mentions: true,
            pingMentions: true
        });
    } else {
        await showMessageInChat({
            message,
            append: false,
            reply: repliedMessage,
            mentions: true,
            pingMentions: true
        });
    }

    if(isScrolledDown) waitFor(scrollDown, 1)
});

socket.on('messageEdited', async function (message) {
    let markdownResult = await markdown(message.message, message.messageId);
    if (!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
    if (markdownResult.isMarkdown) message.message = markdownResult.message;

    let editElement = getMessageElementFromId(message.messageId);
    try{ message.message = await text2Emoji(message.message) } catch {}
    editElement.innerHTML = message.message;
    editElement.innerHTML += getMessageEditedHTML(message);
    editElement.innerHTML += createMsgActions(message.messageId);
});

function getMessageEditedHTML(message) {
    return `
            <div class="edit-notice">
                <span>Edited </span> <span class="editedMsg">(${new Date(message.lastEdited).toLocaleString("narrow")})</span>
            </div>
            `;
}

async function showMessageInChat({
                                     message,
                                     append = false,
                                     location = "beforeend",
                                     appendTop = false,
                                     reply = null,
                                     mentions = false,
                                     pingMentions = false,
                                 } = {}) {

    let markdownResult = await markdown(message.message, message.messageId);
    if (markdownResult.isMarkdown) message.message = markdownResult.message;

    // convert mentions and check if own userid is in it
    let convertedMentions = await convertMention(message);
    message.message = convertedMentions.text

    let isMention = false;
    convertedMentions.userIds.forEach(userId => {
        if(userId === UserManager.getID()){
            isMention = true;

            if(pingMentions === true){
                showSystemMessage({
                    title: message.name,
                    text: message.message,
                    icon: message.icon,
                    img: null,
                    type: "neutral",
                    duration: 6000,
                    onClick: () => {
                        navigateToMessage(message.messageId)
                        closeSystemMessage();
                    }
                });

                // possibly add to inbox once i implement it
            }
        }
    })


    // convert emojis
    try{ message.message = await text2Emoji(message.message) } catch {}
    let messageElement = appendTop ? getFirstMessage() : getLastMessage();

    // create message code structure
    var messagecode = "";
    if (message.isSystemMsg === true) {
        messagecode = await createMsgHTML({
            message,
            append: append,
            isSystem: true,
            isMention,
            reply
        });
    } else {
        // dont append if the previous message was a system message
        if (messageElement?.element?.classList.contains("system")) append = false;
        messagecode = await createMsgHTML({
            message,
            append,
            isSystem: false,
            isMention,
            reply
        });
    }

    // display it
    if (append === true && !message?.isSystemMsg) {
        if (messageElement?.element && !messageElement?.element?.classList.contains("system")) {
            if (appendTop) {
                let firstMessage = getFirstMessage();
                if (firstMessage?.parent) {
                    firstMessage.parent.querySelector(".contentRows")?.insertAdjacentHTML(location, messagecode);
                    return;
                }
            } else {
                messageElement.element?.parentNode?.insertAdjacentHTML(location, messagecode);
            }
            return;
        }
    }

    addToChatLog(chatlog, messagecode, appendTop);
    //scrollDown();
}

function truncateText(text, length) {
    let actualLength = 0;
    if (text.length <= length) {
        actualLength = text.length;
    } else {
        actualLength = length;
    }

    return text.substring(0, actualLength);
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

async function createMsgHTML({message, append = false, isSystem = false, reply = null, isMention = false} = {}) {
    let isSigned = message?.sig?.length > 10;

    if (message?.lastEdited != null) {
        message.editCode = getMessageEditedHTML(message);
    }

    let messageRow =
        `
        <div class="content ${isSystem ? "system" : ""} ${isMention ? "mention" : ""}" data-message-id="${message.messageId}" data-member-id="${message.id}" data-timestamp="${message.timestamp}">
            ${createMsgActions(message.id, isSystem)}
            ${sanitizeHtmlForRender(message.message)}  ${message?.editCode ? message?.editCode : ""}    
        </div>
        `

    if (append === true && isSystem === false && reply == null) {
        return messageRow;
    }

    // if message was a reply
    let replyCode = "";
    if(reply != null){
        replyCode = `
            <div class="row reply" data-message-id="${reply?.message?.messageId}" data-member-id="${reply?.message?.id}">            
                <!-- very creative name indeed -->
                <div class="box"></div>
            
                <div class="icon-container">    
                    <img class="icon" draggable="false" src="${reply?.message?.icon}" data-member-id="${reply?.message?.id}" onerror="this.src = '/img/default_pfp.png';">
                </div>
                <div class="meta">
                    <label class="username" data-member-id="${reply?.message?.id}" style="color: ${reply?.message?.color};">${unescapeHtmlEntities(sanitizeHtmlForRender(truncateText(reply?.message?.name, 25)))}</label>
                </div>
                <div class="content reply" data-message-id="${reply?.message?.messageId}" data-member-id="${reply?.message?.id}" data-timestamp="${reply?.message?.timestamp}">
                    ${await text2Emoji(unescapeHtmlEntities(sanitizeHtmlForRender(reply?.message?.message)), false, true)} 
                </div>
            </div>
        `;
    }

    return `
        <div class="message-container ${isSystem ? "system" : ""}" data-member-id="${message.id}">
            
            ${replyCode}
            <div class="row ${isSystem === true ? `system` : ""}" data-message-id="${message?.messageId}" data-member-id="${message?.id}">
                ${isSystem !== true ?
        `<div class="icon-container">
                    <img class="icon" draggable="false" src="${message.icon}" data-member-id="${message.id}" onerror="this.src = '/img/default_pfp.png';">
                </div>` : ""}
                
               <div style="width: 100%;" data-message-id="${message?.messageId}" data-member-id="${message?.id}"> <!-- for the flex layout -->
                 <div class="meta">
                    ${isSystem !== true ?
                    `<label class="username" data-member-id="${message.id}" style="color: ${message.color};">${unescapeHtmlEntities(sanitizeHtmlForRender(truncateText(message.name, 25)))}</label>` : ""}
                    <label class="timestamp" data-timestamp="${message.timestamp}">
                        ${new Date(message.timestamp).toLocaleString("narrow")}
                        
                        <!-- fuck i love programming -->
                        <label style="filter: grayscale(75%);">
                            ${isSigned ? `&bull; &#128272;` : ""}
                        </label>
                    </label>
                 </div>
                
                 <div class="contentRows" data-member-id="${message.id}">
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

function createMsgActions(id, isSystem = false) {

    return `<div class="messageActions">
                ${isSystem === false ? `<button style="" title="Reply" onclick="actionReply(this)">&#10149;</button>`: ""}
                
                <!--
                <button class="approve">&#10004;</button>
                <button class="reject">&#10008;</button>
                <button class="delete">&#128465;</button>
                -->
            </div>`
}

async function resolveMessage(messageId) {
    return new Promise((resolve, reject) => {
        socket.emit("resolveMessage", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            messageId
        }, async (response) => {
            if (response?.error != null) {
                console.error("Couldnt resolve message");
                console.error(response.error);
                resolve(null)
            } else {
                resolve(response?.message)
            }
        })
    })
}

let scrollContainer = document.getElementById("content");
scrollContainer.addEventListener("scroll", async function () {
    if (scrollContainer.scrollTop === 0) {
        const topElement = getFirstMessage();
        if (!topElement) return;

        const timeStamp = Number(topElement?.element?.getAttribute("data-timestamp"));
        await getChatlog(timeStamp, true);
    }
});


function getChatlog(index = -1, appendTop = false) {
    socket.emit("getChatlog", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        groupId: UserManager.getGroup(),
        categoryId: UserManager.getCategory(),
        channelId: UserManager.getChannel(),
        index
    }, async (response) => {
        let contentDiv = document.getElementById("content");

        // reset chat
        if (response?.error === "denied") contentDiv.innerHTML = ""; // fuck em
        if (response.data == null) {
            console.log("Data was null history");
            return;
        }
        if (response.type === "voice") {
            return;
        }

        // determine if we wanna scroll down or not
        let scrollDownInitially = false;
        if (contentDiv.innerText.trim().length === 0) {
            scrollDownInitially = true;
        }

        let firstMessage = getFirstMessage();
        for (let message of appendTop ? response.data.reverse() : response.data) {
            try {
                // stop trying to fetch new messages on last message
                if (response.data.length <= 1 && firstMessage) {
                    let firstMessageTimestamp = Number(firstMessage?.getAttribute("data-timestamp")) || null;

                    if (firstMessageTimestamp) {
                        if (firstMessageTimestamp === message.timestamp) {
                            return;
                        }
                    }
                }

                // dont show messages again if duplicate
                let duplicate = document.querySelector(`#content .message-container .content:not(.reply)[data-message-id='${message.messageId}']`)
                if (duplicate !== null && duplicate !== undefined) {
                    continue;
                }

                let repliedMessage = null;
                if (message?.reply) {
                    repliedMessage = await resolveMessage(message.reply);
                }

                // to append messages on the top
                let location = "beforeend";
                if (appendTop && index !== -1) location = "afterbegin";

                if (await shouldAppendMessage(message, appendTop) === true) {
                    await showMessageInChat({
                        message,
                        append: true,
                        location,
                        appendTop,
                        reply: repliedMessage
                    });
                } else {
                    await showMessageInChat({
                        message,
                        append: false,
                        location,
                        appendTop,
                        reply: repliedMessage
                    });
                }

                if(firstMessage?.element && appendTop === true){
                    scrollToFirstElement(contentDiv, firstMessage);
                }
            } catch (error) {
                console.error(`Error processing message with ID ${message.messageId}:`, error);
            }
        }

        if (response.data.length === 0 && UserManager.getChannel() && document.getElementById("content").innerText.trim().length === 0) {
            document.getElementById("content").insertAdjacentHTML("beforeend", `<div style="width: 100%;text-align: center; color: gray; font-style: italic;display: block !important; float: left !important;" id="msg-0">No messages yet... be the first one!</div>`);
        }

        // mark channel as read
        ChatManager.setChannelMarkerCounter(UserManager.getChannel())

        // only scroll down initially
        if (!appendTop && scrollDownInitially) {
            scrollDown("getchatlog");
        }
        else{
            // we are inserting shit on the top, but we dont want to scroll up as well,
            // so we need to reset this shit. to avoid smooth scrolling we will need to disable that too.
            if (appendTop && firstMessage?.element !== getFirstMessage().element) {
                scrollToFirstElement(contentDiv, firstMessage);
            }
        }
        resolveMentions();
    });

    function scrollToFirstElement(parent, element){
        parent.style.scrollBehavior = "auto";
        element.parent.scrollIntoView({
            behavior: "auto",
        })
        parent.style.scrollBehavior = "smooth";
    }
}

function addToChatLog(element, text, appendTop = false, force = true) {
    const content = document.getElementById("content");
    const prevScrollTop = content.scrollTop;
    const prevScrollHeight = content.scrollHeight;

    element.insertAdjacentHTML(appendTop ? "afterbegin" : "beforeend", text);
}


function getFirstMessage() {
    let message = document.querySelectorAll("#content .message-container .content:not(.reply)")[0];
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

function getLastMessage() {
    let elements = document.querySelectorAll("#content .message-container .content:not(.reply)");
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
        console.log(lastMessageInChat)
    }
}