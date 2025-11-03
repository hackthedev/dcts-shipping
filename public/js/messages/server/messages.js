document.addEventListener("DOMContentLoaded", function () {
    ContextMenu.registerContextMenu(
        "servermessage",
        [
            ".contentRows .content",
            ".contentRows .content p",
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
        ".video-embed"
    ],
    [
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
            console.warn("Couldnt edit message because data-message-id wasnt found");
            return null;
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

async function shouldAppendMessage(message) {
    let lastMessage = getLastMessage();
    let timestamp = 0

    if (lastMessage?.element) {
        let lastMsgTimestamp = lastMessage?.parent.querySelector(".timestamp")?.getAttribute("data-timestamp")
        if (lastMsgTimestamp) timestamp = lastMsgTimestamp;
    }

    if (compareTimestamps(message.timestamp, timestamp) <= 5 && lastMessage.userId === message.id) {
        return true
    } else {
        return false
    }
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


socket.on('receiveChatlog', async function (response) {
    if (response.data == null) {
        console.log("Data was null history");
        return;
    }

    if(response.type === "voice"){
        return;
    }

    for (let message of response.data) {
        try {

            if (await shouldAppendMessage(message) === true) {
                await showMessageInChat(message, true);
            } else {
                await showMessageInChat(message, false);
            }

        } catch (error) {
            console.error(`Error processing message with ID ${message.messageId}:`, error);
        }
    }

    if (response.data.length === 0 && UserManager.getChannel()) {
        document.getElementById("content").insertAdjacentHTML("beforeend", `<div style="width: 100%;text-align: center; color: gray; font-style: italic;display: block !important; float: left !important;" id="msg-0">No messages yet... be the first one!</div>`);
    }


    // mark channel as read
    markChannel(UserManager.getChannel(), true)

    scrollDown();
    resolveMentions();
});

function getMessageEditedHTML(message) {
    return `
            <div class="edit-notice">
                <span>Edited </span> <span class="editedMsg">(${new Date(message.lastEdited).toLocaleString("narrow")})</span>
            </div>
            `;
}

async function showMessageInChat(message, append = false) {
    let markdownResult = await markdown(message.message, message.messageId);
    if (!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
    if (markdownResult.isMarkdown) message.message = markdownResult.message;

    message.message = await text2Emoji(message.message)

    var messagecode = "";
    if (message.isSystemMsg === true) {
        messagecode = createMsgHTML(message, append, true);
    } else {
        messagecode = createMsgHTML(message, append);
    }

    if (append === true && !message?.isSystemMsg) {
        let lastMessage = getLastMessage(message);
        if (lastMessage?.element) {
            lastMessage.element?.parentNode?.insertAdjacentHTML('beforeend', messagecode);
            return;
        }
    }

    addToChatLog(chatlog, messagecode);
    convertMention(message, false)
    scrollDown();
}

function createMsgHTML(message, append = false, isSystem = false) {
    let isSigned = message?.sig?.length > 10;

    if (message?.lastEdited != null) {
        message.editCode = getMessageEditedHTML(message);
    }

    let messageRow =
        `
        <div class="content" data-message-id="${message.messageId}" data-member-id="${message.id}">
            ${message.message}  ${message?.editCode ? message?.editCode : ""}       
            ${createMsgActions(message.id)}
        </div>
        `

    if (append === true && isSystem === false) {
        return messageRow;
    }

    return `
        <div class="message-container" data-member-id="${message.id}">
            
            <div class="row ${isSystem === true ? `system` : ""}">
                ${isSystem !== true ?
        `<div class="icon-container">
                    <img class="icon" src="${message.icon}" data-member-id="${message.id}" onerror="this.src = '/img/default_pfp.png';">
                </div>` : ""}
                
               <div style="width: 100%;"> <!-- for the flex layout -->
                 <div class="meta">
                    ${isSystem !== true ?
        `<label class="username" data-member-id="${message.id}" style="color: ${message.color};">${message.name}</label>` : ""}
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