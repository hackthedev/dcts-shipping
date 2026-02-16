console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName === "IMG") {
        el.setAttribute("data-src", el.src)
        el.src = "/img/error.png";
    }
}, true);

function rewriteImg(img){
    if(!img || !img.src) return;

    if(img.dataset.proxied === "1") return;

    const proxied = ChatManager.proxyUrl(img.src);
    if(proxied !== img.src){
        img.src = proxied;
    }

    img.dataset.proxied = "1";
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("img").forEach(rewriteImg);

    new MutationObserver(mutations => {
        for(const m of mutations){
            for(const n of m.addedNodes){
                if(n.nodeType !== 1) continue;

                if(n.tagName === "IMG"){
                    rewriteImg(n);
                }
                else{
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

var editorContainer = document.querySelector('.editor-container');
var editorToolbar = document.getElementById("editor-toolbar");
var editorHints = document.getElementById("editor-hints");
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

    registerMessageInfiniteLoad(document.getElementById("content"))
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

    // manual click event listener because its too general
    document.body.addEventListener("click", (event) => {
        const {clientX: mouseX, clientY: mouseY} = event;
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

    // mobile swiping
    const contentLayout = document.getElementById("contentLayout");
    contentLayout.addEventListener("touchstart", e => {
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
    });

    contentLayout.addEventListener("touchend", e => {
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;

        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            onSwipe(dx > 0 ? "right" : "left");
        }
    });


    document.getElementById("message-actions-image").onclick = function (e) {
        var x = e.clientX;
        var y = e.clientY;

        var clickedElement = document.elementFromPoint(x, y)

        if (clickedElement.id != "message-actions-image") {
            return;
        }

        showEmojiPicker(x,y, (emojiObj) => {
            insertEmoji(emojiObj, true);
            focusEditor();
        })
    }


    window.addEventListener('resize', function (event) {
        // do stuff here

        var emojiContainer = document.getElementById("emoji-box-container");
        var profileContainer = document.getElementById("profile_container");

        if (emojiContainer.style.display == "flex") {
            //emojiContainer.style.display = "none";
            closeEmojiBox()
        }
        if (profileContainer.style.display == "flex") {
            profileContainer.style.display = "none";
        }
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

    socket.on("connect", async () => {
        // sick af in my opinion
        await initPow()

        // join first
        await userJoined(null, null, null, null, true);

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
            console.log(data)

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
            if(!inbox) return true;

            return !inbox.contains(data.event.target);
        }
    )


    ContextMenu.registerClickEvent(
        "inbox reply",
        [
            ".headerIcon.inbox .inbox-container .inbox-content .entry"
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
            if(!entry) return console.error("Couldnt find inbox reply")

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
                onSend: async(html) => {
                    console.log(html, messageId);
                    if(!messageId) throw new Error("Couldnt find inbox reply message id")

                    replyMessageId = messageId;
                    let wasSent = sendMessageToServer(null, null, null, html, true);

                    if(wasSent){
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
                ){
                    closeEmojiBox();
                }
            }

            // inbox
            let inboxContainer = document.querySelector(".inbox-container");
            if(inboxContainer && inboxContainer?.style?.display === "flex" &&
                (!inboxContainer?.contains(data.element) && !data?.element?.classList?.contains("inbox")) &&
                (!PageRenderer?.Element()?.contains(data.element))
            )
            {
                //inboxContainer.style.display = "none";
            }

            // refocus editor
            let editorContainer = document.querySelector(".editor-container");
            if(editorContainer &&
                !editorContainer?.contains(data.element) &&
                //!docsContainer?.contains(data.element) &&
                !emojiContainer.contains(data.element)
            ){
                //focusEditor(); // causes too many dumb bugs as of rn
            }


        }
    )

    ContextMenu.registerContextMenu(
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
            ".user-container .user-icon",
            ".message-container .icon",
            ".message-container .username",
            // vc user from channels
            "#channeltree .category .participants .participant",
            "#channeltree .category .participants .participant .avatar",
        ],
        [
            {
                icon: "&#9878;",
                text: "Ban Member",
                callback: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if (!memberId) {
                        console.warn("Couldnt ban member because memberid wasnt found");
                        return;
                    }

                    ModActions.banUser(memberId)
                },
                condition: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if (!memberId) {
                        console.warn("Couldnt ban member because memberid wasnt found");
                        return;
                    }
                    return (await (await checkPermission("banMember")).permission === "granted") && (memberId !== UserManager.getID())
                },
                type: "error"
            },
            {
                icon: "&#9873;",
                text: "Kick Member",
                callback: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if (!memberId) {
                        console.warn("Couldnt kick member because memberid wasnt found");
                        return;
                    }

                    ModActions.kickUser(memberId)
                },
                condition: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if(!memberId) return false;
                    return (await (await checkPermission("kickUsers")).permission === "granted") && (memberId !== UserManager.getID())
                },
                type: "error"
            },
            {
                icon: "&#9873;",
                text: "Mute Member",
                callback: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if (!memberId) {
                        console.warn("Couldnt mute member because memberid wasnt found");
                        return;
                    }

                    ModActions.muteUser(memberId)
                },
                condition: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if(!memberId) return false;
                    return (await (await checkPermission("muteUsers")).permission === "granted") &&
                        (memberId !== UserManager.getID()) &&
                        data.element.querySelectorAll(".mutedMember").length === 0
                },
                type: "error"
            },
            {
                icon: "&#9873;",
                text: "Unmute Member",
                callback: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if (!memberId) {
                        console.warn("Couldnt mute member because memberid wasnt found");
                        return;
                    }

                    ModActions.unmuteUser(memberId)
                },
                condition: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if(!memberId) return false;
                    return (await (await checkPermission("muteUsers")).permission === "granted") &&
                        (memberId !== UserManager.getID()) &&
                        data.element.querySelectorAll(".mutedMember").length !== 0
                },
                type: "error"
            },
            {
                icon: "&#9741;",
                text: "Disconnect Member",
                callback: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if (!memberId) {
                        console.warn("Couldnt disconnect member because memberid wasnt found");
                        return;
                    }

                    ModActions.disconnectUser(memberId)
                },
                condition: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if(!memberId) return false;
                    return (await (await checkPermission("disconnectUsers")).permission === "granted") && (memberId !== UserManager.getID())
                },
                type: "error"
            },
            {
                icon: "&#10070;",
                text: "Copy ID",
                callback: async (data) => {
                    let memberId = data.element.getAttribute("data-member-id");
                    if (!memberId) {
                        console.warn("Couldnt copy member because memberid wasnt found");
                        return;
                    }

                    navigator.clipboard.writeText(memberId)
                }
            }
        ])
})

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect()

registerMentionClickEvent()

socket.on("updatedEmojis", function () {
    fetchEmojis();
})

// very important
ensureDomPurify()


voip = new VoIP(`${window.location.origin.includes("https") ? "wss" : "ws"}://{{livekit.url}}/`);



socket.on('receiveThreadNew', ({}) => {
    console.log("receiveThreadNew")
    displayHomeUnread()
});

socket.on('updateUnread', () => {
    displayHomeUnread()
});

socket.on('receiveMessage', ({}) => {
    displayHomeUnread()
});

socket.on('receiveContentNew', ({type, item}) => {
    if (item?.notifyAll && String(item.authorId) !== String(UserManager.getID())) {
        displayHomeUnread()
    }
});

socket.on('newReport', () => {
    UserReports.getReports();
});

socket.on('verifyPublicKey', () => {
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

function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;
}


function escapeHtml(text) {

    if (text == null || text.length <= 0) {
        return text;
    }

    var map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function (m) {
        return map[m];
    });
}

async function checkMediaTypeAsync(url) {
    return new Promise((resolve, reject) => {

        if (!isURL(url)) {
            resolve("unkown");
            return;
        }

        socket.emit("checkMediaUrlCache", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            url: url
        }, function (response) {

            if (response.isCached === true) {
                // return cached media type
                resolve(response.mediaType);
            } else {
                // url wasnt cached
                let xhr = new XMLHttpRequest();
                xhr.open('HEAD', `${ChatManager.proxyUrl(url)}`, false); // false makes the request synchronous
                try {
                    xhr.send();
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let contentType = xhr.getResponseHeader('Content-Type');

                        if (contentType) {
                            if (contentType.startsWith('audio/')) {
                                resolve('audio');
                            } else if (contentType.startsWith('video/')) {
                                resolve('video');
                            } else if (contentType.startsWith('image/')) {
                                resolve('image');
                            } else {
                                resolve('unknown');
                            }
                        } else {
                            console.log("Content-Type missing")
                            throw new Error('Content-Type header is missing');
                        }
                    } else {
                        if (xhr.status === 404) resolve ("404");

                        throw new Error(`HTTP error! status: ${xhr.status}`);
                    }
                } catch (error) {
                    console.error('Error checking media type:', error);
                    resolve('error');
                }
            }

        });

    });
}

function handleVideoClick(event, videoElement) {
    event.preventDefault();
    event.stopPropagation();
    const shouldPlay = videoElement.paused;
    document.querySelectorAll(".video-embed").forEach(player => {
        if (player !== videoElement && !player.paused) {
            player.pause();
        }
    });

    if (shouldPlay) {
        videoElement.play().catch(err => console.warn(err));
    } else {
        videoElement.pause();
    }
}


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


function stopRecording() {
    socket.emit("leftVC", {
        id: UserManager.getID(),
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        room: UserManager.getRoom(),
        token: UserManager.getToken()
    });
    //leaveRoom(UserManager.getRoom());
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
        socket.emit("redeemKey", {id: UserManager.getID(), key: key, token: UserManager.getToken()});
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
    return new Blob([array], {type: mime});
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

async function userJoined(onboardingFlag = false, passwordFlag = null, loginNameFlag = null, accessCode = null, initial = false) {
    if (UserManager.getUsername() != null) {
        var username = UserManager.getUsername();

        let knownServers = "";
        if (isLauncher() && initial) {
            await syncHostData()
            knownServers = await Client().GetServers();
        }

        socket.emit("userConnected", {
            id: UserManager.getID(),
            name: username,
            icon: UserManager.getPFP(),
            status: UserManager.getStatus(),
            token: UserManager.getToken(),
            password: passwordFlag,
            onboarding: onboardingFlag,
            aboutme: UserManager.getAboutme(),
            banner: UserManager.getBanner(),
            loginName: loginNameFlag,
            publicKey: await UserManager.getPublicKey(),
            knownServers,
            code: accessCode,
            pow: {
                challenge: localStorage.getItem("pow_challenge"),
                solution: localStorage.getItem("pow_solution")
            }
        }, function (response) {

            // sync data
            if (response?.token) CookieManager.setCookie("token", response.token);
            if (response?.icon) CookieManager.setCookie("pfp", response.icon);
            if (response?.banner) CookieManager.setCookie("banner", response.banner);
            if (response?.aboutme) CookieManager.setCookie("banner", response.aboutme);
            if (response?.status) CookieManager.setCookie("banner", response.status);
            if (response?.loginName) CookieManager.setCookie("banner", response.loginName);
            if (response?.id) CookieManager.setCookie("banner", response.id);

            // if we finished onboarding
            if (!response?.error && response.finishedOnboarding === true && initial) {
                socket.emit("setRoom", {
                    id: UserManager.getID(),
                    room: UserManager.getRoom(),
                    token: UserManager.getToken()
                });
                getGroupBanner();
                socket.emit("getGroupList", {
                    id: UserManager.getID(),
                    group: UserManager.getGroup(),
                    token: UserManager.getToken(),
                    username: UserManager.getUsername(),
                    icon: UserManager.getPFP()
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
                socket.emit("setRoom", {
                    id: UserManager.getID(),
                    room: UserManager.getRoom(),
                    token: UserManager.getToken()
                });

                if (initial) {
                    getChatlog(document.getElementById("content"));
                    getMemberList()
                    getChannelTree()
                    getServerInfo();
                    showGroupStats();
                    focusEditor()

                    /* Quill Emoji Autocomplete */
                    initializeEmojiAutocomplete(document.querySelector('.ql-editor'));
                    initializeMentionAutocomplete(document.querySelector('.ql-editor'));
                }

                socket.emit("checkPermission", {
                    id: UserManager.getID(),
                    token: UserManager.getToken(),
                    permission: "manageReports"
                }, function (response) {
                    if (response.permission === "granted" && initial) {
                        ModView.init();
                        UserReports.getReports();
                    }
                });

            } else {
                if (response.error) {
                    splash.hide()
                    if(response.error.includes("banned")){
                        ChatManager.showInstanceInfo(response.error, "indianred");
                        return;
                    }


                    showSystemMessage({
                        title: response.title || "",
                        text: response.msg || response.error || "",
                        icon: "error",
                        img: null,
                        type: "error",
                        duration: response.displayTime || 3000
                    });

                    if (response?.registration === false) {
                        // show registration prompt
                        customPrompts.showPrompt(
                            `Invite Code`,
                            `
                             <div class="prompt-form-group">
                                 <p>
                                    This server is an invite-only server. <br>
                                    Please enter an invite code to join the server.
                                 </p>
                                 <p>
                                 Already have an account? <a href="#" onclick="UserManager.doAccountLogin()">Log in instead</a>
                                </p>
                             </div>

                             <div class="prompt-form-group">
                                <input class="prompt-input" autocomplete="off" type="text" name="inviteCode" id="inviteCode" placeholder="Enter an invite code" value="">
                                <label style="color: indianred;" class="prompt-label error-text"></label>
                             </div>
                            `,
                            async function (values) {
                                let inviteCode = values?.inviteCode;

                                if (inviteCode && inviteCode.length > 0) {
                                    userJoined(false, null, null, inviteCode);
                                }

                                if (!inviteCode) {
                                    userJoined();
                                }
                            }
                        )
                    }
                }
            }
        });
    }
}

let lastTypingEmitted = 0;

function setTyping() {
    if (new Date().getTime() > lastTypingEmitted) {
        socket.emit("isTyping", {id: UserManager.getID(), token: UserManager.getToken(), room: UserManager.getRoom()});
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


function createYouTubeEmbed(url, messageId) {
    let u = new URL(url.trim());
    let host = u.hostname.replace("www.", "").toLowerCase();

    let code = "";
    let t = "";

    if (u.searchParams.has("t")) t = u.searchParams.get("t");
    if (u.hash.startsWith("#t=")) t = u.hash.replace("#t=", "");
    if (u.hash.startsWith("#")) t = u.hash.replace("#", "");

    if (host === "youtube.com" || host === "m.youtube.com") {
        // watch?v=...
        if (u.searchParams.has("v")) {
            code = u.searchParams.get("v");
        }
        // /embed/...
        else if (u.pathname.startsWith("/embed/")) {
            code = u.pathname.replace("/embed/", "");
        }
        // /shorts/...
        else if (u.pathname.startsWith("/shorts/")) {
            code = u.pathname.replace("/shorts/", "").split("?")[0];
        }
    } else if (host === "youtu.be") {
        code = u.pathname.replace("/", "");
    }

    if (!code) {
        console.warn("No youtube code found in url")
        return;
    }

    let embed = "https://www.youtube.com/embed/" + code;
    if (t) embed += "?start=" + parseInt(t);

    return `
        <div data-message-id="${messageId.replace("msg-", "")}" class="iframe-container" id="msg-${messageId}">
            <a href="${url}" target="_blank">${url}</a><br>
            <iframe
                data-original-url="${url}"
                data-message-id="${messageId.replace("msg-", "")}"
                data-media-type="youtube"
                style="border:none"
                src="${embed}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin">
            </iframe>

        </div>
    `;
}


var notAImage = []
var notAImageCount = []
var validImage = []

function isImage(url) {

    const img = new Image();

    img.src = url;


    if (img.height > 0 && img.width > 0) {
        if (validImage.includes(url) == false) {
            validImage.push(url);
        }


        return true;
    } else {

        // Try to load a image 6 times
        if (notAImage.includes(url) == false && notAImageCount[url] > 6) {
            notAImage.push(url);
        }

        notAImageCount[url]++;
        return false;
    }
}

function isAudio(url) {
    return /\.(mp3|wav|ogg)$/.test(url.toLowerCase());
}

function isVideo(url) {
    return new Promise((resolve) => {
        const vid = document.createElement("video");

        vid.onloadedmetadata = function () {
            resolve(vid.videoWidth > 0 && vid.videoHeight > 0);
        };

        vid.onerror = function () {
            resolve(false);
        };

        vid.src = url;
    });
}


function getUrlFromText(text) {
    var geturl = new RegExp("(^|[ \t\r\n])((ftp|http|https|mailto|file):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))", "g");
    return text.match(geturl)
}

var isValidUrl = []

function isURL(text) {
    try {
        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === "data:";

    } catch (err) {
        return false;
    }
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
    let isScrolledDown = isScrolledToBottom(document.getElementById("content"));

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
        return;
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
    if (await Client()) {
        msgPayload = await Client().SignJson(msgPayload);
    }

    socket.emit("messageSend", msgPayload, async function (response) {
        if (response.error) {
            // do smth in the future with this
            console.error(response.error);
        } else {
            // mark channel as read
            ChatManager.increaseChannelMarkerCount(UserManager.getChannel())
            // mark channel as read
            ChatManager.setChannelMarkerCounter(UserManager.getChannel())
        }
    });

    // reset all flags
    editMessageId = null;
    replyMessageId = null;
    cancelMessageEdit();
    cancelMessageReply();

    scrollDown("sendMessageToServer"); // forgot that
    setTimeout(() => focusEditor(), 1)
    Clock.stop("send_message");

    return true;
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


socket.on('showUserJoinMessage', function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' + '            <p>User <label class="systemAnnouncementChatUsername" id="">' + author.username + '</label> joined the chat!</p>' + '        </div>';

    addToChatLog(chatlog, message);
    scrollDown("userJoinMessage");
});

socket.on('updateGroupList', function (author) {

    getGroupList();
})



function focusEditor() {
    if (!quill) return;

    quill.focus();

    requestAnimationFrame(() => {
        const len = quill.getLength();
        quill.setSelection(len - 1, 0, Quill.sources.SILENT);
    });
}

function focusElementInput(element) {
    element?.focus();

    const length =
        element?.getLength?.() ??
        element?.value?.length ??
        0;

    element?.setSelection?.(length, 0);
    element?.setSelectionRange?.(length, length);
}



function toggleEditor(value) {
    messageInputBox.parentNode.parentNode.style.visibility = value === true ? "visible" : "hidden";
}


function initQuillShit(){

    const Delta = Quill.import('delta');
    const Embed = Quill.import("blots/embed");

    class EmojiBlot extends Embed {
        static create(value) {
            const node = super.create();
            for (const k in value) node.setAttribute(k, value[k]);
            return node;
        }

        static value(node) {
            const out = {};
            for (const a of node.attributes) out[a.name] = a.value;
            return out;
        }
    }

    EmojiBlot.blotName = "emoji";
    EmojiBlot.tagName = "img";

    Quill.DEFAULTS.placeholder = "Write a message...";
    Quill.register(EmojiBlot);


    hljs.configure({
        languages: ['javascript', 'python', 'ruby', 'xml', 'json', 'css', "bash"]
    });


    window.quill = new Quill('#editor', {
        modules: {
            syntax: true,
            toolbar: {
                container: '#editor-toolbar', handlers: {
                    'link': function (value) {
                        if (value) {
                            var href = prompt('Enter the URL');
                            if (href) {
                                quill.format('link', href);
                            }
                        } else {
                            quill.format('link', false);
                        }
                    }
                }
            },
            keyboard: {
                bindings: {
                    enter: {
                        key: 13,
                        handler: function (range, context) {
                            return false;
                        }
                    }
                }
            }
        }, theme: 'snow'
    });

    // Add a matcher specifically for image elements
    quill.clipboard.addMatcher('img', function (node, delta) {
        // Insert a newline before the image content
        return new Delta().insert('\n').concat(delta);
    });


    quill.clipboard.addMatcher('PRE', function (node, delta) {
        return delta.compose(new Delta().retain(delta.length(), {'code-block': true}));
    });

    quill.clipboard.addMatcher(Node.TEXT_NODE, function (node, delta) {
        if (node.parentNode && node.parentNode.tagName === 'PRE') {
            return delta.compose(new Delta().retain(delta.length(), {'code-block': true}));
        }
        return delta;
    });


    /* Quill Size begin */

    editorContainer = document.querySelector('.editor-container');
    editorToolbar = document.getElementById("editor-toolbar");
    editorHints = document.getElementById("editor-hints");
    quillContainer = document.querySelector('.ql-container');
    editor = document.querySelector('.ql-editor');

    initialToolbarHeight = editorToolbar.offsetHeight;
    initialHeight = 40; // Initial height of the editor
    maxHeight = 400; // Maximum height of the editor
    initialMargin = parseFloat(getComputedStyle(editorContainer).marginTop);
    allowEditorBlur = true;

    editor.addEventListener('input', function (event) {
        setTyping();
    });

    editor.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();

            /*
            let msgContent = quill.root.innerHTML
                //    .replace(/<p><br><\/p>/g, "")
                .replace(/<p>\s*<br\s*\/?>\s*<\/p>/g, ""); // Clean up empty lines

             */

            sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), quill.root.innerHTML);
        }
    });
}
/* Quill Emoji resize End */


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


socket.on('receiveChannelTree', function (data) {
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


socket.on('markChannel', function (data) {
    markChannel(data.channelId, false, data?.count);
});

socket.on('createMessageEmbed', function (data) {
    document.querySelector("#msg-" + data.messageId).innerHTML = data.code;
    scrollDown("createMessageEmbed");
});

socket.on('createMessageLink', function (data) {
    document.querySelector("#msg-" + data.messageId).innerHTML = data.code;
    scrollDown("createMessageLink");
});

socket.on('receiveCurrentChannel', function (channel) {
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

socket.on('updateGroupList', function (data) {
    getGroupList();
});

socket.on('receiveGroupList', function (data) {
    if (serverlist.innerHTML !== data) {
        serverlist.innerHTML = "";
        serverlist.innerHTML = data;

        let mobileGroupList = document.getElementById("mobile_GroupList");
        mobileGroupList.innerHTML = data;
    }
    setActiveGroup(UserManager.getGroup())

    //reapplyUnreadFromCookies();
    displayHomeUnread();
});


socket.on('newMemberJoined', function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' + '            <p><label class="systemAnnouncementChatUsername">' + author.name + '</label> joined the server! <label class="timestamp" id="' + author.timestamp + '">' + author.timestamp.toLocaleString("narrow") + '</p>' + '        </div>';

    addToChatLog(chatlog, message);
    scrollDown("newMemberJoined");

});

socket.on('memberOnline', function (member) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' + '            <p><label class="systemAnnouncementChatUsername">' + member.username + '</label> is now online!</p>' + '        </div>';

    addToChatLog(chatlog, message);
    scrollDown("memberOnline");
});

socket.on('memberPresent', function (member) {
});

socket.on('receiveGifImage', function (response) {
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


socket.on('receiveToken', function (data) {
    CookieManager.setCookie("dcts_token", data, 365);
});

socket.on('modalMessage', function (data) {
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

    socket.emit("getAllUnread", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {
        let unread = Number(response?.unread ?? 0);

        let indicators = document.querySelectorAll('.home-indicator');
        if (!indicators) return console.warn('.home-indicator not found');

        indicators.forEach(indicator => {
            if (unread > 0) {
                if (unread >= 10) indicator.style.borderRadius = "6px";

                indicator.innerHTML = `${unread > 1000 ? "Too many :o" : unread}`;
                indicator.classList.add('visible');
                indicator.setAttribute('aria-label', `${unread} ungelesene Nachrichten`);
            } else {
                indicator.innerHTML = '';
                indicator.classList.remove('visible');
                indicator.removeAttribute('aria-label');
            }
        })
    });
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

    socket.emit("getEmojis", {id: UserManager.getID(), token: UserManager.getToken()}, async function (response) {

        if (response.type === "success") {
            //settings_icon.value = response.msg;
            //emojiContainer.innerHTML = "<div id='emoji-box-header'><h2>Emojis</h2></div>";

            //emojiEntryContainer.innerHTML = "";
            emojiEntryContainer.style.display = "flex";
            for(let emoji of response.data.reverse()){

                const base = emoji.filename.replace(/\.[^/.]+$/, "");
                const parts = base.split("_");

                var emojiId = parts[0];
                var emojiName = parts.length > 1 ? parts.slice(1).join("_") : parts[0];

                let existingEmojiElement = emojiEntryContainer.querySelector(`.emoji-entry[data-hash="${emojiId}"]`);

                if (hasEmojiInContainer(emojiId)) {
                    if(existingEmojiElement) registerEmojiCallback(existingEmojiElement, emoji);
                    continue;
                }

                const entry = document.createElement("div");
                entry.className = "emoji-entry";
                entry.setAttribute("data-hash", emojiId)
                entry.title = emoji.name;

                const imgWrap = document.createElement("div");
                imgWrap.className = "emoji-img";

                const img = document.createElement("img");
                img.className = "emoji";
                img.src = `/emojis/${emoji.filename}`;

                imgWrap.appendChild(img);
                entry.appendChild(imgWrap);

                registerEmojiCallback(entry, emoji);


                emojiEntryContainer.appendChild(entry);
            }

            removeUnusedEmojisFromContainer(response)

            //notify(response.msg)
        } else {
            showSystemMessage({
                title: response.msg || "", text: "", icon: response.type, img: null, type: response.type, duration: 1000
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

socket.on('receiveGroupBanner', function (data) {
    groupbanner.src = ChatManager.proxyUrl(data);
    document.getElementById("mobile_groupBannerDisplay").src = ChatManager.proxyUrl(data);
});

function getChannelObjectFromTree(channelId) {
    const id = String(channelId);
    return (document.querySelector(`#channellist a#channel-${id}`) || document.querySelector(`#channellist li#channel-${id}`));
}


function refreshValues() {
    /* Deprecated? */
    var username = UserManager.getUsername();
    getRoles();
    userJoined();
    getServerInfo();

    socket.emit("setRoom", {
        id: UserManager.getID(),
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        room: UserManager.getRoom(),
        token: UserManager.getToken()
    });
    getGroupList();
    getMemberList();
    getChannelTree();
    socket.emit("getCurrentChannel", {
        id: UserManager.getID(),
        username: username,
        icon: UserManager.getPFP(),
        group: UserManager.getGroup(),
        category: UserManager.getCategory(),
        channel: UserManager.getChannel(),
        token: UserManager.getToken()
    });
}

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

var serverName;
var serverDesc;

async function getServerInfo(returnData = false) {
    return new Promise((resolve, reject) => {

        // reject if we get disconnected or something
        setTimeout(() => {
            if(!socket.connected){
                resolve(null);
            }
        }, 1000)

        //Official <span style="font-weight: bold; color: skyblue;">DCTS <span style="font-weight: bold; color: cadetblue;">Community</span></span>
        socket.emit("getServerInfo", {id: UserManager.getID(), token: UserManager.getToken()}, async function (response) {
            if(returnData) return resolve(response);
            var headline = document.getElementById("header");

            servername = response.serverinfo.name;
            serverdesc = response.serverinfo.description;
            let countryCode = response.serverinfo.countryCode;

            headline.innerHTML = `

            <div id="main_header">
                ${countryCode ? `${ChatManager.countryCodeToEmoji(countryCode)} ` : ""}${sanitizeHtmlForRender(servername, false)} ${serverdesc ? ` - ${sanitizeHtmlForRender(serverdesc, false)}` : ""}
            </div>

            <div id="badges"></div>          
            <div id="headerRight">
                <div class="headerIcon help" onclick="ChatManager.showInstanceInfo()"></div>
                <div class="headerIcon donators" onclick="UserManager.showDonatorList('https://shy-devil.me/app/dcts/');"></div>
                <div class="headerIcon inbox">
                    <span id="inbox-indicator"></span>

                    ${await Inbox.getContentHTML()}
                </div>
            </div>
            `;


            UserManager.displayServerBadges();
        });

        displayDiscoveredHosts();
    })
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
    let urlData = param.split("&")
    let groupId = urlData[0]?.replace("?group=", "")
    let categoryId = urlData[1]?.replace("category=", "")
    let channelId = urlData[2]?.replace("channel=", "")
    focusEditor()

    if (!isVC) showHome(true)

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
            console.log(response)
            switchLeftSideMenu(true)

            // update grouplist and channel tree if we only
            // click on a group
            if (groupId && !categoryId && !channelId) {
                getChannelTree();
            }

            changedChannel()
            ChatManager.setChannelMarker(channelId, false)

            chatlog.innerHTML = "";
            document.getElementById("messagebox").style.display = "flex";
            focusEditor();
            getChatlog(document.getElementById("content"));
            showGroupStats();

            if (response.permission !== "granted") {
                toggleEditor(false);
            } else {
                toggleEditor(true);
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

function isScrolledToBottom(element) {
    return Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 1;
}


function scrollDown(functionCaller) {
    const contentDiv = document.getElementById("content");
    if (!contentDiv) return;

    const scroll = () => contentDiv.scrollTop = contentDiv.scrollHeight;
    scroll();

    let tries = 0;
    const interval = setInterval(() => {
        scroll();
        tries++;
        if (tries > 3) clearInterval(interval);
    }, 200);

    if (functionCaller) console.log(`ScrollDown called by ${functionCaller}`);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDb(length) {
    for (let i = 1; i < length; i++) {
        await sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), `${i}`);
        await sleep(500);
    }
}

socket.on("uploadProgress", ({filename, bytes, total}) => {
    const percent = total ? Math.min(100, (bytes / total) * 100) : 0;
    showSystemMessage({
        title: `File ${percent}% uploaded`,
        text: ``,
        icon: "info",
        type: "neutral",
        duration: 2000
    });
});

function initUploadDragAndDrop(){

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
