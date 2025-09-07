console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
        // Escape special characters in the search string if it's not a regex
        const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedSearch, 'g'); // Create a global regex
        return this.replace(regex, replacement);
    };
}

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect()

// very important
ensureDomPurify()

// sick af in my opinion
initPow(() => {
    userJoined();
    showGroupStats();

    socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageReports" }, function (response) {
        if (response.permission == "granted") {
            ModView.init();
            UserReports.getReports();
        }
    });

})

socket.on('receiveThreadNew', ({ }) => {
    console.log("receiveThreadNew")
    displayHomeUnread()
});

socket.on('updateUnread', () => {
    displayHomeUnread()
});

socket.on('receiveMessage', ({ }) => {
    displayHomeUnread()
});

socket.on('receiveContentNew', ({ type, item }) => {
    if (item?.notifyAll && String(item.authorId) !== String(UserManager.getID())) {
        displayHomeUnread()
    }
});

socket.on('newReport', () => {
    UserReports.getReports();
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


document.addEventListener('DOMContentLoaded', function () {
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

// If markdown didnt get converted, this will
async function updateMarkdownLinks(delay) {
    // await ...
    var elements = document.querySelectorAll(".message-profile-content p");

    var lengthi = 0;
    if (elements.length <= 50) {
        lengthi = elements.length;
    }
    else {
        lengthi = 50;
    }

    for (var i = elements.length; i > (elements.length - lengthi); i--) {

        if (elements[i] != null) {
            if (elements[i].className.includes("hljs")) {
                return;
            }

            try {

                if (elements[i] != null && elements[i].innerText.length > 0) {


                    var marked = await markdown(elements[i].innerText, elements[i].id);

                    if (marked.message != null && marked != elements[i].innerText) {

                        if (bypassCounter[elements[i].id] == null) {
                            bypassCounter[elements[i].id] = 0;
                        }
                        else {

                            if (bypassCounter[elements[i].id] >= 1) {
                                bypassElement[elements[i].id] = 1;
                            }
                            bypassCounter[elements[i].id]++;
                        }

                        if (bypassElement[elements[i].id] == null) {
                            elements[i].innerHTML = sanitizeHtmlForRender(marked.message);
                            setTimeout(() => scrollDown(), 10)
                        }
                    }
                }
            }
            catch (err) {
                console.log(err)
            }
        }
    }



    setTimeout(() => updateMarkdownLinks(delay), delay)
}
updateMarkdownLinks(2000)// If markdown didnt get converted, this will

function escapeHtml(text) {

    if (text == null || text.length <= 0) {
        return text;
    }

    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}


async function checkMediaTypeAsync(url) {

    return new Promise((resolve, reject) => {

        if (!isURL(url)) {
            resolve("unkown");
        }

        socket.emit("checkMediaUrlCache", { id: UserManager.getID(), token: UserManager.getToken(), url: url }, function (response) {

            if (response.isCached == true) {
                // return cached media type
                resolve(response.mediaType);
            }
            else {
                // url wasnt cached
                let xhr = new XMLHttpRequest();
                xhr.open('HEAD', url, false); // false makes the request synchronous
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
                    }
                    else {
                        if (xhr.status == 404)
                            return;

                        throw new Error(`HTTP error! status: ${xhr.status}`);
                    }
                }
                catch (error) {
                    console.error('Error checking media type:', error);
                    reject('error');
                }
            }

        });

    });
}

const playedVideos = [];
function handleVideoClick(videoElement) {
    const videoId = videoElement.getAttribute("data-id");

    // Check if video is in playedVideos array
    if (!playedVideos.includes(videoId)) {
        // If not yet played, reset to start and play
        videoElement.currentTime = 0;
        playedVideos.push(videoId)
    }
}

/* Debug Stuff  */
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


    try {

        // Check if if we even have a url
        let mediaType;
        if (isURL(msg)) {
            mediaType = await checkMediaTypeAsync(msg);
        }
        else {
            // Markdown Text formatting
            if (!isURL(msg) && mediaType != "video" && mediaType != "audio" && mediaType != "image" && msg.length != 0) {
                return {isMarkdown: false, message: msg};
            }
        }

        const msgUrls = getUrlFromText(msg);

        for (const url of msgUrls) {
            if (isURL(url)) {

                if (mediaType == "audio") {
                    msg = msg.replace(url, createAudioPlayerHTML(url)).replaceAll("\n", "");
                    return {isMarkdown: true, message: msg}

                } else if (mediaType == "image") {
                    msg = msg.replace(url, `<div class="image-embed-container">
                                                <img class="image-embed" id="msg-${msgid.replace("msg-", "")}" alt="${url}" src="${url}" onerror="this.src = '/img/error.png';" >
                                            </div>`);
                    return {isMarkdown: true, message: msg}

                } else if (mediaType == "video") {
                    msg = msg.replace(url, `<video data-id="${url}" preload="auto" onloadedmetadata="this.currentTime = 5" onclick="handleVideoClick(this)" style="background-color: black;" max-width="600" height="355" class="video-embed" controls onloadedmetadata="this.currentTime = 5" onclick="if (this.paused) { this.currentTime = 0; this.play(); } else { this.pause(); }">>
                                                <source src="${url}">
                                            </video></div>`);
                    return {isMarkdown: true, message: msg}

                } else {
                    if (url.toLowerCase().includes("youtube") || url.toLowerCase().includes("youtu.be")) {
                        msg = msg.replace(url, createYouTubeEmbed(url, msgid));
                        return {isMarkdown: true, message: msg}

                    } else {
                        msg = msg.replace(url, `<a href="${url}" target="_blank">${url}</a>`);
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


ChatManager.checkConnection(2000)



















function limitString(text, limit) {
    if (text.length <= limit) return text.substring(0, limit);
    else return text.substring(0, limit) + "...";
}

function stopRecording() {
    socket.emit("leftVC", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken() });
    //leaveRoom(UserManager.getRoom());
}

socket.on('userJoinedVC', (member) => {
    //addVCMember(member);
});

function addVCMember(member) {
    const grid = document.getElementById("vc-user-grid");
    if (!grid || document.getElementById("vc-user-container-" + member.id)) return;

    const memberName = member.name.length > 15 ? member.name.substr(0, 15) + "..." : member.name;

    const userCardHTML = `
        <div class="vc-user-card" id="vc-user-container-${member.id}"
            style="background-color:rgb(66, 68, 73); border-radius: 10px; padding: 16px;
                   display: flex; flex-direction: column; align-items: center;
                   width: 180px; text-align: center; color: white;">

            <img src="${member.icon}" onerror="this.src='/img/default_pfp.png';"
                alt="${member.name}" style="width: 80px; height: 80px; border-radius: 50%;
                object-fit: cover; margin-bottom: 10px;">

            <h1 style="font-size: 16px; margin: 0;">${memberName}</h1>

            ${member.id == UserManager.getID() ?
            `<div style="margin-top: 20px;">
                    <button style="margin-bottom: 6px" id="screenShareBtn" onclick="toggleScreenShare()">Start Screen Share</button>
                    <button onclick="toggleMute()" id="muteBtn" style="margin-left: 10px;">Mute</button>
                </div>` : ``
        }
        </div>
    `;

    grid.insertAdjacentHTML("beforeend", userCardHTML);
}


function removeVCUser(member) {
    var userContentCheck = document.getElementById(`vc-user-container-${member.id}`);
    if (userContentCheck != null) userContentCheck.remove();
}

// When Receiving audio data
socket.on('userLeftVC', (member) => {
    removeVCUser(member)
});





function mentionUser(id) {
    messageInputBox.textContent += `<@${id}>`;
    messageInputBox.focus();
}

function getMemberProfile(id, x, y, event = null) {

    if (x == null && y == null) {
        x = event.clientX;
        y = event.clientY;
    }

    //console.log("Requesting profile")
    socket.emit("getMemberProfile", { id: UserManager.getID(), token: UserManager.getToken(), target: id, posX: x, posY: y });
}


function redeemKey() {
    var key = prompt("Enter the key you want to redeem");

    if (key == null || key.length <= 0) {
        return;
    }
    else {
        socket.emit("redeemKey", { id: UserManager.getID(), key: key, token: UserManager.getToken() });
    }
}

function openNewTab(url) {
    window.open(url, '_blank');
}

function getMessageId(element) {

    if (element.className != "message-profile-content-message-appended") {
        var entireElement = null;
        element = element.closest(".message-container");
        return element.id;
    }
    else {
        return element.id;
    }


}



function userJoined(onboardingFlag = false, passwordFlag = null, loginNameFlag = null) {
    if (UserManager.getUsername() != null) {
        var username = UserManager.getUsername();

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
            loginName: loginNameFlag
        }, function (response) {

            // if we finished onboarding
            if (!response.error && response.finishedOnboarding == true) {
                socket.emit("setRoom", { id: UserManager.getID(), room: UserManager.getRoom(), token: UserManager.getToken() });
                socket.emit("getGroupBanner", { id: UserManager.getID(), token: UserManager.getToken(), username: UserManager.getUsername(), icon: UserManager.getPFP(), group: UserManager.getGroup() });
                socket.emit("getGroupList", { id: UserManager.getID(), group: UserManager.getGroup(), token: UserManager.getToken(), username: UserManager.getUsername(), icon: UserManager.getPFP() });
                getMemberList()
                getChannelTree()
                socket.emit("getCurrentChannel", { id: UserManager.getID(), token: UserManager.getToken(), username: UserManager.getUsername(), icon: UserManager.getPFP(), group: UserManager.getGroup(), category: UserManager.getCategory(), channel: UserManager.getChannel() });
                socket.emit("setRoom", { id: UserManager.getID(), room: UserManager.getRoom(), token: UserManager.getToken() });

                getServerInfo();

                getChatlog();
            }
            else {
                if (response.error) {
                    showSystemMessage({
                        title: response.title || "",
                        text: response.msg || "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: response.displayTime || 3000
                    });
                }
            }

        });
    }
}

function setTyping() {
    socket.emit("isTyping", { id: UserManager.getID(), token: UserManager.getToken(), room: UserManager.getRoom() });

    clearTimeout(typetimeout);
    typetimeout = setTimeout(() => {

        socket.emit("stoppedTyping", { id: UserManager.getID(), token: UserManager.getToken(), room: UserManager.getRoom() });

    }, 2 * 1000);
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

function getChatlog(index = -1) {
    socket.emit("getChatlog", { id: UserManager.getID(), token: UserManager.getToken(), groupId: UserManager.getGroup(), categoryId: UserManager.getCategory(), channelId: UserManager.getChannel(), startIndex: index }, (response) => {
        if(response?.error == "denied") document.getElementById("content").innerHTML = ""; // fuck em
    });
}

function createYouTubeEmbed(url, messageid) {

    var videocode = url.replace("https://www.youtube.com/watch?v=", "").replaceAll(" ", "");
    if (url.toLowerCase().includes("youtube")) {
        videocode = url.replace("https://www.youtube.com/watch?v=", "").replaceAll(" ", "");
    }
    else if (url.toLowerCase().includes("youtu.be")) {
        videocode = url.replace("https://youtu.be/", "").replaceAll(" ", "");
    }

    var code = `<p id="msg-${messageid}"><div class="iframe-container" id="msg-${messageid}" ><iframe style="border: none;" width="560" height="315" src="https://www.youtube.com/embed/${videocode}" 
                title="YouTube video player" frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></p>`;

    /*
    console.log("Resolving YouTube URL " + url);
    console.log("Resolved: " + videocode);
    console.log("Resolved URL: " + "https://www.youtube.com/embed/" + videocode);

    */
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
    }
    else {

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
    var geturl = new RegExp(
        "(^|[ \t\r\n])((ftp|http|https|mailto|file):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
        , "g"
    );
    return text.match(geturl)
}

var isValidUrl = []
function isURL(text) {
    try {

        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol == "data:";


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


    if (event.keyCode == 37 || event.keyCode == 38 ||
        event.keyCode == 39 || event.keyCode == 40) {
        return;
    }

    if (event.keyCode == 13 && lastKey != 16) {
        socket.emit("stoppedTyping", { id: UserManager.getID(), token: UserManager.getToken(), room: UserManager.getRoom() });
    }

    if (messagebox.innerText != "") {
        setTyping();
    }

}

function switchLeftSideMenu(checkChannelLink = false) {

    let leftSideMenuContainer = document.getElementById("mobile_GroupAndChannelContainer")

    if (leftSideMenuContainer.style.display == "block") {

        if (UserManager.getCategory() != null && UserManager.getChannel() != null && checkChannelLink == true)
            leftSideMenuContainer.style.display = "none";
        else if (checkChannelLink == false)
            leftSideMenuContainer.style.display = "none";
    }
    else {
        leftSideMenuContainer.style.display = "block";
    }
}


function switchRightSideMenu() {

    let rightMenuContainer = document.getElementById("mobile_memberlist")

    if (rightMenuContainer.style.display == "block") {
        rightMenuContainer.style.display = "none";
    }
    else {
        rightMenuContainer.style.display = "block";
        rightMenuContainer.style.transform = `translateX(-${rightMenuContainer.offsetWidth}px)`
    }
}


function sendMessageToServer(authorId, authorUsername, pfp, message) {

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

    // important
    if (editMessageId != null)
        editMessageId = editMessageId.replaceAll("msg-", "")

    //message = message.replaceAll("<p><br></p>", "");
    socket.emit("messageSend", {
        id: authorId, name: authorUsername, icon: pfp, token: UserManager.getToken(),
        message: message, group: UserManager.getGroup(), category: UserManager.getCategory(),
        channel: UserManager.getChannel(), room: UserManager.getRoom(), editedMsgId: editMessageId
    });

    editMessageId = null;
    cancelMessageEdit();
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
        }
        else {
            mention.style.backgroundColor = "transparent";
        }

    })
}

var audio = new Audio();
function playSound(sound, volume = 0.1) {
    audio.src = `/sounds/${sound}.mp3`;
    audio.volume = volume;
    audio.play();
}

function convertMention(text, playSoundOnMention = false, showMsg = false) {

    try {
        var doc = new DOMParser().parseFromString(text.message, "text/html").querySelector("label")
        var userId = UserManager.getID();


        if (doc.id.replace("mention-", "") == (userId)) {

            if (showMsg == true) {

                showSystemMessage({
                    title: text.name,
                    text: text.message,
                    icon: text.icon,
                    img: null,
                    type: "neutral",
                    duration: 6000,
                    onClick: () => {
                        closeSystemMessage();
                    }
                });
            }

            if (playSoundOnMention == true) {
                playSound("message", 0.5);
            }
        }

    }
    catch (exe) {
        //console.log(exe)
    }
}

socket.on('doAccountOnboarding', async function (message) {
    UserManager.doAccountOnboarding()
});


socket.on('messageEdited', async function (message) {
    let markdownResult = await markdown(message.message, message.messageId);
    if(!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
    if(markdownResult.isMarkdown) message.message = markdownResult.message;

    console.log(markdownResult)

    let editElement = document.querySelector(`div.message-profile-content-message#msg-${message.messageId}`);
    if (editElement.tagName.toLowerCase() != "div") {
        editElement = document.querySelector(`div.message-profile-content-message#msg-${message.messageId}`).parentnode;
    }

    editElement.innerHTML = message.message;

    // example html element: <pre class="editedMsg">Last Edited: 24.7.2024, 20:15:24</pre>
    if (editElement.outerHTML.includes('<pre class="editedMsg">') || editElement.parentNode.outerHTML.includes('<pre class="editedMsg">')) {

        let firstSearch = editElement.querySelector("pre.editedMsg");
        let secondSearch = editElement.parentNode.querySelector("pre.editedMsg");

        if (firstSearch != null) {
            firstSearch.innerHTML = `Last Edited: ${new Date(message.lastEdited).toLocaleString("narrow")}`;
        }
        else if (secondSearch != null) {
            secondSearch.innerHTML = `Last Edited: ${new Date(message.lastEdited).toLocaleString("narrow")}`;
        }
    }
    else {
        editElement.innerHTML = message.message;
        editElement.outerHTML += `<pre class="editedMsg">Last Edited: ${new Date(message.lastEdited).toLocaleString("narrow")}</pre>`;
    }
});


socket.on('messageCreate', async function (message) {
    message.message = await text2Emoji(message.message);

    let markdownResult = await markdown(message.message, message.messageId);
    if(!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
    if(markdownResult.isMarkdown) message.message = markdownResult.message;

    let lastEditedCode = `<pre class="editedMsg">Last Edited: ${new Date(message.lastEdited).toLocaleString("narrow")}</pre>`;

    if (message.lastEdited == null)
        lastEditedCode = "";

    // this means we just created a message
    if (message.id == UserManager.getID()) {
        CookieManager.setCookie(`message-marker_${UserManager.getChannel()}`, parseInt(CookieManager.getCookie(`message-marker_${UserManager.getChannel()}`)) + 1)
    }

    var messagecode = `<div class="message-container" id="${message.messageId}">
            <div class="message-profile-img-container">
                <img class="message-profile-img" src="${message.icon}"  id="${message.id}" onerror="this.src = '/img/default_pfp.png';">
            </div>

            <div class="message-profile-info" id="${message.id}">
                <label class="message-profile-info-name"  id="${message.id}" style="color: ${message.color};">${message.name}</label>
                <label class="timestamp" id="${message.timestamp}">${new Date(message.timestamp).toLocaleString("narrow")}</label>
        </div>
            <div class="message-profile-content" id="${message.timestamp}">
                <div class="message-profile-content-message" style="display: block !important; float: left !important;" id="msg-${message.messageId}">
                    ${message.message.replaceAll("\n", "<br>")}
                </div>
                ${lastEditedCode}
            </div>
        </div>`;

    var childDivs = document.getElementById("content").lastElementChild;

    if (childDivs != null) {

        // Get Elements
        const messagecontent = childDivs.getElementsByClassName("message-profile-content");
        const userid = childDivs.getElementsByClassName("message-profile-info");

        const messageDivs = Array.prototype.filter.call(
            messagecontent,
            (messagecontent) => messagecontent.nodeName === "DIV"
        );

        const authorDivs = Array.prototype.filter.call(
            userid,
            (userid) => userid.nodeName === "DIV"
        );

        if (messagecontent[0] == null) {
            addToChatLog(chatlog, messagecode);
            return;
        }

        // Calculate time passed
        var lastMessage = messagecontent[0].parentNode.querySelector("label.timestamp").id / 1000;

        var today = new Date().getTime() / 1000;
        var diff = today - lastMessage;
        var minutesPassed = Math.round(diff / 60);
        if (authorDivs[0].id == message.id && minutesPassed < 5) {

            let convertedEmojiText = await text2Emoji(message.message);
            messagecontent[0].insertAdjacentHTML("beforeend",
                `<div class="message-profile-content-message" style="display: block !important;" id="msg-${message.messageId}">${convertedEmojiText ? convertedEmojiText.replaceAll("\n", "<br>") : convertedEmojiText}</div>
                ${lastEditedCode}`
                //`<p class="message-profile-content-message-appended" id="msg-${message.messageId}">${message.message}</p>`
            );
        }
        else {
            addToChatLog(chatlog, messagecode);
        }
    }
    else {
        addToChatLog(chatlog, messagecode);
    }

    convertMention(message, true, true)
    resolveMentions();
    scrollDown();
});

function addToChatLog(element, text) {
    //text = markdown(text, null);
    element.insertAdjacentHTML('beforeend', text);
    scrollDown();
}


function getLastMessage(time = false) {
    var childDivs = document.getElementById("content").lastElementChild;

    if (childDivs != null) {


        // Get Elements
        var messagecontent = childDivs.getElementsByClassName("message-profile-content");
        var userid = childDivs.getElementsByClassName("message-profile-info");


        var messageDivs = Array.prototype.filter.call(
            messagecontent,
            (messagecontent) => messagecontent.nodeName === "DIV"
        );

        const authorDivs = Array.prototype.filter.call(
            userid,
            (userid) => userid.nodeName === "DIV"
        );

        if (messagecontent[0] == null) {
            return;
        }

        // Calculate time passed
        var lastMessage = messagecontent[0].parentNode.querySelector("label.timestamp").id / 1000;

        var today = new Date().getTime() / 1000;
        var diff = today - lastMessage;
        var minutesPassed = Math.round(diff / 60);

        if (time == true) {
            return lastMessage * 1000;
        }
        else {
            return messagecontent[0];
        }
    }
}


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
    var message = '<div class="systemAnnouncementChat">' +
        '            <p>User <label class="systemAnnouncementChatUsername" id="">' + author.username + '</label> joined the chat!</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();
});

socket.on('updateGroupList', function (author) {

    getGroupList();
});

let editMessageId = null;

function cancelMessageEdit() {

    editor.innerHTML = "<p><br></p>";
    editMessageId = null;
    let editHint = editorToolbar.querySelector("#editMsgHint");
    if (editHint) editHint.remove();

    // sneaky bug fix
    allowEditorBlur = true;
    editor.focus();
    editor.blur();
    allowEditorBlur = false;
}


function editMessage(id) {

    if (editMessageId == null && editorToolbar.querySelector("pre.editMsgHint") == null)
        editorToolbar.insertAdjacentHTML("afterbegin", `<p id="editMsgHint" onclick='cancelMessageEdit()'>You are editing a message</p>`)

    // sneaky bug fix
    editor.focus();
    editor.blur();

    let msgContent = null;

    // It is what it is.
    try {
        msgContent = document.querySelector(`div .message-profile-content-message #${id}`).parentNode.cloneNode(true);
    } catch { msgContent = document.querySelector(`div .message-profile-content-message #${id}`).cloneNode(true); }


    // try to find emojis and remove the big classname
    let emojis = msgContent.querySelectorAll(`.inline-text-emoji.big`);

    if (emojis != null) {
        for (let i = 0; i < emojis.length; i++) {
            // Set reference
            let emoji = emojis[i];

            // Clone emoji
            let clonedEmoji = emoji.cloneNode(true);
            clonedEmoji.classList.remove("big");

            // replace emoji
            emoji.parentNode.replaceChild(clonedEmoji, emoji);
        }
    }

    window.quill.root.innerHTML = msgContent.innerHTML;
    editMessageId = msgContent.id;

    setTimeout(() => {
        const regex = /<p>\s*<\/p>/gm;
        window.quill.root.innerHTML = window.quill.root.innerHTML.replace(regex, '');

    }, 10);

    editor.focus();
}

const Delta = Quill.import('delta');

hljs.configure({
    languages: ['javascript', 'python', 'ruby', 'xml', 'json', 'css']
});


window.quill = new Quill('#editor', {
    modules: {
        syntax: true,
        toolbar: {
            container: '#editor-toolbar',
            handlers: {
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
        }
    },
    theme: 'snow'
});

// Add a matcher specifically for image elements
quill.clipboard.addMatcher('img', function (node, delta) {
    // Insert a newline before the image content
    return new Delta().insert('\n').concat(delta);
});


quill.clipboard.addMatcher('PRE', function (node, delta) {
    return delta.compose(new Delta().retain(delta.length(), { 'code-block': true }));
});

quill.clipboard.addMatcher(Node.TEXT_NODE, function (node, delta) {
    if (node.parentNode && node.parentNode.tagName === 'PRE') {
        return delta.compose(new Delta().retain(delta.length(), { 'code-block': true }));
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

// Debounce function to limit the rate of calling adjustEditorHeight
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const adjustEditorHeight = debounce(() => {
    const editorContentHeight = editor.scrollHeight;
    const toolbarHeightDiff = editorToolbar.offsetHeight - initialToolbarHeight;

    if (editorContentHeight >= initialHeight) {
        const newHeight = Math.min(editorContentHeight, maxHeight);
        editorContainer.style.height = newHeight + 'px';
        editorContainer.style.transform = `translateY(-${(newHeight - (40 - toolbarHeightDiff))}px)`;
        quillContainer.style.height = newHeight + 'px';
    } else {
        resetEditorHeight();
    }
}, 100); // Adjust the wait time as needed

function resetEditorHeight() {
    editorContainer.style.height = initialHeight + 'px';
    editorContainer.style.marginTop = initialMargin + 'px';
    editorContainer.style.transform = 'translateY(0)';
    quillContainer.style.height = initialHeight + 'px';
}

// Using ResizeObserver for more efficient content height observation
const resizeObserver = new ResizeObserver(adjustEditorHeight);
resizeObserver.observe(editor);

// Handle keydown events to expand and reset the editor
editor.addEventListener('keydown', function (event) {

    setTyping();

    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();


        let msgContent = quill.root.innerHTML
        //    .replace(/<p><br><\/p>/g, "")
            .replace(/<p\s+id="msg-\d+">\s*<br\s*\/?>\s*<\/p>/g, ""); // Clean up empty lines

        sendMessageToServer(UserManager.getID(), UserManager.getUsername(), UserManager.getPFP(), msgContent);

        // Reset the editor content and height after a slight delay
        setTimeout(resetEditorHeight, 0);
    } else if (event.key === 'Enter' && event.shiftKey) {
        setTimeout(adjustEditorHeight, 10); // Adjust height on Shift+Enter
    }
});

// Adjust height on focus
editor.addEventListener('focus', adjustEditorHeight);

// Reset the editor height on blur
editor.addEventListener('blur', function () {
    if (allowEditorBlur) resetEditorHeight();
});

// Blur handling for mouse events outside the editor
document.addEventListener('mousedown', (event) => {
    allowEditorBlur = !editorContainer.contains(event.target);
});

/* Quill Size End */

/* Quill Emoji Autocomplete */
initializeEmojiAutocomplete(document.querySelector('.ql-editor'), quill);
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
        id: UserManager.getID(), token: UserManager.getToken(), messageId: id.replace("msg-", ""),
        group: UserManager.getGroup(), category: UserManager.getCategory(), channel: UserManager.getChannel()
    });
}

socket.on('receiveDeleteMessage', function (id) {

    try {
        var message = document.querySelectorAll(`div .message-profile-content #msg-${id}`);
        if (message == null)
            message = document.querySelectorAll(`div .message-profile-content-message #msg-${id}`);

        var parentContainer = message[0].parentNode.parentNode;
        var parent = message[0].parentNode;

        message.forEach(msg => {
            msg.remove();
        });

        if (parentContainer.querySelector(".message-profile-content-message") == null) {
            parentContainer.remove();
        }
    }
    catch (err) {
        console.log(err)
    }


});

socket.on('memberTyping', function (members) {

    var runner = 0;
    var displayUsersText = "";

    if (members.length <= 0) {
        typingIndicator.innerText = "";
        typingIndicator.style.display = "none";
        return;
    }

    if (members.length == 1) {
        displayUsersText += limitString(members[0], 15) + " is typing...";
    }
    else if (members.length == 2) {
        displayUsersText += limitString(members[0], 15) + " and " + limitString(members[1], 15) + " are typing...";
    }
    else {
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
    typingIndicator.style.display = "block";
});



socket.on('receiveChannelTree', function (data) {
    getChannelTree()
});


socket.on('updateChatlog', async function (data) {
    getChatlog();
});

socket.on('receiveChatlog', async function (data) {
    if (data == null) {
        console.log("Data was null history");
        return;
    }
    var previousMessageID = 0;

    for (let message of data) {
        try {

            let lastEditCode = `<pre alt='receiveChatlog' class="editedMsg">Last Edited: ${new Date(message.lastEdited).toLocaleString("narrow")}</pre>`;
            if (message.lastEdited == null)
                lastEditCode = ``

            if (compareTimestamps(message.timestamp, getLastMessage(true)) <= 5 && previousMessageID == message.id) {
                let markdownResult = await markdown(message.message, message.messageId);
                if(!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
                if(markdownResult.isMarkdown) message.message = markdownResult.message;

                getLastMessage().insertAdjacentHTML("beforeend", `<div class='message-profile-content-message' style="display: block !important; float: left !important;" id="msg-${message.messageId}">${await text2Emoji(message.message)}</div>${lastEditCode}`);
                previousMessageID = message.id;
            } else {
                let markdownResult = await markdown(message.message, message.messageId);
                if(!markdownResult.isMarkdown) message.message = message.message.replaceAll("\n", "<br>")
                if(markdownResult.isMarkdown) message.message = markdownResult.message;

                await showMessageInChat(message);
                previousMessageID = message.id;
            }
        } catch (error) {
            console.error(`Error processing message with ID ${message.messageId}:`, error);
        }
    }

    if (data.length == 0 && UserManager.getChannel() && !document.getElementById("screenshareList")) {
        document.getElementById("content").insertAdjacentHTML("beforeend", `<div class='message-profile-content-message' style="text-align: center; color: gray; font-style: italic;display: block !important; float: left !important;" id="msg-0">No messages yet... be the first one!</div>`);
    }


    // mark channel as read
    markChannel(UserManager.getChannel(), true)

    scrollDown();
    resolveMentions();
});

function markCurrentChannelStyle(channelId) {
    let channels = document.querySelectorAll("#channellist a");

    channels.forEach(channel => {
        if (channel.classList.contains("selected")) {
            channel.classList.remove("selected")
        }
    });

    let targetChannel = document.querySelector("#channellist li#channel-" + channelId);
    if (targetChannel) targetChannel.classList.add("selected");

}

function markChannel(channelId, read = false, msgCount = null) {
    setTimeout(() => {
        const idStr = String(channelId);
        if (String(UserManager.getChannel()) === idStr) read = true;

        const el = getChannelObjectFromTree(idStr);

        const channelType = el?.getAttribute?.("channelType");
        if (channelType === "voice") {
            el?.classList?.remove("markChannelMessage");
            return;
        }

        let count = Number.isFinite(msgCount) ? Number(msgCount) : NaN;
        if (!Number.isFinite(count) && el) {
            const cls = Array.from(el.classList || []).find(c => c.startsWith("msgCount_"));
            if (cls) {
                const maybe = parseInt(cls.split("_")[1], 10);
                if (Number.isFinite(maybe)) count = maybe;
            }
        }

        const cookieKey = `message-marker_${idStr}`;
        const saved = parseInt(CookieManager.getCookie(cookieKey), 10) || 0;

        if (read) {
            if (Number.isFinite(count) && saved < count) {
                CookieManager.setCookie(cookieKey, count);
            }
            el?.classList?.remove("markChannelMessage");
            return;
        }

        if (Number.isFinite(count)) {
            if (count > saved) {
                CookieManager.setCookie(cookieKey, count);
                el?.classList?.add("markChannelMessage");
            } else {
                el?.classList?.remove("markChannelMessage");
            }
        }
    }, 200)
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
    scrollDown();
});

socket.on('createMessageLink', function (data) {
    document.querySelector("#msg-" + data.messageId).innerHTML = data.code;
    scrollDown();
});

socket.on('receiveCurrentChannel', function (channel) {
    try {
        if (channel.name == null) {
            channel.name = "";
        }
        setChannelName(channel.name);
        markCurrentChannelStyle(channel.id);
    }
    catch {
        setChannelName(" ");
        markCurrentChannelStyle(null);
    }
});

socket.on('receiveMemberProfile', function (data) {
    console.log("Received member profile");
    data.top = parseInt(data.top);
    data.left = parseInt(data.left);

    var profileContent = document.getElementById("profile_container");
    profileContent.innerHTML = data.code;

    profileContent.style.display = "block";
    profileContent.style.position = "fixed";
    profileContent.style.zIndex = "10000";

    var winWidth = window.innerWidth;
    var winHeight = window.innerHeight;

    // Make sure we force a reflow so offsetWidth/offsetHeight are correct
    profileContent.offsetWidth;

    // Calculate safe position
    let top = data.top;
    let left = data.left;

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


socket.on('updateMemberList', function (data) {
    getMemberList();
});

socket.on('updateGroupList', function (data) {
    getGroupList();
});

socket.on('receiveGroupList', function (data) {
    serverlist.innerHTML = "";
    serverlist.innerHTML = data;

    let mobileGroupList = document.getElementById("mobile_GroupList");
    mobileGroupList.innerHTML = data;
    setActiveGroup(UserManager.getGroup())

    reapplyUnreadFromCookies();
    displayHomeUnread();
});


socket.on('newMemberJoined', function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' +
        '            <p><label class="systemAnnouncementChatUsername">' + author.name + '</label> joined the server! <label class="timestamp" id="' + author.timestamp + '">' + author.timestamp.toLocaleString("narrow") + '</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();

});

socket.on('memberOnline', function (member) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' +
        '            <p><label class="systemAnnouncementChatUsername">' + member.username + '</label> is now online!</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();
});

socket.on('memberPresent', function (member) {
});

socket.on('receiveGifImage', function (response) {


    document.getElementById("emoji-entry-container").insertAdjacentHTML("beforeend",
        `<img 
                    onclick="sendGif('${response.gif}')" src="${response.preview}"
                    onmouseover="changeGIFSrc('${response.gif}', this);"
                    onmouseleave="changeGIFSrc('${response.preview}', this);"
                    style="padding: 1%;border-radius: 20px;float: left;width: 48%; height: fit-content;">`
    );
});


socket.on('receiveToken', function (data) {
    CookieManager.setCookie("token", data, 365);
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
        CookieManager.setCookie("token", data.token, 365);
        CookieManager.setCookie("loginName", data.loginName, 365);
    }
    else if (data.token != null && data.action == "login") {
        CookieManager.setCookie("token", data.token, 365);
        CookieManager.setCookie("id", data.id, 365);

        setPFP(data.icon);
        setBanner(data.banner);
        setAboutme(data.aboutme);
        setStatus(data.status);
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

    socket.emit("getAllUnread",
        { id: UserManager.getID(), token: UserManager.getToken() },
        function (response) {
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
        }
    );
}

document.getElementById("message-actions-image").onclick = function (e) {
    var x = e.clientX;
    var y = e.clientY;

    var emojiBox = document.getElementById("emoji-box-container");

    var clickedElement = document.elementFromPoint(x, y)

    if (clickedElement.id != "message-actions-image") {
        return;
    }

    if (emojiBox.style.display == "block") {
        closeEmojiBox();
    }
    else {
        emojiBox.style.display = "block";
        selectEmojiTab(document.getElementById("emoji-box-emojis"))
        getEmojis()

        var test = document.getElementById("message-actions-image");

        emojiBox.style.position = "fixed";
        emojiBox.style.float = "right";
        emojiBox.style.top = (y - emojiBox.offsetHeight - 40) + "px";
        emojiBox.style.left = x - emojiBox.offsetWidth + "px";
    }
}

window.addEventListener('resize', function (event) {
    // do stuff here

    var emojiContainer = document.getElementById("emoji-box-container");
    var profileContainer = document.getElementById("profile_container");

    if (emojiContainer.style.display == "block") {
        //emojiContainer.style.display = "none";
        closeEmojiBox()
    }
    if (profileContainer.style.display == "block") {
        profileContainer.style.display = "none";
    }
});

document.addEventListener("keydown", (event) => {
    var emojiContainer = document.getElementById("emoji-box-container");
    var profileContainer = document.getElementById("profile_container");

    if (event.key == "Escape") {
        if (emojiContainer.style.display == "block") {
            //emojiContainer.style.display = "none";
            closeEmojiBox();
        }
        if (profileContainer.style.display == "block") {
            profileContainer.style.display = "none";
        }
    }


});

var gifSearchbarInput = document.getElementById("gif-searchbar-input");
// Execute a function when the user presses a key on the keyboard
gifSearchbarInput.addEventListener("keypress", function (event) {
    // If the user presses the "Enter" key on the keyboard

    if (event.key === "Enter") {

        var emojiEntryContainer = document.getElementById("emoji-entry-container");
        emojiEntryContainer.innerHTML = "";

        // socket.emit

        socket.emit("searchTenorGif", { id: UserManager.getID(), token: UserManager.getToken(), search: gifSearchbarInput.value }, function (response) {

            if (response.type == "success") {
                console.log("Tenor Response");
                console.log(response)
            }
            else {
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

        //searchTenor(gifSearchbarInput.value);
    }
});

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

    var gifSearchbarInput = document.getElementById("gif-searchbar-input");
    gifSearchbarInput.value = "";

    var emojiEntryContainer = document.getElementById("emoji-entry-container");
    emojiEntryContainer.innerHTML = "";

    var emojiTab = document.getElementById("emoji-box-emojis");
    var gifTab = document.getElementById("emoji-box-gifs");

    try {
        emojiTab.classList.add("SelectedTab");
        gifTab.classList.remove("SelectedTab");
    }
    catch (e) { console.log(e) }
}


function changeGIFSrc(url, element) {
    element.src = url;
}

function getGifs() {

    var emojiContainer = document.getElementById("emoji-box-container");
    var emojiEntryContainer = document.getElementById("emoji-entry-container");
    var gifSearchbar = document.getElementById("gif-searchbar");
    var gifSearchbarInput = document.getElementById("gif-searchbar-input");

    gifSearchbar.style.display = "block";
    gifSearchbarInput.style.display = "block";
    emojiEntryContainer.style.height = "calc(100% - 18% - 8.1%)";
    emojiEntryContainer.innerHTML = "";
    gifSearchbarInput.focus();

}

function getEmojis() {
    var emojiContainer = document.getElementById("emoji-box-container");
    var emojiEntryContainer = document.getElementById("emoji-entry-container");

    gifSearchbarInput.style.display = "none";

    socket.emit("getEmojis", { id: UserManager.getID(), token: UserManager.getToken() }, function (response) {

        if (response.type == "success") {
            //settings_icon.value = response.msg;
            //emojiContainer.innerHTML = "<div id='emoji-box-header'><h2>Emojis</h2></div>";



            emojiEntryContainer.innerHTML = "";
            response.data.forEach(emoji => {

                var emojiId = emoji.split("_")[1];
                var emojiName = emoji.split("_")[2].split(".")[0];


                var code = `
                    <div class="emoji-entry" title="${emojiName}" onclick="
                            document.querySelector('.ql-editor').textContent += ' :${emojiId}: ';
                            document.getElementById('emoji-box-container').style.display = 'none';
                            ">
                        <div class="emoji-img">
                            <img class="emoji" src="/emojis/${emoji}">
                        </div>
                    </div>`


                emojiEntryContainer.insertAdjacentHTML("beforeend", code);
            })

            //notify(response.msg)
        }
        else {
            showSystemMessage({
                title: response.msg,
                text: "",
                icon: response.type,
                img: null,
                type: response.type,
                duration: 1000
            });
        }

        //console.log(response);
    });
}

socket.on('receiveGroupBanner', function (data) {
    groupbanner.src = data;
    document.getElementById("mobile_groupBannerDisplay").src = data;
});

function getChannelObjectFromTree(channelId) {
    const id = String(channelId);
    return (
        document.querySelector(`#channellist a#channel-${id}`) ||
        document.querySelector(`#channellist li#channel-${id}`)
    );
}


function refreshValues() {
    var username = UserManager.getUsername();
    getRoles();
    userJoined();
    getServerInfo();

    socket.emit("setRoom", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken() });
    getGroupList();
    getMemberList();
    getChannelTree();
    socket.emit("getCurrentChannel", { id: UserManager.getID(), username: username, icon: UserManager.getPFP(), group: UserManager.getGroup(), category: UserManager.getCategory(), channel: UserManager.getChannel(), token: UserManager.getToken() });
}

function getMemberList() {
    socket.emit("getMemberList", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), token: UserManager.getToken(), channel: UserManager.getChannel(), group: UserManager.getGroup() }, function (response) {

        if (response.error) {
            showSystemMessage({
                title: response.msg,
                text: "",
                icon: response.type,
                img: null,
                type: response.type,
                duration: 1000
            });
        }
        else {
            memberlist.innerHTML = response.data;
            document.getElementById("mobile_memberlist").innerHTML = response.data;
        }

    });
}

function getGroupList() {
    socket.emit("getGroupList", { id: UserManager.getID(), group: UserManager.getGroup(), username: UserManager.getUsername(), icon: UserManager.getPFP(), token: UserManager.getToken() });
    getGroupBanner();
}

function getGroupBanner() {
    socket.emit("getGroupBanner", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), group: UserManager.getGroup(), token: UserManager.getToken() });
}

var serverName;
var serverDesc;
function getServerInfo(returnData = false) {
    socket.emit("getServerInfo", { id: UserManager.getID(), token: UserManager.getToken() }, function (response) {

        var headline = document.getElementById("header");

        servername = response.name;
        serverdesc = response.description;

        headline.innerHTML = `${servername} - ${serverdesc}
        
        <div class="headerIcon help" onclick="newUserExplainUI()"></div>
        <div class="headerIcon donators" onclick="UserManager.showDonatorList('https://shy-devil.me/app/dcts/');"></div>
        `;

    });
}



function setUrl(param, isVC = false) {

    let urlData = param.split("&")
    let groupId = urlData[0]?.replace("?group=", "")
    let categoryId = urlData[1]?.replace("category=", "")
    let channelId = urlData[2]?.replace("channel=", "")

    showHome(true)

    // channel already open, dont reload it
    if (UserManager.getChannel() == channelId && channelId && UserManager.getChannel() && isVC == false) return;

    window.history.replaceState(null, null, param); // or pushState

    if (isVC == true) {
        socket.emit("checkChannelPermission", { id: UserManager.getID(), channel: UserManager.getChannel(), token: UserManager.getToken(), permission: "useVOIP" }, function (response) {
            if (response.permission == "granted") {
                switchLeftSideMenu(true)
                //stopRecording();

                socket.emit("setRoom", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken() });
                document.getElementById("messagebox").style.visibility = "hidden";
                document.getElementById("content").innerHTML = "";
                joinVC();
            }
        });
    }
    else {
        leaveVC()
        enableScreensharing(false);

        socket.emit("checkChannelPermission", { id: UserManager.getID(), channel: UserManager.getChannel(), token: UserManager.getToken(), permission: "sendMessages" }, function (response) {
            if (response.permission == "granted") {
                switchLeftSideMenu(true)

                socket.emit("setRoom", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken() });
                chatlog.innerHTML = "";
                document.getElementById("messagebox").style.visibility = "visible";
                document.querySelector('.ql-editor').focus();
            }
            else {
                chatlog.innerHTML = "";
                document.getElementById("messagebox").style.visibility = "hidden";
            }
        });
    }


    // get group stats
    showGroupStats()

    refreshValues();
}


function showGroupStats() {
    // If we only clicked a group and no channel etc the main windows is empty.
    // lets show some nice group home / welcome screen
    if (UserManager.getGroup() !== null && UserManager.getCategory() === null && UserManager.getChannel() === null) {

        messageInputBox.parentNode.parentNode.style.visibility = "hidden";
        socket.emit("getGroupStats", { id: UserManager.getID(), token: UserManager.getToken(), group: UserManager.getGroup() }, function (response) {

            if (response.type == "success") {

                // Not enough users chatted to show group stats
                if (response.mostActiveUsers.length <= 1) return;

                contentBox = document.getElementById("content");

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



            }
            else {
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
    else {
        messageInputBox.parentNode.parentNode.style.visibility = "visible";
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
    socket.emit("RequestRoles", { id: UserManager.getID(), username: UserManager.getUsername(), pfp: UserManager.getPFP() });
}

let scrollTimeout;

function scrollDown() {
    let contentDiv = document.getElementById("content");
    contentDiv.style.visibility = "hidden";

    if (scrollTimeout) {
        clearTimeout(scrollTimeout); // Clear any existing timeout
    }

    // would jump back otherwise
    scrollTimeout = setTimeout(() => {
        var objDiv = document.getElementById("content");
        objDiv.scrollTop = objDiv.scrollHeight;
        contentDiv.style.visibility = "visible";
    }, 10);
}


// Add scroll event listener to the scroll container
/*
let scrollMessageCount = 0;
scrollContainer.addEventListener('scroll', function() {
   if (scrollContainer.scrollTop === 0) {
       
       // We reached the top of the chat, try to load more messages
   }
});
*/




var uploadObject = document.getElementById('content');

// Handle the file drop event
uploadObject.addEventListener('drop', async function (e) {
    e.preventDefault();
    uploadObject.style.backgroundColor = '';

    // dont upload in vc
    if (uploadObject.querySelector("#vc-user-grid")) return;

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
                sendMessageToServer(
                    UserManager.getID(),
                    UserManager.getUsername(),
                    UserManager.getPFP(),
                    window.location.origin + url
                ); // Sending all URLs at once


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






async function showMessageInChat(message) {

    message.message = await text2Emoji(message.message)
    //console.log(text2Emoji(message.message))

    var messagecode = "";
    if (message.isSystemMsg == true) {
        messagecode = `<div class="systemAnnouncementChat">
                            <p><label class="systemAnnouncementChatUsername" id="msg-${message.id}">${message.name}</label> joined the server! <label class="timestamp" style="color: lightgray !important;">${new Date(message.timestamp).toLocaleString("narrow")}</label></p>
                        </div>`;
    }
    else {

        let editCode = "";


        if (message.lastEdited != null) {
            console.log("Showing edit for " + message.message)
            editCode = `<pre class="editedMsg">Last Edited: ${new Date(message.lastEdited).toLocaleString("narrow")}</pre>`;
        }


        messagecode = `<div class="message-container" id="msg-${message.messageId}">
                            <div class="message-profile-img-container">
                                <img class="message-profile-img" src="${message.icon}" id="${message.id}" onerror="this.src = '/img/default_pfp.png';">
                            </div>
                
                            <div class="message-profile-info" id="${message.id}">
                                <label class="message-profile-info-name" id="${message.id}" style="color: ${message.color};">${message.name}</label>
                                <label class="timestamp" id="${message.timestamp}">${new Date(message.timestamp).toLocaleString("narrow")}</label>
                            </div>

                            <div class="message-profile-content" id="msg-${message.messageId}">
                                <div class="message-profile-content-message" style="display: block !important; float: left !important;" id="msg-${message.messageId}">
                                    ${message.message}
                                </div>
                                ${editCode}
                            </div>
                        </div>`;
    }

    addToChatLog(chatlog, messagecode);
    convertMention(message, false)
    scrollDown();
}
