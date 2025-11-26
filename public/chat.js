console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

ChatManager.applyThemeOnLoad(UserManager.getTheme(), UserManager.getThemeAccent());

const splash = new SplashScreen(document.body);
splash.show();

if(!window.isSecureContext){
    splash.hide();

    function showSecureContextError(duration){
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


// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect()

socket.on("connect", async () => {
    console.log("socket connected");

    // join first
    await userJoined(null, null, null, null, true);

    // sick af in my opinion
    await initPow()
});

socket.on("updatedEmojis", function (){
    fetchEmojis();
})

// very important
ensureDomPurify()



voip = new VoIP( `${window.location.origin.includes("https") ? "wss" : "ws"}://{{livekit.url}}/`);

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
        ".mention",
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
        let memberId = data.element.getAttribute("data-member-id");
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

ContextMenu.registerContextMenu(
    "memberprofile",
    [
        ".memberlist-container",
        ".memberlist-container .name",
        ".memberlist-container .status",
        ".memberlist-img",
        ".mention",
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
            icon: "&#9998;",
            text: "Mention Member",
            callback: async (data) => {
                let memberId = data.element.getAttribute("data-member-id");
                if (!memberId) {
                    console.warn("Couldnt mention member because memberid wasnt found");
                    return;
                }

                mentionUser(memberId);
            },
            type: "ok"
        },
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
        },
    ])


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

const customPrompts = new Prompt();
const tooltipSystem = new TooltipSystem();
const customAlerts = new CustomAlert();


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

function isElementVisible(element){
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;
}

async function updateMarkdownLinks(delay) {
    const elements = document.querySelectorAll(".contentRows .content p");
    const max = Math.min(elements.length, 50);
    const isScrolledDown = isScrolledToBottom(document.getElementById("content"));

    let markdownChanged = false;

    for (let i = elements.length - 1; i >= elements.length - max; i--) {
        const el = elements[i];
        if (!el || el.className.includes("hljs")) continue;
        if (el.parentNode.querySelector(".video-embed")) continue;

        try {
            if (el.innerText.trim().length === 0) continue;

            // skip if the element isnt visible. some way
            // to avoid the chat log from jumping all the time
            if (!isElementVisible(el)) continue;

            const messageId = el.getAttribute("data-message-id") || el.parentNode?.getAttribute("data-message-id");
            const marked = await markdown(el.innerText, messageId);

            if (marked.message != null &&
                ((!marked.isMarkdown && marked.message !== el.innerText) ||
                    (marked.isMarkdown && marked.message !== el.innerHTML))) {

                bypassCounter[el.id] = (bypassCounter[el.id] || 0) + 1;
                if (!bypassElement[el.id]) {

                    el.innerHTML = marked.isMarkdown
                        ? sanitizeHtmlForRender(marked.message)
                        : el.innerText;
                    markdownChanged = true;
                }
            }
        } catch (err) {
            console.log(err);
        }
    }

    if (markdownChanged && isScrolledDown) {
        //scrollDown("updateMarkdown");
    }

    setTimeout(() => updateMarkdownLinks(delay), delay);
}


updateMarkdownLinks(2000)// If markdown didnt get converted, this will

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
                xhr.open('HEAD', `/proxy?url=${encodeURIComponent(url)}`, false); // false makes the request synchronous
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
                        if (xhr.status === 404) return;

                        throw new Error(`HTTP error! status: ${xhr.status}`);
                    }
                } catch (error) {
                    console.error('Error checking media type:', error);
                    reject('error');
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
* */
function encodeToBase64(jsonString) {
    return btoa(encodeURIComponent(jsonString));
}

function decodeFromBase64(base64String) {
    return decodeURIComponent(atob(base64String));
}

async function markdown(msg, msgid) {
    if (msg == null) {
        return {isMarkdown: false, message: msg};
    }

    if(!msgid){
        console.warn("Cant check markdown because no msg id set")
        return {isMarkdown: false, message: msg};
    }

    try {
        // yes another try to keep going
        let mediaType;
        try{
            // Check if if we even have a url
            if (isURL(msg)) {
                mediaType = await checkMediaTypeAsync(msg);
            } else {
                // Markdown Text formatting
                if (!isURL(msg) && mediaType != "video" && mediaType != "audio" && mediaType != "image" && msg.length != 0) {
                    return {isMarkdown: false, message: msg};
                }
            }
        }
        catch(mediaTypeError) {
            console.error("Error while checking media type")
            console.error(mediaTypeError);
        }

        const msgUrls = getUrlFromText(msg);

        for (const url of msgUrls) {
            if (isURL(url)) {

                // only proxy if not origin
                let proxyUrl =`${window.location.origin}/proxy?url=${encodeURIComponent(url)}`;
                if(url.toLowerCase().startsWith(window.location.origin.toLowerCase())){
                    proxyUrl = url;
                }

                if (mediaType === "audio") {
                    msg = msg.replace(url, createAudioPlayerHTML(proxyUrl)).replaceAll("\n", "");
                    return {isMarkdown: true, message: msg}

                } else if (mediaType === "image") {
                    msg = msg.replace(url, `<div class="image-embed-container">
                                                <img draggable="false" class="image-embed" data-message-id="${msgid.replace("msg-", "")}" id="msg-${msgid.replace("msg-", "")}" alt="${proxyUrl}" src="${proxyUrl}" onerror="this.src = '/img/error.png';" >
                                            </div>`);
                    return {isMarkdown: true, message: msg}

                } else if (mediaType === "video") {
                    msg = msg.replace(url, `
                                            <p data-message-id="${msgid.replace("msg-", "")}" ><a data-message-id="${msgid.replace("msg-", "")}" href="${url}" target="_blank">${url}</a></p>
                                            <video data-message-id="${msgid.replace("msg-", "")}" data-src="${proxyUrl}" preload="auto" style="background-color: black;" class="video-embed" controls>
                                                <source data-message-id="${msgid.replace("msg-", "")}" src="${proxyUrl}">
                                            </video></div>`);
                    return {isMarkdown: true, message: msg}

                } else {
                    if (url.toLowerCase().includes("youtube") || url.toLowerCase().includes("youtu.be")) {
                        msg = msg.replace(url, createYouTubeEmbed(url, msgid));
                        return {isMarkdown: true, message: msg}

                    } else {
                        msg = msg.replace(url, `<a data-message-id="${msgid.replace("msg-", "")}" href="${url}" target="_blank">${url}</a>`);
                        return {isMarkdown: true, message: msg}
                    }
                }
            }

        }

        return {isMarkdown: false, message: msg};
    } catch (error) {
        console.error('Error in markdown function:', error);
        return {isMarkdown: false, message: msg};
    }
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



function mentionUser(id) {
    const range = quill.getSelection(true);
    if (range) {
        quill.insertText(range.index, `<@${id}>`);
        quill.setSelection(range.index + (`<@${id}>`).length);
    }

    focusEditor();
}

function getMemberProfile(id, x, y, event = null, bypassEventCheck = false) {
    if (!event && bypassEventCheck === false) return;

    var profileContent = document.getElementById("profile_container");

    if (x == null && y == null) {
        x = event.clientX;
        y = event.clientY;
    }

    console.log(x, y)

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

function openNewTab(url) {
    if (url.startsWith("data:")) {
        const blob = dataURLtoBlob(url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
    } else {
        window.open(url, "_blank");
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
            code: accessCode
        }, function (response) {

            // if we finished onboarding
            if (!response.error && response.finishedOnboarding === true && initial) {
                socket.emit("setRoom", {
                    id: UserManager.getID(),
                    room: UserManager.getRoom(),
                    token: UserManager.getToken()
                });
                socket.emit("getGroupBanner", {
                    id: UserManager.getID(),
                    token: UserManager.getToken(),
                    username: UserManager.getUsername(),
                    icon: UserManager.getPFP(),
                    group: UserManager.getGroup()
                });
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

                if(initial){
                    getMemberList()
                    getChannelTree()
                    getServerInfo();
                    getChatlog();
                    showGroupStats();

                    setTimeout(() => {
                        splash.hide()
                    }, 1000)

                    /* Quill Emoji Autocomplete */
                    initializeEmojiAutocomplete(document.querySelector('.ql-editor'));
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
    if(new Date().getTime() > lastTypingEmitted){
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
}



function createYouTubeEmbed(url, messageid) {

    var videocode = url.replace("https://www.youtube.com/watch?v=", "").replaceAll(" ", "");
    if (url.toLowerCase().includes("youtube")) {
        videocode = url.replace("https://www.youtube.com/watch?v=", "").replaceAll(" ", "");
    } else if (url.toLowerCase().includes("youtu.be")) {
        videocode = url.replace("https://youtu.be/", "").replaceAll(" ", "");
    }

    var code = `
                <div data-message-id="${messageid.replace("msg-", "")}" class="iframe-container" id="msg-${messageid}" data-message-id="${messageid.replace("msg-", "")}" >
                    <iframe 
                    data-message-id="${messageid.replace("msg-", "")}"                     
                    style="border: none;"
                    src="https://www.youtube.com/embed/${videocode}" 
                    title="YouTube video player" frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin">
                                    
                    </iframe>
                </div>
                `;
    return code;
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

function switchLeftSideMenu(checkChannelLink = false) {

    let leftSideMenuContainer = document.getElementById("mobile_GroupAndChannelContainer")

    if (leftSideMenuContainer.style.display == "block") {

        if (UserManager.getCategory() != null && UserManager.getChannel() != null && checkChannelLink == true) leftSideMenuContainer.style.display = "none"; else if (checkChannelLink == false) leftSideMenuContainer.style.display = "none";
    } else {
        leftSideMenuContainer.style.display = "block";
    }
}


function switchRightSideMenu() {

    let rightMenuContainer = document.getElementById("mobile_memberlist")

    if (rightMenuContainer.style.display == "block") {
        rightMenuContainer.style.display = "none";
    } else {
        rightMenuContainer.style.display = "block";
        rightMenuContainer.style.transform = `translateX(-${rightMenuContainer.offsetWidth}px)`
    }
}

async function replaceInlineImagesInQuill() {
    const container = quill.root;
    const images = container.querySelectorAll("img[src^='data:image/']");

    for (const img of images) {
        try {
            const uploadedUrl = await ChatManager.srcToFile(img.src);

            if (typeof uploadedUrl === "string") {
                img.src = uploadedUrl;
                console.log(`Image uploaded: ${uploadedUrl}`);
            } else {
                console.error("Upload failed:", uploadedUrl);
                img.remove();
            }
        } catch (err) {
            console.error("Error uploading image:", err);
            img.remove();
        }
    }
}

function replaceInlineEmojis() {
    const container = quill.root;
    const emojis = container.querySelectorAll("img.inline-text-emoji");

    for (const img of emojis) {
        const hash = img.getAttribute("data-filehash");
        if (!hash) {
            img.remove();
            continue;
        }

        const code = `:${hash}:`;
        img.replaceWith(code);
    }
}


async function sendMessageToServer(authorId, authorUsername, pfp, message) {
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
        //alert("Please select any channel first");
        return;
    }

    //message = message.replaceAll("<p><br></p>", "");

    replaceInlineEmojis();
    await replaceInlineImagesInQuill();

    if (!message) message = quill.root.innerHTML;

    let msgPayload = {
        id: authorId,
        name: authorUsername,
        icon: pfp,
        token: UserManager.getToken(),
        message: message,
        group: UserManager.getGroup(),
        category: UserManager.getCategory(),
        channel: UserManager.getChannel(),
        room: UserManager.getRoom(),
        editedMsgId: editMessageId,
        replyMsgId: replyMessageId
    };

    // if we're using the client, sign the message
    if (await isLauncher()) {
        msgPayload = JSON.parse(await Client().SignJson(JSON.stringify(msgPayload)));
    }

    socket.emit("messageSend", msgPayload, async function (response) {
        if (response.error) {
            // do smth in the future with this
            console.error(response.error);
        }
        else{
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
}

function resolveMentions() {
    var mentions = document.querySelectorAll(".message-container label.mention")

    if (mentions.length <= 0) {
        return;
    }

    mentions.forEach(mention => {
        var userId = UserManager.getID();

        if (mention.id.replace("mention-", "") == userId) {
            mention.parentNode.style.backgroundColor = "rgba(255, 174, 0, 0.12)";
            //mention.parentNode.style.borderRadius = "6px";
            mention.parentNode.style.borderLeft = "3px solid rgba(255, 174, 0, 0.52)";
            mention.parentNode.style.marginTop = "0px";
            mention.parentNode.style.width = "calc(100% - 8px)";
        } else {
            mention.style.backgroundColor = "transparent";
        }

    })
}

var audio = new Audio();

function playSound(sound, volume = 0.5) {
    audio.src = `/sounds/${sound}.mp3`;
    audio.volume = volume;
    audio.play();
}

socket.on('doAccountOnboarding', async function (message) {
    UserManager.doAccountOnboarding()
});


function compareTimestamps(stamp1, stamp2) {
    // Calculate time passed
    var firstdate = stamp1 / 1000;

    var seconddate = stamp2 / 1000;
    var diff = firstdate - seconddate;
    var minutesPassed = Math.round(diff / 60);

    return minutesPassed;
}


socket.on('showUserJoinMessage', function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' + '            <p>User <label class="systemAnnouncementChatUsername" id="">' + author.username + '</label> joined the chat!</p>' + '        </div>';

    addToChatLog(chatlog, message);
    scrollDown("userJoinMessage");
});

socket.on('updateGroupList', function (author) {

    getGroupList();
});

let editMessageId = null;
let replyMessageId = null;

function cancelMessageReply() {
    replyMessageId = null;
    let editHint = editorToolbar.querySelector("#editMsgHint");
    if (editHint) editHint.remove();
}

function cancelMessageEdit() {

    editor.innerHTML = "<p><br></p>";
    editMessageId = null;
    let editHint = editorToolbar.querySelector("#editMsgHint");
    if (editHint) editHint.remove();
}

function replyToMessage(messageId){
    if (editorToolbar.querySelector("pre#editMsgHint") == null) {
        editorToolbar.insertAdjacentHTML("afterbegin", `<p id="editMsgHint" onclick='cancelMessageReply()'>You are replying to a message</p>`)
    }
    replyMessageId = messageId;

    focusEditor()
}


function editMessage(id) {
    if (editMessageId == null && editorToolbar.querySelector("pre.editMsgHint") == null) {
        editorToolbar.insertAdjacentHTML("afterbegin", `<p id="editMsgHint" onclick='cancelMessageEdit()'>You are editing a message</p>`)
    }

    let msgContent = document.querySelector(`.message-container .content[data-message-id="${id}"]`).cloneNode(true);
    if(msgContent.querySelector(".messageActions")){
        msgContent.querySelector(".messageActions").remove()
    }

    if(msgContent.querySelector(".edit-notice")){
        msgContent.querySelector(".edit-notice").remove()
    }

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

    setTimeout(() => {
        const regex = /<p>\s*<\/p>/gm;
        quill.pasteHTML(msgContent.innerHTML.replace(regex, ''));

        focusEditor()
    }, 1);
}

function focusEditor(){
    editor.focus();
    const length = quill.getLength();
    quill.setSelection(length, 0);
}

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

Quill.register(EmojiBlot);








hljs.configure({
    languages: ['javascript', 'python', 'ruby', 'xml', 'json', 'css']
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
                    handler: function(range, context) {
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

var editorContainer = document.querySelector('.editor-container');
var editorToolbar = document.getElementById("editor-toolbar");
var quillContainer = document.querySelector('.ql-container');
var editor = document.querySelector('.ql-editor');

var initialToolbarHeight = editorToolbar.offsetHeight;
var initialHeight = 40; // Initial height of the editor
var maxHeight = 400; // Maximum height of the editor
var initialMargin = parseFloat(getComputedStyle(editorContainer).marginTop);
var allowEditorBlur = true;

editor.addEventListener('keydown', function (event) {

    setTyping();

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


function deleteMessageFromChat(id) {
    socket.emit("deleteMessage", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        messageId: id,
        group: UserManager.getGroup(),
        category: UserManager.getCategory(),
        channel: UserManager.getChannel()
    });
}

socket.on('memberTyping', function (members) {

    var runner = 0;
    var displayUsersText = "";

    if (members.length <= 0) {
        typingIndicator.innerText = "H";
        typingIndicator.style.color = "transparent";
        return;
    }

    if (members.length == 1) {
        displayUsersText += limitString(members[0], 15) + " is typing...";
    } else if (members.length == 2) {
        displayUsersText += limitString(members[0], 15) + " and " + limitString(members[1], 15) + " are typing...";
    } else {
        members.forEach(member => {

            // Show multiple typing
            if (runner <= 2) {
                displayUsersText += limitString(member, 15) + ", ";
            }
            runner++;
        });
    }

    if (runner > 2) {
        displayUsersText += " and " + members.length - 2 + " users are typing";
    }

    typingIndicator.innerText = displayUsersText;
    typingIndicator.style.color = "hsl(from var(--main) h s calc(l * 8))";
});


socket.on('receiveChannelTree', function (data) {
    getChannelTree()
});


socket.on('updateChatlog', async function (data) {
    getChatlog();
});


function markCurrentChannelStyle(channelId) {
    let channels = document.querySelectorAll("#channellist a");

    channels.forEach(channel => {
        if (channel.parentNode.classList.contains("selected")) {
            channel.parentNode.classList.remove("selected")
        }
    });

    let targetChannel = document.querySelector("#channellist li#channel-" + channelId);
    if (targetChannel) targetChannel.classList.add("selected");

}

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

socket.on('updateMemberList', function (data) {
    getMemberList();
});

socket.on('updateGroupList', function (data) {
    getGroupList();
});

socket.on('receiveGroupList', function (data) {
    if(serverlist.innerHTML !== data){
        serverlist.innerHTML = "";
        serverlist.innerHTML = data;

        let mobileGroupList = document.getElementById("mobile_GroupList");
        mobileGroupList.innerHTML = data;
    }
    setActiveGroup(UserManager.getGroup())

    reapplyUnreadFromCookies();
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

    if(response?.gifs){
        for(let gif of response.gifs){
            console.log(gif)
            document.getElementById("gif-entry-container").insertAdjacentHTML("beforeend", `<img 
                    onclick="sendGif('${gif.media_formats.gif.url}')" src="${gif.media_formats.gif.url}"
                    style="padding: 1%;border-radius: 20px;float: left;width: 48%; height: fit-content;">`);
        }
    }

});


socket.on('receiveToken', function (data) {
    CookieManager.setCookie("dcts_token", data, 365);
});

socket.on('modalMessage', function (data) {

    console.log(data)

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

    if(data?.action && data?.action === "register"){
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


document.getElementById("message-actions-image").onclick = function (e) {
    var x = e.clientX;
    var y = e.clientY;

    var emojiBox = document.getElementById("emoji-box-container");

    var clickedElement = document.elementFromPoint(x, y)

    if (clickedElement.id != "message-actions-image") {
        return;
    }

    if (emojiBox.style.display == "flex") {
        closeEmojiBox();
    } else {
        emojiBox.style.display = "flex";
        selectEmojiTab(document.getElementById("emoji-box-emojis"))
        getEmojis()

        var test = document.getElementById("message-actions-image");

        emojiBox.style.position = "fixed";
        emojiBox.style.top = (y - emojiBox.offsetHeight - 40) + "px";
        emojiBox.style.left = x - emojiBox.offsetWidth + "px";
    }
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

function queryTenorSearch(search){
    socket.emit("searchTenorGif", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        search
    }, function (response) {
        if (response.type === "success") {
            console.log("Tenor Response", response);
        } else {
            showSystemMessage({
                title: response.msg,
                text: "",
                icon: response.type,
                img: null,
                type: response.type,
                duration: 1000
            });
        }
    });
}

function listenForGifSearch(){

    const gifContainer = document.getElementById("gif-entry-container");
    const emojiEntryContainer = document.getElementById("emoji-entry-container");

    var gifSearchbarInput = document.getElementById("gif-searchbar-input");
    // Execute a function when the user presses a key on the keyboard
    let gifSearchTimeout;
    gifSearchbarInput.addEventListener("input", function () {
        clearTimeout(gifSearchTimeout);

        gifSearchTimeout = setTimeout(() => {
            const query = gifSearchbarInput.value.trim();
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

    sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), url);

    closeEmojiBox();
}

function closeEmojiBox() {
    var emojiContainer = document.getElementById("emoji-box-container");
    emojiContainer.style.display = "none";

    var emojiEntryContainer = document.getElementById("emoji-entry-container");
    var gifEntryContainer = document.getElementById("emoji-entry-container");
    emojiEntryContainer.innerHTML = "";

    emojiEntryContainer.style.display = "flex";
    gifEntryContainer.style.display = "none";

    var emojiTab = document.getElementById("emoji-box-emojis");
    var gifTab = document.getElementById("emoji-box-gifs");

    try {
        emojiTab.classList.add("SelectedTab");
        gifTab.classList.remove("SelectedTab");
    } catch (e) {
        console.log(e)
    }
}


function changeGIFSrc(url, element) {
    element.src = url;
}

function clearGifContainer(){
    document.getElementById("gif-entry-container").innerHTML = `<div id="gif-searchbar"><input autocomplete="off" id="gif-searchbar-input"
                                                       placeholder="Search anything, then press enter" type="text"></div>`;
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

function getEmojis() {
    var emojiContainer = document.getElementById("emoji-box-container");
    var emojiEntryContainer = document.getElementById("emoji-entry-container");
    var gifEntryContainer = document.getElementById("gif-entry-container");
    gifEntryContainer.innerHTML = "";
    gifEntryContainer.style.display = "none"

    socket.emit("getEmojis", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {

        if (response.type === "success") {
            //settings_icon.value = response.msg;
            //emojiContainer.innerHTML = "<div id='emoji-box-header'><h2>Emojis</h2></div>";

            emojiEntryContainer.innerHTML = "";
            emojiEntryContainer.style.display = "flex";
            response.data.reverse().forEach(emoji => {

                var emojiId = emoji.filename.split("_")[0];
                var emojiName = emoji.filename.split("_")[1].split(".")[0];

                const entry = document.createElement("div");
                entry.className = "emoji-entry";
                entry.title = emoji.name;

                const imgWrap = document.createElement("div");
                imgWrap.className = "emoji-img";

                const img = document.createElement("img");
                img.className = "emoji";
                img.src = `/emojis/${emoji.filename}`;

                imgWrap.appendChild(img);
                entry.appendChild(imgWrap);

                entry.addEventListener("click", () => {
                    insertEmoji(emoji, true);
                    focusEditor();
                    document.getElementById("emoji-box-container").style.display = "none";
                });

                emojiEntryContainer.appendChild(entry);
            })

            //notify(response.msg)
        } else {
            showSystemMessage({
                title: response.msg, text: "", icon: response.type, img: null, type: response.type, duration: 1000
            });
        }

        console.log(response);
    });
}

socket.on('receiveGroupBanner', function (data) {
    groupbanner.src = data;
    document.getElementById("mobile_groupBannerDisplay").src = data;
});

function getChannelObjectFromTree(channelId) {
    const id = String(channelId);
    return (document.querySelector(`#channellist a#channel-${id}`) || document.querySelector(`#channellist li#channel-${id}`));
}


function refreshValues() {
    return;
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

function getMemberList() {
    socket.emit("getMemberList", {
        id: UserManager.getID(),
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        token: UserManager.getToken(),
        channel: UserManager.getChannel(),
        group: UserManager.getGroup()
    }, function (response) {

        if (response.error) {
            showSystemMessage({
                title: response.msg, text: "", icon: response.type, img: null, type: response.type, duration: 1000
            });
        } else {
            memberlist.innerHTML = response.data;
            document.getElementById("mobile_memberlist").innerHTML = response.data;
        }

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
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        group: UserManager.getGroup(),
        token: UserManager.getToken()
    });
}

var serverName;
var serverDesc;

function getServerInfo(returnData = false) {
    socket.emit("getServerInfo", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {

        var headline = document.getElementById("header");

        servername = response.name;
        serverdesc = response.description;

        headline.innerHTML = `

        <div>
            ${servername} ${serverdesc ? ` - ${serverdesc}` : ""}
        </div>
        
        <div id="badges"></div>
        
        <div id="headerRight">
            <div class="headerIcon help" onclick="newUserExplainUI()"></div>
            <div class="headerIcon donators" onclick="UserManager.showDonatorList('https://shy-devil.me/app/dcts/');"></div>
        </div>
        `;


        UserManager.displayServerBadges();
    });

    displayDiscoveredHosts();

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

    if(!isVC) showHome(true)

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
                await setupVC(channelId);
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
            if (response.permission === "granted") {
                switchLeftSideMenu(true)

                // update grouplist and channel tree if we only
                // click on a group
                if(groupId && !categoryId && !channelId){
                    getChannelTree();
                }

                changedChannel()
                ChatManager.setChannelMarker(UserManager.getChannel(), false)

                chatlog.innerHTML = "";
                document.getElementById("messagebox").style.display = "flex";
                document.querySelector('.ql-editor').focus();

                getChatlog();
            } else {
                chatlog.innerHTML = "";
                document.getElementById("messagebox").style.display = "none";
            }
        });
    }


    // get group stats
    showGroupStats();
    getMemberList();
}

function changedChannel(){
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
}


function showGroupStats() {
    // If we only clicked a group and no channel etc the main windows is empty.
    // lets show some nice group home / welcome screen
    if (UserManager.getGroup() !== null && UserManager.getCategory() === null && UserManager.getChannel() === null) {

        messageInputBox.parentNode.parentNode.style.visibility = "hidden";
        socket.emit("getGroupStats", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            group: UserManager.getGroup()
        }, function (response) {

            if (response.type === "success") {

                // Not enough users chatted to show group stats
                if (response.mostActiveUsers.length <= 1) return;

                contentBox = document.getElementById("content");
                contentBox.innerHTML = ""

                let code = `
                    <div id="homeScreenGroupContainer">
                        <h1 style="text-align: center">${response.group.info.name}</h1><br>
                        <h2>Top 100 Active Users</h2><hr>

                        <div id="homeGroupStatsMostActiveUserContainer">
                    `;

                // Generate user entries as divs instead of table rows
                for (let i = 0; i < response.mostActiveUsers.length; i++) {
                    let user = response.mostActiveUsers[i];

                    // Skip if user is null
                    if (!user) continue;

                    let username = user.user.name;
                    let message_count = user.message_count;

                    code += `
                        <div class="activeUserEntry" onclick='getMemberProfile("${user.user.id}", null, null, event)'>
                            <p class="activeUserEntryName">${username}</p>
                            <div class="activeUserEntryDivider"></div>
                            <p class="activeUserEntryName">${message_count} messages</p>
                        </div>
                    `;
                }

                code += `</div></div>`; // Close the flex container divs

                contentBox.insertAdjacentHTML("beforeend", code);


            } else {
                showSystemMessage({
                    title: response.msg || response.error,
                    text: "",
                    icon: response.type,
                    img: null,
                    type: response.type,
                    duration: 1000
                });
            }
        });
    } else {
        if (messageInputBox.parentNode.parentNode) messageInputBox.parentNode.parentNode.style.visibility = "visible";
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

            console.log('Title:', title);
            console.log('Description:', description);
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
    }, 100);

    if (functionCaller) console.log(`ScrollDown called by ${functionCaller}`);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDb(length){
    for(let i = 1; i < length; i++){
        await sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), `${i}`);
        await sleep(500);
    }
}



var uploadObject = document.getElementById('content');

// Handle the file drop event
uploadObject.addEventListener('drop', async function (e) {
    e.preventDefault();
    uploadObject.style.backgroundColor = '';

    // dont upload in vc
    if (uploadObject.querySelector(".vc-container")) return;

    const files = Array.from(e.dataTransfer.files); // Handle multiple files if needed
    const fileSize = files[0].size / 1024 / 1024; // Example: Display the size of the first file
    console.log(`File dropped. Size: ${fileSize.toFixed(2)} MB`);

    try {
        // Call upload and wait for the result
        const result = await upload(files);
        console.log(result);

        if (result.status === "done") {
            console.log("All files uploaded successfully. URLs:", result.urls);

            // Process the URLs array
            for (const [index, url] of result.urls.entries()) {
                console.log(`File ${index + 1} uploaded to: ${url}`);
                sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), window.location.origin + url); // Sending all URLs at once


            }
        } else {
            console.error("Upload encountered an error:", result.error);
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

