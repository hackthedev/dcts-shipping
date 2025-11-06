document.addEventListener("DOMContentLoaded", function () {
    ContextMenu.registerContextMenu(
        "servermessage",
        [
            ".contentRows .content",
            ".contentRows .content p",
            ".contentRows .content a",
            ".contentRows .content .iframe-container",
            ".contentRows .content span",
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
                    let messageId = getMessageIdFromElement(element);

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
})

// embeds
ContextMenu.registerContextMenu(
    "embeds",
    [
        ".image-embed-container .image-embed",
        ".video-embed",
        ".message-container .contentRows img"
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
                let messageId = getMessageIdFromElement(element);
                if(!messageId){
                    console.warn("Couldnt show report option because messageid not found");
                    return;
                }

                if(messageId) return true;
            },
            type: "warning"
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

        let msgCount = getMessageCountFromContainer(container);

        // if the count is 0 which means there are no more messages,
        // we shall delete the entire container as well.
        if (msgCount === 0) {
            container.remove();
        }

    } catch (err) {
        console.log(err)
    }
});

function getMemberIdFromElement(element) {
    if (!element?.getAttribute("data-member-id")) {
        element = element.parentNode;
        if (!element?.getAttribute("data-member-id")) {
            element = element.parentNode;
            if (!element?.getAttribute("data-member-id")) {
                console.warn("Couldnt edit message because data-member-id wasnt found");
                return null;
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
                console.warn("Couldnt edit message because data-message-id wasnt found");
                return null;
            }
        }

        return element.getAttribute("data-message-id");
    }

    return element?.getAttribute("data-message-id");
}

function getMessageElementFromId(messageId) {
    return document.querySelector(`.message-container .content[data-message-id="${messageId}"]`)
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


    return compareTimestamps(message.timestamp, timestamp) <= 5 && messageElement?.element.getAttribute("data-member-id") === message.id;
}

socket.on('messageCreate', async function (message) {
    // this means we just created a message
    if (message.id === UserManager.getID()) {
        CookieManager.setCookie(`message-marker_${UserManager.getChannel()}`, parseInt(CookieManager.getCookie(`message-marker_${UserManager.getChannel()}`)) + 1)
    }

    if (await shouldAppendMessage(message) === true) {
        await showMessageInChat(message, true);
    } else {
        await showMessageInChat(message, false);
    }
});

socket.on('messageEdited', async function (message) {
    let markdownResult = await markdown(message.message, message.messageId);
    if (!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
    if (markdownResult.isMarkdown) message.message = markdownResult.message;

    let editElement = getMessageElementFromId(message.messageId);
    editElement.innerHTML = message.message;
    editElement.innerHTML += getMessageEditedHTML(message);
});

function getMessageEditedHTML(message) {
    return `
            <div class="edit-notice">
                <span>Edited </span> <span class="editedMsg">(${new Date(message.lastEdited).toLocaleString("narrow")})</span>
            </div>
            `;
}

async function showMessageInChat(message, append = false, location = "beforeend", appendTop = false) {
    let markdownResult = await markdown(message.message, message.messageId);
    if (!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
    if (markdownResult.isMarkdown) message.message = markdownResult.message;

    message.message = await text2Emoji(message.message)
    let messageElement = appendTop ? getFirstMessage() : getLastMessage();

    // create message code structure
    var messagecode = "";
    if (message.isSystemMsg === true) {
        messagecode = createMsgHTML(message, append, true);
    } else {
        // dont append if the previous message was a system message
        if(messageElement?.element?.classList.contains("system")) append = false;
        messagecode = createMsgHTML(message, append);
    }

    // display it
    if (append === true && !message?.isSystemMsg) {
        if (messageElement?.element && !messageElement?.element?.classList.contains("system")) {
            if(appendTop){
                let firstMessage = getFirstMessage();
                if(firstMessage?.parent){
                    firstMessage.parent.querySelector(".contentRows")?.insertAdjacentHTML(location, messagecode);
                }
            }
            else{
                messageElement.element?.parentNode?.insertAdjacentHTML(location, messagecode);
            }
            return;
        }
    }

    addToChatLog(chatlog, messagecode, appendTop);
    convertMention(message, false)
    //scrollDown();
}

function truncateText(text, length){
    let actualLength = 0;
    if(text.length <= length){
        actualLength = text.length;
    }
    else{
        actualLength = length;
    }

    return text.substring(0, actualLength);
}

function createMsgHTML(message, append = false, isSystem = false) {
    let isSigned = message?.sig?.length > 10;

    if (message?.lastEdited != null) {
        message.editCode = getMessageEditedHTML(message);
    }

    let messageRow =
        `
        <div class="content ${isSystem ? "system" : ""}" data-message-id="${message.messageId}" data-member-id="${message.id}" data-timestamp="${message.timestamp}">
            ${message.message}  ${message?.editCode ? message?.editCode : ""}       
            ${createMsgActions(message.id)}
        </div>
        `

    if (append === true && isSystem === false) {
        return messageRow;
    }

    return `
        <div class="message-container ${isSystem ? "system" : ""}" data-member-id="${message.id}">
            
            <div class="row ${isSystem === true ? `system` : ""}">
                ${isSystem !== true ?
        `<div class="icon-container">
                    <img class="icon" src="${message.icon}" data-member-id="${message.id}" onerror="this.src = '/img/default_pfp.png';">
                </div>` : ""}
                
               <div style="width: 100%;"> <!-- for the flex layout -->
                 <div class="meta">
                    ${isSystem !== true ?
                    `<label class="username" data-member-id="${message.id}" style="color: ${message.color};">${truncateText(message.name, 25)}</label>` : ""}
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

function createMsgActions(id) {
    return ""; // this is a test feature and not done yet

    return `<div class="modActions">
                <button class="approve">&#10004;</button>
                <button class="reject">&#10008;</button>
                <button class="delete">&#128465;</button>
            </div>`
}





let scrollOffset = 0;
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
        if (response?.error === "denied") document.getElementById("content").innerHTML = ""; // fuck em
        if (response.data == null) {
            console.log("Data was null history");
            return;
        }
        if(response.type === "voice"){
            return;
        }

        // determine if we wanna scroll down or not
        let scrollDownInitially = false;
        if(document.getElementById("content").innerText.trim().length === 0) {
            scrollDownInitially = true;
        }

        let firstMessage = getFirstMessage();
        for (let message of appendTop ? response.data.reverse() : response.data) {
            try {
                // stop trying to fetch new messages on last message
                if(response.data.length <= 1 && firstMessage){
                    let firstMessageTimestamp = Number(firstMessage?.getAttribute("data-timestamp")) || null;

                    if(firstMessageTimestamp){
                        if(firstMessageTimestamp === message.timestamp){
                            return;
                        }
                    }
                }

                // dont show messages again if duplicate
                let duplicate = document.querySelector(`#content .message-container .content[data-message-id='${message.messageId}']`)
                if(duplicate !== null && duplicate !== undefined){
                    continue;
                }

                // to append messages on the top
                let location = "beforeend";
                if(appendTop && index !== -1) location = "afterbegin";

                if (await shouldAppendMessage(message, appendTop) === true) {
                    await showMessageInChat(message, true, location, appendTop);
                } else {
                    await showMessageInChat(message, false, location, appendTop);
                }
            } catch (error) {
                console.error(`Error processing message with ID ${message.messageId}:`, error);
            }
        }

        if (response.data.length === 0 && UserManager.getChannel() && document.getElementById("content").innerText.trim().length === 0) {
            document.getElementById("content").insertAdjacentHTML("beforeend", `<div style="width: 100%;text-align: center; color: gray; font-style: italic;display: block !important; float: left !important;" id="msg-0">No messages yet... be the first one!</div>`);
        }

        // mark channel as read
        if(!appendTop && scrollDownInitially){
            scrollDown();
        }
        else{
            setTimeout(async function () {
                firstMessage?.parent?.scrollIntoView();
            }, 500)
        }

        markChannel(UserManager.getChannel(), true)
        resolveMentions();
    });
}

function addToChatLog(element, text, appendTop = false, force = true) {
    let scrolledDown = isScrolledToBottom(document.getElementById("content"));
    element.insertAdjacentHTML(appendTop ? "afterbegin" : "beforeend", text);
    if(scrolledDown) scrollDown();
}

function getFirstMessage(){
    let message =  document.querySelectorAll("#content .message-container .content")[0];
    if(!message){
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
    let elements = document.querySelectorAll("#content .message-container .content");
    let lastMessageInChat = elements[elements.length-1];

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
    }
    else{
        console.warn("couldnt get last message")
        console.log(lastMessageInChat)
    }
}