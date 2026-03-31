console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName === "IMG") {
        el.setAttribute("data-src", el.src)

        if (ChatManager.chance(20)) {
            el.src = "/img/worker.png";
        }
        else {
            el.src = "/img/error.png";
        }

        // lets see if this will break something
        el.style.maxHeight = "50px"
        el.style.maxWidth = "50px"
    }
}, true);

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
    MobilePanel.setLeftMenu([
        {
            direction: "column",
            children: [
                document.querySelector("#mainLayout #header")
            ]
        },
        {
            direction: "row",
            flex: "1 1 0",
            flexGrow: 1,
            flexShrink: 1,
            height: "100%",
            children: [
                document.querySelector("#mainLayout #serverlist"),
                document.querySelector("#mainLayout #channellist")
            ]
        }
    ], "left");

    MobilePanel.setRightMenu([
        {
            direction: "column",
            children: [
                document.querySelector("#mainLayout #infolist")
            ]
        }
    ], "right");


    document.querySelectorAll("img").forEach(rewriteImg);
    new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;

                if (n.tagName === "IMG") {
                    rewriteImg(n);
                }
                else {
                    n.querySelectorAll?.("img").forEach(rewriteImg);
                }
            }
        }
    }).observe(document.body, {
        childList: true,
        subtree: true
    });

    const observer = new MutationObserver(() => {
        document.querySelectorAll('.profile_aboutme a:not([target])').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});



let customPrompts
let tooltipSystem
let customAlerts
let splash

var quillContainer = document.querySelector('.ql-container');
var editor = document.querySelector('.ql-editor');

var initialToolbarHeight
var initialHeight;
var maxHeight;
var initialMargin
var allowEditorBlur

document.addEventListener("DOMContentLoaded", async function () {
    ChatManager.applyThemeOnLoad(UserManager.getTheme(), UserManager.getThemeAccent());
    Docs.registerContextMenu()

    ChatManager.registerMessageInfiniteLoad(
        document.getElementById("content"),
        async (element) => {
            const topElement = getFirstMessage(element);
            if (!topElement) return;

            const timeStamp = Number(topElement?.element?.getAttribute("data-timestamp"));
            await getChatlog(element, timeStamp, true, getScrollPosition(element, topElement?.element));
    })

    registerMessageCreateEvent();
    initAudioPlayerEvents();

    customPrompts = new Prompt();
    tooltipSystem = new TooltipSystem();
    customAlerts = new CustomAlert();
    splash = new SplashScreen(document.body);
    splash.show()

    if (!window.isSecureContext) {
        splash.hide();

        function showSecureContextError(duration) {
            showSystemMessage({
                title: "Missing Secure Context",
                text: "The browser thinks the connection isnt secure! Please fix this issue by using a TLS certificate!",
                icon: "error",
                img: null,
                type: "error",
                duration,
                onClick: () => {
                    closeSystemMessage();
                }
            });
        }

        let interval = 2000;
        showSecureContextError(interval / 2)
        setInterval(() => {
            showSecureContextError(interval / 2)
        }, interval)

        throw new Error("Missing Browser Secure Context!");
    }

    initQuillShit();

    if (UserManager.getChannel()) handleChannelMessageDrafting(UserManager.getChannel());

    // manual click event listener because its too general
    document.body.addEventListener("click", (event) => {
        const { clientX: mouseX, clientY: mouseY } = event;
        var clickedElement = event.target

        var profileContent = document.getElementById("profile_container");

        // dont close the profile popup when we click somewhere on the profile
        if (profileContent.contains(clickedElement)) {
            // we pressed on the profile so we can close the role menu again
            document.getElementById("profile-role-menu").style.display = "none";
            return;
        }

        // and dont close it when we click around on the role menu
        if (document.getElementById("profile-role-menu").contains(clickedElement)) {
            return;
        }

        // otherwise on default close it
        profileContent.style.display = "none";
        profileContent.innerHTML = "";
        ModActions.hideRoleMenu()
    });

    document.getElementById("message-actions-image").onclick = function (e) {
        var x = e.clientX;
        var y = e.clientY;

        var clickedElement = document.elementFromPoint(x, y)

        if (clickedElement.id !== "message-actions-image") {
            return;
        }

        showEmojiPicker(x, y, (emojiObj) => {
            insertEmoji(emojiObj, true);
            if (!MobilePanel.isMobile()) focusEditor();
        })
    }


    window.addEventListener('resize', function (event) {
        // do stuff here

        let isScrolledDown = isScrolledToBottom(document.getElementById("content"));

        var emojiContainer = document.getElementById("emoji-box-container");
        var profileContainer = document.getElementById("profile_container");

        if (emojiContainer.style.display == "flex" && !MobilePanel.isMobile()) {
            //emojiContainer.style.display = "none";
            closeEmojiBox()
        }
        if (profileContainer.style.display == "flex") {
            profileContainer.style.display = "none";
        }

        if (isScrolledDown) scrollDown("window resizer");
    });

    document.addEventListener("keydown", (event) => {
        var emojiContainer = document.getElementById("emoji-box-container");
        var profileContainer = document.getElementById("profile_container");

        if (event.key === "Escape") {
            if (emojiContainer.style.display === "block") {
                //emojiContainer.style.display = "none";
                closeEmojiBox();
            }
            if (profileContainer.style.display === "block") {
                profileContainer.style.display = "none";
            }
        }
    });

    initUploadDragAndDrop()
    initUploadFileDialog()

    socket.on("connect", async () => {
        // sick af in my opinion
        await initPow()

        // join first
        await ChatManager.userJoined(null, null, null, null, true);

        setTimeout(() => {
            splash.hide()
        }, 250)
    })

    ContextMenu.registerContextMenu(
        "serverbanner", // random ass unique name
        [
            "#serverbanner-image" // id or classname. if class start with .
        ],
        [ // ur context items
            {
                icon: "&#9998;",
                text: "Change banner",
                callback: async () => { // what happens on click
                    AdminActions.changeGroupBanner()
                },
                condition: async () => { // condition. can be completely removed
                    return await (await checkPermission("manageGroups")).permission === "granted"
                },
                type: "ok"
            },
            {
                icon: "&#10022;",
                text: "Manage server",
                callback: async () => {
                    AdminActions.editServer()
                },
                condition: async () => {
                    return await (await checkPermission(["manageServer",
                        "manageGroups",
                        "manageChannels",
                        "manageUploads",
                        "manageGroups",
                        "viewLogs",
                        "manageEmojis",
                        "manageBans",
                        "manageServerInfo",
                        "manageRateSettings"], true)).permission === "granted"
                },
                type: "success"
            }
        ])

    ContextMenu.registerClickEvent(
        "memberprofile",
        [
            ".memberlist-container",
            ".memberlist-container .name",
            ".memberlist-container .status",
            ".memberlist-img",
            ".mention.member",
            // vc container
            ".vc-container .participant",
            ".vc-container .participant img",
            //
            ".message-container .icon",
            ".message-container .username",
            // channel list vc user
            "#channeltree .category .participants .participant",
            "#channeltree .category .participants .participant .avatar",
        ],
        async (data) => {
            let memberId = getMemberIdFromElement(data.element)
            if (!memberId) {
                console.warn("Couldnt get member profile from click event because memberid wasnt found");
                return;
            }
            getMemberProfile(memberId, data.X, data.Y, null, true)
        },
        async (data) => {
            // dont show the profile container when we click on the add role button
            return data.element.classList.contains("addRoleMenuTrigger") === false;
        }
    )

    ContextMenu.registerClickEvent(
        "memberprofileroles",
        [
            ".addRoleMenuTrigger"
        ],
        async (data) => {
            let memberId = data.element.getAttribute("data-member-id");
            if (!memberId) {
                console.warn("Couldnt get member profile from click event because memberid wasnt found");
                return;
            }

            ModActions.showRoleMenu(data.X, data.Y);
        },
        async (data) => {
            // only show the role menu when we click the add button
            return data.element.classList.contains("addRoleMenuTrigger") === true;
        }
    )

    ContextMenu.registerClickEvent(
        "inbox",
        [
            ".headerIcon.inbox"
        ],
        async (data) => {
            Inbox.toggleInbox();
        },
        async (data) => {
            const inbox = document.querySelector(".inbox-container");
            if (!inbox) return true;

            return !inbox.contains(data.event.target);
        }
    )


    ContextMenu.registerClickEvent(
        "inbox reply",
        [
            ".headerIcon.inbox .inbox-container .inbox-content .entry .content"
        ],
        async (data) => {

            await PageRenderer.renderHTML(data.element.closest(".inbox-container"),
                `
                    <div class="inbox-reply">
                        <span onclick="PageRenderer.remove();" style="cursor: pointer;">« Back</span>
                        
                        <div class="inbox-content">
                            ${data.element.closest(".entry").outerHTML}
                        </div>
                        
                        <span>Reply</span>
                        <div class="inbox-editor"></div>
                    </div>

                    `
            )

            let entry = PageRenderer.Element().querySelector(".entry");
            if (!entry) return console.error("Couldnt find inbox reply")

            let messageId = findAttributeUp(entry, "data-message-id")
            let inboxId = findAttributeUp(entry, "data-inbox-id")

            const editor = new RichEditor({
                selector: ".page-renderer .inbox-editor",
                toolbar: [
                    ["bold", "italic", "underline"],
                    ["code-block", "link"]
                ],
                onImg: async (src) => {
                    console.log("Uploading and replacing src " + src)
                    let upload = await ChatManager.srcToFile(src);
                    editor.insertImage(upload.path)
                },
                onSend: async (html) => {
                    console.log(html, messageId);
                    if (!messageId) throw new Error("Couldnt find inbox reply message id")

                    replyMessageId = messageId;
                    let wasSent = await sendMessageToServer(null, null, null, html, true);
                    if (wasSent) {
                        Inbox.markAsRead(inboxId)
                        editor.clear()
                    }
                }
            });


            console.log("rendered")
        }
    )

    // close emoji box when we click outside of the emoji container
    ContextMenu.registerClickEvent(
        "body_emojicontainer",
        [
            "body"
        ],
        async (data) => {
            // emoji
            let emojiContainer = getEmojiContainerElement();
            if (emojiContainer?.style?.display === "flex" && !emojiContainer?.contains(data.element)) {
                if (!data?.element?.id?.includes("message-actions-image") &&
                    !data?.element?.classList?.contains("react")
                ) {
                    closeEmojiBox();
                }
            }

            // inbox
            let inboxContainer = document.querySelector(".inbox-container");
            if (inboxContainer && inboxContainer?.style?.display === "flex" &&
                (!inboxContainer?.contains(data.element) && !data?.element?.classList?.contains("inbox")) &&
                (!PageRenderer?.Element()?.contains(data.element))
            ) {
                //inboxContainer.style.display = "none";
            }

            // refocus editor
            let editorContainer = document.querySelector(".editor-container");
            if (editorContainer &&
                !editorContainer?.contains(data.element) &&
                //!docsContainer?.contains(data.element) &&
                !emojiContainer.contains(data.element)
            ) {
                //focusEditor(); // causes too many dumb bugs as of rn
            }


        }
    )
})

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect()

registerMentionClickEvent()

socket.on("updatedEmojis", async function () {
    fetchEmojis();
})


socket.on("memberUpdated", async function () {
    getMemberList();
})

// very important
ensureDomPurify()


voip = new VoIP(`${window.location.origin.includes("https") ? "wss" : "ws"}://{{livekit.url}}/`);

socket.on('updateUnread', async () => {
    displayHomeUnread()
});

socket.on('newDmMessage', async (data) => {
    console.log(data)
    displayHomeUnread()
});

socket.on('receiveContentNew', async ({ type, item }) => {
    if (item?.notifyAll && String(item.authorId) !== String(UserManager.getID())) {
        displayHomeUnread()
    }
});

socket.on('newReport', async () => {
    UserReports.getReports();
});

socket.on('verifyPublicKey', async () => {
    Crypto.dSyncTest();
});

var chatlog = document.getElementById("content");
var channeltree = document.getElementById("channeltree");
var serverlist = document.getElementById("serverlist");
var groupbanner = document.getElementById("serverbanner-image");
var memberlist = document.getElementById("infolist");
var typingIndicator = document.getElementById("typing-indicator");
var messageInputBox = document.querySelector('.ql-editor');
var typetimeout;


document.addEventListener('DOMContentLoaded', async function () {
    chatlog = document.getElementById("content");
    channeltree = document.getElementById("channeltree");
    serverlist = document.getElementById("serverlist");
    groupbanner = document.getElementById("serverbanner-image");
    memberlist = document.getElementById("infolist");
    typingIndicator = document.getElementById("typing-indicator");
    messageInputBox = document.querySelector('.ql-editor');

    loadPlugins();
});


var blockedData = [];
var blockedDataCounter = [];
var bypassElement = [];
var bypassCounter = [];

/* Debug Stuff
   Should be deprecated
*/
function encodeToBase64(jsonString) {
    return btoa(encodeURIComponent(jsonString));
}

function decodeFromBase64(base64String) {
    return decodeURIComponent(atob(base64String));
}

// Check if client disconnected
var disconnected = false;
var initConnectionCheck = false;
let connectionAttempts = 0;
let wasDisconnected = false;


ChatManager.checkConnection(1000)


function limitString(text, limit) {
    if (text.length <= limit) return text.substring(0, limit); else return text.substring(0, limit) + "...";
}

async function checkPermission(perms, any = false) {
    return new Promise(resolve => {
        socket.emit("checkPermission", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            permission: perms,
            any
        }, function (response) {
            resolve(response)
        });
    })
}

function getMemberProfile(id, x, y, event = null, bypassEventCheck = false) {
    if (!event && bypassEventCheck === false) return;

    var profileContent = document.getElementById("profile_container");

    if (x == null && y == null) {
        x = event.clientX;
        y = event.clientY;
    }

    //console.log("Requesting profile")
    socket.emit("getMemberProfile", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        target: id,
        posX: x,
        posY: y
    }, async function (response) {
        var profileContent = document.getElementById("profile_container");
        profileContent.innerHTML = await UserManager.getMemberProfileHTML(response.member);

        // if no badges found remove it
        let result = await UserManager.displayUserBadges(true)
        if (!result) {
            let profileBadgeContainer = profileContent.querySelector("#profile_badge_container");
            if (profileBadgeContainer) profileBadgeContainer.style.display = "none"
        }

        profileContent.style.display = "block";
        profileContent.style.position = "fixed";
        profileContent.style.zIndex = "10000";

        var winWidth = window.innerWidth;
        var winHeight = window.innerHeight;

        // Make sure we force a reflow so offsetWidth/offsetHeight are correct
        profileContent.offsetWidth;

        // Calculate safe position
        let top = Number(response.top);
        let left = Number(response.left);

        // Adjust Y if bottom overflows
        if (top + profileContent.offsetHeight > winHeight) {
            top = winHeight - profileContent.offsetHeight - 20; // 20px padding
            if (top < 10) top = 10; // minimum padding from top
        }

        // Adjust X if right side overflows
        if (left + profileContent.offsetWidth > winWidth) {
            left = winWidth - profileContent.offsetWidth - 20; // 20px padding
            if (left < 10) left = 10; // minimum padding from left
        } else {
            left = left + 20; // Small push right to not overlap mouse
        }

        // Apply safe position
        profileContent.style.top = `${top}px`;
        profileContent.style.left = `${left}px`;
    });
}


function redeemKey() {
    var key = prompt("Enter the key you want to redeem");

    if (key == null || key.length <= 0) {

    } else {
        socket.emit("redeemKey", { id: UserManager.getID(), key: key, token: UserManager.getToken() });
    }
}

function dataURLtoBlob(dataUrl) {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
}

function getMessageId(element) {
    if (element.className != "message-profile-content-message-appended") {
        var entireElement = null;
        element = element.closest(".message-container");
        return element.id;
    } else {
        return element.id;
    }
}

function extractHost(url) {
    if (!url) return null;
    const s = String(url).trim();

    const looksLikeBareIPv6 = !s.includes('://') && !s.includes('/') && s.includes(':') && /^[0-9A-Fa-f:.]+$/.test(s);
    const withProto = looksLikeBareIPv6 ? `https://[${s}]` : (s.includes('://') ? s : `https://${s}`);

    try {
        const u = new URL(withProto);
        const host = u.hostname; // IPv6 returned without brackets
        const port = u.port;
        if (host.includes(':')) {
            return port ? `[${host}]:${port}` : host;
        }
        return port ? `${host}:${port}` : host;
    } catch (e) {
        const re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?([^:\/?#]+)(?::(\d+))?(?:[\/?#]|$)/i;
        const m = s.match(re);
        if (!m) return null;
        const hostname = m[1].replace(/^\[(.*)\]$/, '$1');
        const port = m[2];
        if (hostname.includes(':')) return port ? `[${hostname}]:${port}` : hostname;
        return port ? `${hostname}:${port}` : hostname;
    }
}

let lastTypingEmitted = 0;

function setTyping() {
    if (new Date().getTime() > lastTypingEmitted) {
        socket.emit("isTyping", { id: UserManager.getID(), token: UserManager.getToken(), room: UserManager.getRoom() });
        lastTypingEmitted = new Date().getTime() + (2000)
    }

    clearTimeout(typetimeout);
    typetimeout = setTimeout(() => {
        socket.emit("stoppedTyping", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            room: UserManager.getRoom()
        });
    }, 4 * 1000);
}


function getUrlParams(param) {
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}

function getChannelTree() {
    ChannelTree.getTree();
    getGroupBanner()
}

var lastKey = "";
var test = 0;
var testrun = 0;

function sendMessage(messagebox) {

    if (event.keyCode != 13) {
        lastKey = event.keyCode;
    }


    if (event.keyCode == 37 || event.keyCode == 38 || event.keyCode == 39 || event.keyCode == 40) {
        return;
    }

    if (event.keyCode == 13 && lastKey != 16) {
        socket.emit("stoppedTyping", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            room: UserManager.getRoom()
        });
    }

    if (messagebox.innerText != "") {
        setTyping();
    }

}


let startX = 0;
let startY = 0;

function onSwipe(direction) {
    const left = getLeftPanel();
    const right = getRightPanel();

    if (direction === "right") {
        if (isOpen(right)) return switchRightSideMenu(false);
        return switchLeftSideMenu(true);
    }

    if (direction === "left") {
        if (isOpen(left)) return switchLeftSideMenu(false);
        return switchRightSideMenu(true);
    }
}



function isOpen(el) {
    return el.style.display === "flex";
}


function toggleMobilePanel(element, override = null, isRight = false) {
    try {
        if (override === false) {
            element.style.transition = "transform 500ms ease-in-out";
            element.style.transform = isRight ? "translateX(100%)" : "translateX(-100%)";

            setTimeout(() => {
                element.style.display = "none";
            }, 500);

            return;
        }

        if (override === true) {
            element.style.display = "flex";
            element.style.transition = "none";
            element.style.transform = isRight ? "translateX(100%)" : "translateX(-100%)";

            void element.offsetWidth;

            element.style.transition = "transform 500ms ease-in-out";
            element.style.transform = "translateX(0)";
            return;
        }

        if (element.style.display === "flex") {
            toggleMobilePanel(element, false, isRight);
        } else {
            toggleMobilePanel(element, true, isRight);
        }
    } catch {

    }
}


function getLeftPanel() {
    return document.querySelector("#mobile_GroupAndChannelContainer").closest(".mobilePanel");
}

function getRightPanel() {
    return document.querySelector("#mobile_memberlist").closest(".mobilePanel");
}

function switchLeftSideMenu(force = null) {
    const left = getLeftPanel();
    const right = getRightPanel();

    if (force === false) {
        toggleMobilePanel(left, false);
        return;
    }
    if (force === true) {
        toggleMobilePanel(right, false);
        toggleMobilePanel(left, true);
        return;
    }

    if (isOpen(left)) {
        toggleMobilePanel(left, false);
    } else {
        toggleMobilePanel(right, false);
        toggleMobilePanel(left, true);
    }
}

function switchRightSideMenu(force = null) {
    const left = getLeftPanel();
    const right = getRightPanel();

    if (force === false) {
        toggleMobilePanel(right, false, true);
        return;
    }
    if (force === true) {
        toggleMobilePanel(left, false);
        toggleMobilePanel(right, true, true);
        return;
    }

    if (isOpen(right)) {
        toggleMobilePanel(right, false, true);
    } else {
        toggleMobilePanel(left, false);
        toggleMobilePanel(right, true, true);
    }
}


async function replaceInlineImagesInQuill() {
    const container = quill.root;
    const images = container.querySelectorAll("img[src^='data:image/']");

    for (const img of images) {
        try {
            const uploadedUrlResult = await ChatManager.srcToFile(img.src);

            if (uploadedUrlResult?.ok === true) {
                img.src = uploadedUrlResult.path;
                console.log(`Image uploaded: ${uploadedUrlResult.path}`);
            } else {
                console.error("Upload failed:", uploadedUrlResult?.error);
                // should we keep it? man idk..
                //img.remove();
            }
        } catch (err) {
            console.error("Error uploading image:", err);
            img.remove();
        }
    }
}

function replaceInlineEmojis() {
    const container = quill.root;
    const emojis = container.querySelectorAll("img.inline-text-emoji:not(.default)");

    for (const img of emojis) {
        let hash = img.getAttribute("data-filehash");

        if (!hash) {
            img.remove();
            continue;
        }

        const code = `:${hash}:`;
        img.replaceWith(code);
    }
}


async function sendMessageToServer(authorId = UserManager.getID(),
    authorUsername = UserManager.getUsername(),
    pfp = UserManager.getPFP(),
    message,
    bypassQuill = false) {
    Clock.start("send_message");
    let isScrolledDown = isScrolledToBottom(getContentMainContainer());

    if (UserManager.getGroup() == null || UserManager.getGroup().length <= 0 || UserManager.getCategory() == null || UserManager.getCategory().length <= 0 || UserManager.getChannel() == null || UserManager.getChannel().length <= 0) {
        showSystemMessage({
            title: "Please select a channel first",
            text: "",
            icon: "warning",
            img: null,
            type: "warning",
            duration: 4000
        });

        Clock.stop("send_message");
        //alert("Please select any channel first");
        console.warn("Not sending as no channel found");
        return
    }

    replaceInlineEmojis();
    await replaceInlineImagesInQuill();

    if (bypassQuill === false) message = quill.root.innerHTML
    //if(quill.root.innerText.trim().length !== 0) message = quill.root.innerHTML;

    let msgPayload = {
        author: {
            id: UserManager.getID(),
        },
        room: UserManager.getRoom(),
        token: UserManager.getToken(),
        message: message,
        group: UserManager.getGroup(),
        category: UserManager.getCategory(),
        channel: UserManager.getChannel(),
        editedMsgId: editMessageId,
        replyMsgId: replyMessageId
    };

    // if we're using the client, sign the message
    if (isLauncher()) {
        msgPayload = await Client().SignJson(msgPayload);
    }

    return new Promise((resolve, reject) => {
        socket.emit("messageSend", msgPayload, async function (response) {
            Clock.stop("send_message");

            if (response?.error) {
                // do smth in the future with this
                console.error(response);

                // check for slowmode
                if (response?.slowmode) {
                    showSlowmodeNotice(response.slowmode)
                }
                // check for ratelimit
                if (response?.rateLimited) {
                    showRateLimitNotice()
                }

                resolve(false)
            } else {
                // mark channel as read
                ChatManager.increaseChannelMarkerCount(UserManager.getChannel())
                // mark channel as read
                ChatManager.setChannelMarkerCounter(UserManager.getChannel())

                // reset all flags
                editMessageId = null;
                replyMessageId = null;
                cancelMessageEdit();
                cancelMessageReply();

                scrollDown("sendMessageToServer"); // forgot that
                setTimeout(() => focusEditor(), 1)
                editor.innerHTML = "<p><br></p>"

                saveChannelMessageDraft(UserManager.getChannel(), null)

                resolve(true);
            }
        });
    })
}

function getReadableDuration(date) {
    let untilTimestamp = date.getTime();

    const remainingTime = untilTimestamp - Date.now();
    if (remainingTime <= 0) return "Expired";

    let secondsTotal = Math.floor(remainingTime / 1000);

    const years = Math.floor(secondsTotal / (60 * 60 * 24 * 365));
    secondsTotal %= 60 * 60 * 24 * 365;

    const days = Math.floor(secondsTotal / (60 * 60 * 24));
    secondsTotal %= 60 * 60 * 24;

    const hours = Math.floor(secondsTotal / (60 * 60));
    secondsTotal %= 60 * 60;

    const minutes = Math.floor(secondsTotal / 60);
    const seconds = secondsTotal % 60;

    return [
        years ? `${years}y` : null,
        days ? `${days}d` : null,
        hours ? `${hours}h` : null,
        minutes ? `${minutes}m` : null,
        seconds ? `${seconds}s` : null
    ].filter(Boolean).join(" ");
}

var audio = new Audio();

function playSound(sound, volume = 0.5) {
    audio.src = `/sounds/${sound}.mp3`;
    audio.volume = volume;
    audio.play();
}

socket.on('doAccountOnboarding', async function (message) {
    UserManager.doAccountLogin()
});


socket.on('showUserJoinMessage', async function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' + '            <p>User <label class="systemAnnouncementChatUsername" id="">' + author.username + '</label> joined the chat!</p>' + '        </div>';

    addToChatLog(chatlog, message);
    scrollDown("userJoinMessage");
});

socket.on('updateGroupList', async function (author) {

    getGroupList();
})



function getAllChildren(element) {
    const children = [];

    function traverse(node) {
        node.childNodes.forEach(child => {
            if (child.nodeType === 1) { // Ensure it's an element node
                children.push(child);
                traverse(child);
            }
        });
    }

    traverse(element);
    return children;
}


socket.on('memberTyping', members => {
    if (members.length === 0) {
        typingIndicator.innerText = "H";
        typingIndicator.style.color = "transparent";
        return;
    }

    let text = "";

    if (members.length === 1) {
        text = `${limitString(members[0], 15)} is typing...`;
    } else if (members.length === 2) {
        text = `${limitString(members[0], 15)} and ${limitString(members[1], 15)} are typing...`;
    } else {
        const firstThree = members.slice(0, 3).map(m => limitString(m, 15)).join(", ");
        const extra = members.length - 3;
        text = extra > 0
            ? `${firstThree}, and ${extra} more are typing...`
            : `${firstThree} are typing...`;
    }

    typingIndicator.innerHTML = unescapeHtmlEntities(text);
    typingIndicator.style.color = "hsl(from var(--main) h s calc(l * 8))";
});


socket.on('receiveChannelTree', async function (data) {
    getChannelTree()
    markCurrentChannelStyle(UserManager.getChannel())
});


socket.on('updateChatlog', async function (data) {
    getChatlog(document.getElementById("content"));
});


function markCurrentChannelStyle(channelId) {
    let channels = document.querySelectorAll("#channellist a");

    channels.forEach(channel => {
        if (channel.parentNode.classList.contains("selected")) {
            channel.parentNode.classList.remove("selected")
        }
    });

    let targetChannel = document.querySelector(`#channellist li[data-channel-id='${channelId}']`);
    if (targetChannel) targetChannel.classList.add("selected");

}

/*
function reapplyUnreadFromCookies() {
    const nodes = document.querySelectorAll('#channellist a[id^="channel-"], #channellist li[id^="channel-"]');
    nodes.forEach(el => {
        const id = el.id.replace("channel-", "");
        const cls = Array.from(el.classList || []).find(c => c.startsWith("msgCount_"));
        if (!cls) return;

        const count = parseInt(cls.split("_")[1], 10);
        const saved = parseInt(CookieManager.getCookie(`message-marker_${id}`), 10) || 0;

        if (Number.isFinite(count)) {
            if (String(UserManager.getChannel()) === String(id)) {
                markChannel(id, true, count);
            } else if (count > saved) {
                el.classList.add("markChannelMessage");
            } else {
                el.classList.remove("markChannelMessage");
            }
        }
    });
}
*/


socket.on('markChannel', async function (data) {
    markChannel(data.channelId, false, data?.count);
});

socket.on('createMessageEmbed', async function (data) {
    document.querySelector("#msg-" + data.messageId).innerHTML = data.code;
    scrollDown("createMessageEmbed");
});

socket.on('createMessageLink', async function (data) {
    document.querySelector("#msg-" + data.messageId).innerHTML = data.code;
    scrollDown("createMessageLink");
});

socket.on('receiveCurrentChannel', async function (channel) {
    try {
        if (channel.name == null) {
            channel.name = "";
        }
        setChannelName(channel.name);
        markCurrentChannelStyle(channel.id);
    } catch {
        setChannelName(" ");
        markCurrentChannelStyle(null);
    }
});

socket.on('updateMemberList', async function (data) {
    getMemberList();
    await updateMentionAutocompleteData();
});

socket.on('updateGroupList', async function (data) {
    getGroupList();
});

socket.on('receiveGroupList', async function (data) {
    if (serverlist.innerHTML !== data) {
        serverlist.innerHTML = "";
        serverlist.innerHTML = data;

        let mobileGroupList = document.getElementById("mobile_GroupList");
        mobileGroupList.innerHTML = data;
    }
    setActiveGroup(UserManager.getGroup())
    displayHomeUnread();
});


socket.on('newMemberJoined', async function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' + '            <p><label class="systemAnnouncementChatUsername">' + author.name + '</label> joined the server! <label class="timestamp" id="' + author.timestamp + '">' + author.timestamp.toLocaleString("narrow") + '</p>' + '        </div>';

    addToChatLog(chatlog, message);
    scrollDown("newMemberJoined");

});

socket.on('memberOnline', async function (member) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' + '            <p><label class="systemAnnouncementChatUsername">' + member.username + '</label> is now online!</p>' + '        </div>';

    addToChatLog(chatlog, message);
    scrollDown("memberOnline");
});

socket.on('memberPresent', async function (member) {
});

socket.on('receiveGifImage', async function (response) {
    clearGifContainer()

    if (response?.gifs) {
        for (let gif of response.gifs) {
            document.getElementById("gif-entry-container").insertAdjacentHTML("beforeend", `<img
                    onclick="sendGif('${gif.media_formats.gif.url}')" src="${ChatManager.proxyUrl(gif.media_formats.nanogif.url)}"
                    style="padding: 1%;border-radius: 20px;float: left;width: 48%; height: fit-content;">`);
        }
    }

    requestAnimationFrame(() => {
        var gifSearchbarInput = document.getElementById("gif-searchbar-input");
        focusElementInput(gifSearchbarInput)
        Clock.stop("gifSearch")
    })
});


socket.on('receiveToken', async function (data) {
    CookieManager.setCookie("dcts_token", data, 365);
});

socket.on('modalMessage', async function (data) {
    var buttonArray = [];
    if (data.buttons) {
        Object.keys(data.buttons).forEach(function (button) {

            var buttonText = data.buttons[button].text;
            var buttonEvents = data.buttons[button].events;

            buttonArray.push([buttonText.toLowerCase(), buttonEvents])
        });

        for (let i = 0; i < data.buttons.length; i++) {
            console.log("button : " + data.buttons[i])
        }
    }

    if (data.token != null && data.action == "register") {
        CookieManager.setCookie("dcts_token", data.token, 365);
        CookieManager.setCookie("loginName", data.loginName, 365);
    }

    // stop reconnecting... prompt
    if (data?.wasDisconnected) wasDisconnected = true;

    showSystemMessage({
        title: data.title ? data.title : (data.message ? data.message : data.msg),
        text: (data.message ? data.message : data.msg) || "",
        icon: data.type || "info",
        img: null,
        type: data.type || "neutral",
        duration: data.displayTime || 4000,
        wasDiconnected: data.wasDisconnected || null
    });

    if (data?.action && data?.action === "register") {
        setTimeout(function () {
            window.location.reload();
        }, data.displayTime || 4000)
    }
});

function setActiveGroup(group) {
    if (group == null) {
        return;
    }

    let groupIcons = document.querySelectorAll(`.server-icon`)
    groupIcons.forEach(icon => {
        if (icon.classList.contains("selectedGroup")) icon.classList.remove("selectedGroup");
    })


    document.querySelectorAll(`.group-icon-${group}`).forEach(icon => {
        icon.classList.add('selectedGroup')
    })
}

function displayHomeUnread() {
    socket.emit("getAllUnread", { id: UserManager.getID(), token: UserManager.getToken() }, function (response) {
        let unread = Number(response?.total ?? 0);

        let indicators = document.querySelectorAll('.home-indicator');
        if (!indicators) return console.warn('.home-indicator not found');

        indicators.forEach(indicator => {
            if (unread > 0) {
                if (unread >= 10) indicator.style.borderRadius = "6px";

                indicator.innerHTML = `${unread > 1000 ? "Too many :o" : unread}`;
                indicator.classList.add('visible');
                indicator.setAttribute('aria-label', `${unread} unread messages`);
            } else {
                indicator.innerHTML = '';
                indicator.classList.remove('visible');
                indicator.removeAttribute('aria-label');
            }
        })
    });
}

socket.on('receiveGroupBanner', async function (data) {
    groupbanner.src = ChatManager.proxyUrl(data);
    document.getElementById("mobile_groupBannerDisplay").src = ChatManager.proxyUrl(data);
});

function getGroupList() {
    socket.emit("getGroupList", {
        id: UserManager.getID(),
        group: UserManager.getGroup(),
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        token: UserManager.getToken()
    });
    getGroupBanner();
}

function getGroupBanner() {
    socket.emit("getGroupBanner", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        group: UserManager.getGroup()
    });
}

async function waitFor(callback, timeout = 0) {
    return new Promise(resolve => {
        let result = callback();
        setTimeout(async () => {
            resolve(result)
        }, timeout)
    });
}

async function setUrl(param, isVC = false) {
    if (!isVC) {
        showHome(true)
        saveChannelMessageDraft(UserManager.getID());
    }


    let urlData = param.split("&")
    let groupId = urlData[0]?.replace("?group=", "")
    let categoryId = urlData[1]?.replace("category=", "")
    let channelId = urlData[2]?.replace("channel=", "")
    focusEditor()

    // channel already open, dont reload it
    if (UserManager.getChannel() === channelId && channelId && UserManager.getChannel() && isVC === false) return;
    window.history.replaceState(null, null, param); // or pushState

    if (isVC === true) {
        socket.emit("checkChannelPermission", {
            id: UserManager.getID(),
            channel: UserManager.getChannel(),
            token: UserManager.getToken(),
            permission: "useVOIP"
        }, async function (response) {
            if (response.permission === "granted") {
                switchLeftSideMenu(true)
                changedChannel();
                document.getElementById("messagebox").style.display = "none";

                // join vc room
                await setupVC(UserManager.getRoom());
            }
        });
    } else {
        const channelIcons = document.getElementById("channelname-icons");
        channelIcons.innerHTML = "";

        socket.emit("checkChannelPermission", {
            id: UserManager.getID(),
            channel: UserManager.getChannel(),
            token: UserManager.getToken(),
            permission: "sendMessages"
        }, function (response) {

            MobilePanel.close()

            // lets prioritize loading the chat lol
            changedChannel()
            chatlog.innerHTML = "";
            document.getElementById("messagebox").style.display = "flex";
            getChatlog(document.getElementById("content"));

            // update grouplist and channel tree if we only
            // click on a group
            if (groupId && !categoryId && !channelId) {
                getChannelTree();
            }

            if (channelId) ChatManager.setChannelMarker(channelId, false)
            showGroupStats();

            if (response.permission !== "granted") {
                toggleEditor(false);
            } else {
                // to avoid confusion
                if (!channelId) {
                    toggleEditor(false);
                }
                else {
                    toggleEditor(true);
                    focusEditor();
                    if (channelId) handleChannelMessageDrafting(channelId);
                }
            }
        });
    }

    getMemberList();
}

function changedChannel() {
    switchLeftSideMenu(false)
    socket.emit("setRoom", {
        id: UserManager.getID(),
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        room: UserManager.getRoom(),
        token: UserManager.getToken()
    });

    socket.emit("getCurrentChannel", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        group: UserManager.getGroup(),
        category: UserManager.getCategory(),
        channel: UserManager.getChannel()
    });

    getGroupList();
    getChannelTree();
}


function showGroupStats() {
    // If we only clicked a group and no channel etc the main windows is empty.
    // lets show some nice group home / welcome screen
    if (UserManager.getGroup() !== null && UserManager.getCategory() === null && UserManager.getChannel() === null) {
        messageInputBox.parentNode.parentNode.style.visibility = "hidden";
        document.getElementById("content").innerHTML =
            `<div
                style="display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100%;
                ">
                <h1 style="margin-bottom: 0;">Welcome to the server!</h1>
                <p>Select a channel to begin chatting</p>
            </div>
            `;
    }
}

function checkSEO() {
    fetch(window.location.href)
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const title = doc.querySelector('title')?.textContent || 'No <title> found';
            const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 'No meta description';
        })
        .catch(err => console.error('Request failed:', err));
}

function setChannelName(name) {
    document.title = name ? "Chat in #" + name : "{{server.name}}";
    document.getElementById("channelname").innerText = name ? `# ${name}` : ""; // i love these inline checks
}

function getRoles() {
    socket.emit("RequestRoles", {
        id: UserManager.getID(),
        username: UserManager.getUsername(),
        pfp: UserManager.getPFP()
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDb(length) {
    for (let i = 1; i < length; i++) {
        await sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), `${i}`, true);
        await sleep(500);
    }
}

socket.on("uploadProgress", async ({ filename, bytes, total }) => {
    const percent = total ? Math.min(100, (bytes / total) * 100) : 0;
    showSystemMessage({
        title: `File ${percent}% uploaded`,
        text: ``,
        icon: "info",
        type: "neutral",
        duration: 2000
    });
});

function initUploadFileDialog() {
    //Setting up to trigger once Input-Dialog element receives a new file
    const fileInput = document.getElementById('uploadCaller');
    fileInput.addEventListener('change', async function () {
        if (fileInput.files.length > 0) {
            //Code borrowed from initUploadDragAndDrop.
            try {
                let result = await ChatManager.uploadFile(fileInput.files);
                console.log("upload result: ", result);
                if (result.ok === true) {
                    console.log("All files uploaded successfully. URLs:", result.path);
                    // Process the URLs array
                    sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), `${window.location.origin}${result.path}`, true); // Sending all URLs at once
                } else {
                    console.error("Upload encountered an error:", result.error);
                    showSystemMessage({
                        title: `Error uploading file`,
                        text: `${result.error}`,
                        icon: "error",
                        type: "error",
                        duration: 1500
                    });
                }
            } catch (error) {
                console.error("An error occurred during the upload process:", error);
            }
            //End of borrowed code
        } else {
            console.log('No file selected from dialog.')
        }
    })
}

function initUploadDragAndDrop() {

    var uploadObject = document.getElementById('content');

    // Handle the file drop event
    uploadObject.addEventListener('drop', async function (e) {
        e.preventDefault();
        uploadObject.style.backgroundColor = '';

        // dont upload in vc
        if (uploadObject.querySelector(".vc-container")) {
            console.warn("cant upload in vc")
            return;
        }

        const files = Array.from(e.dataTransfer.files); // Handle multiple files if needed
        const fileSize = files[0].size / 1024 / 1024; // Example: Display the size of the first file
        console.log(`File dropped. Size: ${fileSize.toFixed(2)} MB`);

        try {
            let result = await ChatManager.uploadFile(files);
            console.log("upload result: ", result);

            if (result.ok === true) {
                console.log("All files uploaded successfully. URLs:", result.path);

                // Process the URLs array
                sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), `${window.location.origin}${result.path}`, true); // Sending all URLs at once
            } else {
                console.error("Upload encountered an error:", result.error);
                showSystemMessage({
                    title: `Error uploading file`,
                    text: `${result.error}`,
                    icon: "error",
                    type: "error",
                    duration: 1500
                });
            }
        } catch (error) {
            console.error("An error occurred during the upload process:", error);
        }
    }, false);


    uploadObject.addEventListener('dragenter', function (e) {
        e.preventDefault();
        uploadObject.style.backgroundColor = 'gray';

    }, false);

    uploadObject.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadObject.style.backgroundColor = 'gray';
    }, false);

    uploadObject.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadObject.style.backgroundColor = '';
    }, false);
}