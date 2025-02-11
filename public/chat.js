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

ModView.init();
UserReports.getReports();

socket.on('newReport', (member) => {
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

var solvedPow = false;

const customPrompts = new Prompt();
const tooltipSystem = new TooltipSystem();
const customAlerts = new CustomAlert();

function powLoadingScreen() {
    (function loop() {
        setTimeout(() => {
            // Your logic here

            if (solvedPow == false) {
                console.log("Trying to solve PoW...");

                loop();
            }
            else {
                alert("Reached goal")
            }

        }, 1000);
    })();
}

//socket.emit('requestPow');

socket.on('powChallenge', async ({ challenge, difficulty }) => {
    console.log('Received PoW challenge:', challenge, 'Difficulty:', difficulty);

    // Check if the solution is already stored
    const storedSolution = CookieManager.getCookie(challenge);
    if (storedSolution) {
        console.log('Using stored solution:', storedSolution);
        socket.emit('verifyPow', { challenge, solution: parseInt(storedSolution) });
    } else {
        powLoadingScreen();
        const solution = await solvePow(challenge, difficulty);
        solvedPow = true;

        CookieManager.setCookie(challenge, solution); // Store the solution in a cookie for 30 days
        socket.emit('verifyPow', { challenge, solution });
    }
});

socket.on('authSuccess', (data) => {
    console.log(data.message);
});

socket.on('authFailure', (data) => {
    console.log(data.message);
});

async function solvePow(challenge, difficulty) {
    let solution = 0;
    var currentPowLevel = 0;

    const target = Array(difficulty + 1).join('0');

    while (true) {
        const hash = await sha256(challenge + solution);
        const currentDifficulty = getCurrentDifficulty(hash, difficulty);

        if (hash.substring(0, difficulty) === target) {
            return solution;
        }
        solution++;

        if (currentDifficulty > currentPowLevel) {
            currentPowLevel = currentDifficulty;
            console.log("Current Difficulty: " + currentDifficulty)
        }
    }
}

function getCurrentDifficulty(hash, targetDifficulty) {
    let leadingZeros = 0;
    for (let char of hash) {
        if (char === '0') {
            leadingZeros++;
        } else {
            break;
        }
    }
    return Math.min(leadingZeros, targetDifficulty); // Ensure it doesn't exceed target difficulty
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

userJoined();

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

                    if (marked != null && marked != elements[i].innerText) {

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
                            elements[i].innerHTML = marked;
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
        return msg;
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
                return msg;
            }
        }

        const msgUrls = getUrlFromText(msg);

        for (const url of msgUrls) {
            if (isURL(url)) {

                if (mediaType == "audio") {
                    msg = msg.replace(url, createAudioPlayerHTML(url));
                } else if (mediaType == "image") {
                    msg = msg.replace(url, `<div class="image-embed-container">
                                                <img class="image-embed" id="msg-${msgid.replace("msg-", "")}" alt="${url}" src="${url}" onerror="this.src = '/img/error.png';" >
                                            </div>`);
                } else if (mediaType == "video") {
                    msg = msg.replace(url, `<video data-id="${url}" preload="auto" onloadedmetadata="this.currentTime = 5" onclick="handleVideoClick(this)" style="background-color: black;" max-width="600" height="355" class="video-embed" controls onloadedmetadata="this.currentTime = 5" onclick="if (this.paused) { this.currentTime = 0; this.play(); } else { this.pause(); }">>
                                                <source src="${url}">
                                            </video></div>`);
                } else {
                    if (url.toLowerCase().includes("youtube") || url.toLowerCase().includes("youtu.be")) {
                        msg = msg.replace(url, createYouTubeEmbed(url, msgid));
                    } else {
                        msg = msg.replace(url, `<a href="${url}" target="_blank">${url}</a>`);
                    }
                }
            }

        }

        return msg;
    } catch (error) {
        console.error('Error in markdown function:', error);
        return msg;
    }
}

// Check if client disconnected
var disconnected = false;
var initConnectionCheck = false;
let connectionAttempts = 0;


ChatManager.checkConnection(2000)


// VC STUFF
function joinVC() {

    joinRoom(UserManager.getRoom());

    document.getElementById("content").innerHTML = "";
    ChannelTree.getTree();
    socket.emit("getCurrentChannel", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), group: UserManager.getGroup(), category: UserManager.getCategory(), channel: UserManager.getChannel(), token: UserManager.getToken() });
    socket.emit("joinedVC", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken(), lastActivity: new Date().getTime() });
    socket.emit("getVCMembers", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken() }, function (response) {

        Object.keys(response.vcMembers).forEach(function (vcMember) {
            addVCMember(response.vcMembers[vcMember])
        })

    });
}

function limitString(text, limit) {
    if (text.length <= limit) return text.substring(0, limit);
    else return text.substring(0, limit) + "...";
}

function stopRecording() {
    socket.emit("leftVC", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken() });
    console.log('Recording stopped');

    leaveRoom(UserManager.getRoom());
}

socket.on('userJoinedVC', (member) => {
    addVCMember(member);
});

function addVCMember(member) {
    var userContentCheck = document.getElementById("vc-user-container-" + member.id);
    if (userContentCheck != null) return;

    var contentBox = document.getElementById("content")

    var memberName = member.name;
    if (memberName.length > 15) {
        memberName = member.name.substr(0, 15) + "...";
    }

    var userCode = `
        <div id="vc-user-container-${member.id}" 
            style="
                margin: 20px; 
                padding: 40px;
                text-align: center;
                border: 1px solid gray;
                background-color: #2F3136;
                border-radius: 8px;
                width: 200px;
                overflow: hidden;
                float: left;
                
        ">
            
            <img id="vc-user-icon-${member.id}" title="${member.name}" 
            onerror="this.src = '/img/default_pfp.png';" 
            src='${member.icon}' style='width: 80px; height: 80px; border-radius: 50%;object-fit: cover;background-color: transparent;background-position: center center;'>
            <h1 id="vc-user-name-${member.id}" style="font-size: 18px">${memberName}</h1>
        </div>`;

    contentBox.insertAdjacentHTML("beforeend", userCode);
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

    console.log("Requesting profile")

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
                ChannelTree.getTree();
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
    else {

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


function getChatlog(index = -1) {
    socket.emit("getChatlog", { id: UserManager.getID(), token: UserManager.getToken(), groupId: UserManager.getGroup(), categoryId: UserManager.getCategory(), channelId: UserManager.getChannel(), startIndex: index });
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

function generateMetaTags() {
    getServerInfo();

    if (UserManager.getGroup() != null && UserManager.getCategory() != null && UserManager.getChannel() != null) {
        return `<meta http-equiv="content-Type" content="text/html; utf-8" />
                <meta http-equiv="Pragma" content="cache" />
                <meta name="robots" content="INDEX,FOLLOW" />
                <meta http-equiv="content-Language" content="en" />
                <meta name="description" content="You have been invited to chat in ${UserManager.getChannel()} ! Join the discussion on ${serverName} !" />
                <meta name="keywords" content="" />
                <meta name="author" content="Default Server" />
                <meta name="publisher" content="" />
                <meta name="copyright" content="" />
                <meta name="audience" content="Alle" />
                <meta name="page-type" content="Anleitung" />
                <meta name="page-topic" content="Bauen Wohnen" />
                <meta http-equiv="Reply-to" content="" />
                <meta name="expires" content="" />
                <meta name="revisit-after" content="2 days" />
                <title>Chat in General » chat</title>`
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

    message = message.replaceAll("<p><br></p>", "");
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

function convertMention(text, playSoundOnMention = false, showMsg = false) {

    try {
        var doc = new DOMParser().parseFromString(text.message, "text/html").querySelector("label")
        var userId = UserManager.getID();


        if (doc.id.replace("mention-", "") == (userId)) {

            if (showMsg == true) {

                showSystemMessage({
                    title: text.name,
                    text: "",
                    icon: text.icon,
                    img: null,
                    type: "neutral",
                    duration: 1000
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
    message.message = await markdown(message.message, message.messageId);

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
    message.message = text2Emoji(message.message);
    message.message = await markdown(message.message, message.messageId);
    let lastEditedCode = `<pre class="editedMsg">Last Edited: ${new Date(message.lastEdited).toLocaleString("narrow")}</pre>`;

    if (message.lastEdited == null)
        lastEditedCode = "";

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
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
            messagecontent[0].insertAdjacentHTML("beforeend",
                `<div class="message-profile-content-message" style="display: block !important;" id="msg-${message.messageId}">${text2Emoji(message.message).replaceAll("\n", "<br>")}</div>
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
            .replace(/<p><br><\/p>/g, "")
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
try {
    initializeEmojiAutocomplete(document.querySelector('.ql-editor'), quill);
}
catch (err) {
    console.log(err)
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


function deleteMessageFromChat(id) {
    socket.emit("deleteMessage", {
        id: UserManager.getID(), token: UserManager.getToken(), messageId: id.replace("msg-", ""),
        group: UserManager.getGroup(), category: UserManager.getCategory(), channel: UserManager.getChannel()
    });
}

socket.on('receiveDeleteMessage', function (id) {

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

    ChannelTree.getTree();
    return;

    channeltree.innerHTML = data;
    try {
        document.querySelector("div #channeltree #channel-" + UserManager.getChannel()).style.color = "white";
        document.querySelector("div #channeltree #category-" + UserManager.getCategory()).style.color = "white";

        var markedMessage3 = [];
        markedMessage3 = CookieManager.getCookie("unmarkedMessages");
    }
    catch (Ex) {
        //console.log(Ex)
    }


});

socket.on('markChannelMessage', function (data) {

    /*
    console.log("A new message has been created");
    console.log(data);

    var group = data.group;
    var cat = data.category;
    var chan = data.channel;

    var groupMarkerElement = document.querySelector(`#group-marker-${group}`);
    groupMarkerElement.style.display = "block";

    var catElement = document.querySelector(`#category-${cat}`);
    catElement.style.color = "orange";

    var chanElement = document.querySelector(`#channel-${chan}`);
    chanElement.style.color = "orange";

    */

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
                message.message = await markdown(message.message, message.messageId);

                getLastMessage().insertAdjacentHTML("beforeend", `<div class='message-profile-content-message' style="display: block !important; float: left !important;" id="msg-${message.messageId}">${text2Emoji(message.message)}</div>${lastEditCode}`);
                previousMessageID = message.id;
            } else {
                message.message = await markdown(message.message, message.messageId);
                await showMessageInChat(message);
                previousMessageID = message.id;
            }
        } catch (error) {
            console.error(`Error processing message with ID ${message.messageId}:`, error);
        }
    }

    scrollDown();
    resolveMentions();
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
    }
    catch {
        setChannelName(" ");
    }
});

socket.on('receiveMemberProfile', function (data) {
    console.log("Received member profile")
    data.top = parseInt(data.top)
    data.left = parseInt(data.left)

    var profileContent = document.getElementById("profile_container");
    profileContent.innerHTML = data.code;

    profileContent.style.display = "block";
    profileContent.style.position = "fixed";
    profileContent.style.zIndex = "10000";

    var winWidth = window.innerWidth;
    var winHeight = window.innerHeight;

    // If is out of bounds
    if ((data.top + profileContent.offsetHeight) <= winHeight) {
        profileContent.style.top = `${data.top}px`;
    }
    else {
        if (data.top + profileContent.offsetHeight > winHeight) {
            profileContent.style.top = `${data.top - ((data.top + profileContent.offsetHeight) - winHeight) - 20}px`;
        }
        else {
            profileContent.style.top = `${data.top - (winHeight - profileContent.offsetHeight)}px`;
        }

    }

    // If X out of bounds
    if ((data.left + profileContent.offsetWidth) < winWidth) {
        profileContent.style.left = `${data.left + 20}px`;
    }
    else {
        profileContent.style.left = `${data.left - 20 - profileContent.offsetWidth}px`;
    }
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



    setActiveGroup(UserManager.getGroup());
});


socket.on('newMemberJoined', function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' +
        '            <p><label class="systemAnnouncementChatUsername">' + author.name + '</label> joined the server! <label class="timestamp" id="' + author.timestamp + '">' + author.timestamp.toLocaleString("narrow") + '</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();

    //socket.emit("getChannelTree", { id: UserManager.getID(), token: UserManager.getToken(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), group: UserManager.getGroup() });
});

socket.on('memberOnline', function (member) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' +
        '            <p><label class="systemAnnouncementChatUsername">' + member.username + '</label> is now online!</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();

    //socket.emit("getChannelTree", { id: UserManager.getID(), token: UserManager.getToken(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), group: UserManager.getGroup() });
});

socket.on('memberPresent', function (member) {
    //socket.emit("getChannelTree", { id: member.id, username: member.username, icon: member.pfp });
    //socket.emit("getChannelTree", { id: UserManager.getID(), token: UserManager.getToken(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), group: UserManager.getGroup() });
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
    }
    else if (data.token != null && data.action == "login") {
        CookieManager.setCookie("token", data.token, 365);
        CookieManager.setCookie("id", data.id, 365);

        setPFP(data.icon);
        setBanner(data.banner);
        setAboutme(data.aboutme);
        setStatus(data.status);
    }

    showSystemMessage({
        title: data.title ? data.title : data.msg,
        text: data.msg || "",
        icon: data.type || "info",
        img: null,
        type: data.type || "neutral",
        duration: data.displayTime || 4000
    });
});

function setActiveGroup(group) {
    if (group == null) {
        return;
    }
    document.getElementById(group).classList.add('selectedGroup');
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


function refreshValues() {
    var username = UserManager.getUsername();
    UserManager.getID();
    UserManager.getPFP();
    UserManager.getStatus();
    UserManager.getGroup();
    UserManager.getChannel();
    UserManager.getCategory();
    getRoles();
    UserManager.getToken();
    userJoined();
    getServerInfo();

    socket.emit("setRoom", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken() });
    getGroupList();
    getMemberList();
    ChannelTree.getTree();
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

        headline.innerHTML = `${servername} - ${serverdesc}`;
    });
}


function setUrl(param, isVC = false) {

    let urlData = param.split("&")
    let groupId = urlData[0]?.replace("?group=", "")
    let categoryId = urlData[1]?.replace("category=", "")
    let channelId = urlData[2]?.replace("channel=", "")

    // channel already open, dont reload it
    if (UserManager.getChannel() == channelId && channelId && UserManager.getChannel()) return;


    window.history.replaceState(null, null, param); // or pushState

    if (isVC == true) {
        socket.emit("checkChannelPermission", { id: UserManager.getID(), channel: UserManager.getChannel(), token: UserManager.getToken(), permission: "useVOIP" }, function (response) {
            if (response.permission == "granted") {
                switchLeftSideMenu(true)
                stopRecording();

                socket.emit("setRoom", { id: UserManager.getID(), username: UserManager.getUsername(), icon: UserManager.getPFP(), room: UserManager.getRoom(), token: UserManager.getToken() });

                joinVC(param);
                document.getElementById("messagebox").style.visibility = "hidden";
                document.getElementById("content").innerHTML = "";
            }
        });
    }
    else {
        stopRecording();
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


    // If we only clicked a group and no channel etc the main windows is empty.
    // lets show some nice group home / welcome screen
    if (UserManager.getGroup() != null && UserManager.getCategory() == null && UserManager.getChannel() == null) {

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
                console.log(response.mostActiveUsers);
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

    refreshValues();

}


function setChannelName(name) {
    document.getElementById("channelname").innerText = name;
}

function getRoles() {
    socket.emit("RequestRoles", { id: UserManager.getID(), username: UserManager.getUsername(), pfp: UserManager.getPFP() });
}

let scrollTimeout;

function scrollDown() {
    if (scrollTimeout) {
        clearTimeout(scrollTimeout); // Clear any existing timeout
    }

    // would jump back otherwise
    scrollTimeout = setTimeout(() => {
        var objDiv = document.getElementById("content");
        objDiv.scrollTop = objDiv.scrollHeight;
    }, 10); // Execute after 200ms
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
    uploadObject.style.backgroundColor = '#2B3137';

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
    uploadObject.style.backgroundColor = '#2B3137';
}, false);






async function showMessageInChat(message) {

    message.message = text2Emoji(message.message)
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
