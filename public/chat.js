console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(search, replacement) {
        // Escape special characters in the search string if it's not a regex
        const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedSearch, 'g'); // Create a global regex
        return this.replace(regex, replacement);
    };
}

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect()

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
    const storedSolution = getCookie(challenge);
    if (storedSolution) {
        console.log('Using stored solution:', storedSolution);
        socket.emit('verifyPow', { challenge, solution: parseInt(storedSolution) });
    } else {
        powLoadingScreen();
        const solution = await solvePow(challenge, difficulty);
        solvedPow = true;

        setCookie(challenge, solution, 30); // Store the solution in a cookie for 30 days
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

        socket.emit("checkMediaUrlCache", { id: getID(), token: getToken(), url: url }, function (response) {

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
                        console.log(contentType);

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

function markdownText(text, msgid) {
    text = text
        .replace(/`(.*?)`/gim, `<code class="markdown" id="msg-${msgid}">$1</code>`)
        .replace(/´´´(.*?)´´´/gim, `<pre class="markdown" id="msg-${msgid}">$1</pre>`)
        .replace(/~~(.*)~~/gim, '<del>$1</del>')
        //.replace(/-(.*)/gim, '<li>$1</li>')
        .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
        .replace(/\*(.*)\*/gim, '<i>$1</i>');

    return text;
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
                msg = markdownText(msg, msgid);
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

async function checkConnection(delay) {
    if (initConnectionCheck == false) {

        if (socket.connected == true) {
            if (connectionAttempts > 3) {
                showSystemMessage({
                    title: "Connected!",
                    text: "",
                    icon: "info",
                    img: null,
                    type: "success",
                    duration: 4000,
                    onClick: () => {
                        showSystemMessage({
                            title: "shydevil",
                            text: "hey what ya think about this image as profile banner?",
                            icon: "/uploads/upload_146216404639_bloody-makima-thumb.jpg",
                            img: "https://i.pinimg.com/originals/88/20/ff/8820ff7553baaf595822b58c5590b604.jpg",
                            type: "neutral",
                            duration: 4000,
                        });
                    }
                });
            }
            initConnectionCheck = true;
        }
        else {

            if (connectionAttempts > 3) {
                showSystemMessage({
                    title: "Connecting..",
                    text: "",
                    icon: "info",
                    img: null,
                    type: "neutral",
                    duration: 1000
                });
            }

            connectionAttempts++;
        }
    }
    else {
        if (socket.connected == false && initConnectionCheck == true) {
            disconnected = true;
            showSystemMessage({
                title: "Connection Lost",
                text: "",
                icon: "error",
                img: null,
                type: "error",
                duration: 1000
            });
        }
        else if (socket.connected == true && initConnectionCheck == true && disconnected == true) {
            disconnected = false;
            showSystemMessage({
                title: "Successfully reconnected!",
                text: "Refreshing data...",
                icon: "info",
                img: null,
                type: "success",
                duration: 2000
            });
            setTimeout(() => window.location.reload(), 2000)
        }
    }



    setTimeout(() => checkConnection(delay), delay)
}
checkConnection(2000)


// VC STUFF
function joinVC() {

    joinRoom(getRoom());

    document.getElementById("content").innerHTML = "";
    getChannelTreeSocket();
    socket.emit("getCurrentChannel", { id: getID(), username: getUsername(), icon: getPFP(), group: getGroup(), category: getCategory(), channel: getChannel(), token: getToken() });
    socket.emit("joinedVC", { id: getID(), username: getUsername(), icon: getPFP(), room: getRoom(), token: getToken(), lastActivity: new Date().getTime() });
    socket.emit("getVCMembers", { id: getID(), username: getUsername(), icon: getPFP(), room: getRoom(), token: getToken() }, function (response) {

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
    socket.emit("leftVC", { id: getID(), username: getUsername(), icon: getPFP(), room: getRoom(), token: getToken() });
    console.log('Recording stopped');

    leaveRoom(getRoom());
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



// Context Menu Stuff
const ContextMenu = document.getElementById("context-menu");
const profile = document.getElementById("context-menu");
var ContextMenuSelectedMessage;

const scope = document.querySelector("body");

scope.addEventListener("click", (event) => {

    const { clientX: mouseX, clientY: mouseY } = event;
    var clickedElement = document.elementFromPoint(mouseX, mouseY);
    var profileContent = document.getElementById("profile_container");



    if (clickedElement.className == "memberlist-member-info" ||
        clickedElement.classList.contains("memberlist-img") ||
        clickedElement.className == "memberlist-container" ||
        clickedElement.className == "message-profile-img" ||
        clickedElement.className == "message-profile-info-name" ||
        clickedElement.className == "memberlist-member-info name" ||
        clickedElement.className == "memberlist-member-info status" ||
        clickedElement.className == "mention" ||
        clickedElement.id.includes("vc-user-container") ||
        clickedElement.id.includes("vc-user-icon") ||
        clickedElement.id.includes("vc-user-name")
    ) {
        var userid = clickedElement.id;

        //if(clickedElement.className == "mention") { userid = userid.replace("mention-", "")}
        userid = userid.split("-").pop();
        console.log("Userid is " + userid)
        getMemberProfile(userid, mouseX, mouseY);
    }
    else if (clickedElement.className.includes("role") && clickedElement.id.split("-")[0] == "addRole") {
        // Open Role Menu

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageMembers" }, function (response) {
            if (response.permission == "granted") {
                showRoleMenu(mouseX, mouseY);
                addRoleFromProfile(clickedElement.id.split("-")[1])
            }
        });
    }
    else if (clickedElement.className.includes("role_color")) {
        // Remove role code

    }
    else {

        if (clickedElement.id == "profile-role-menu" ||
            clickedElement.id == "role-menu-header" ||
            clickedElement.id == "role-menu-search-icon" ||
            clickedElement.id == "role-menu-search-input" ||
            clickedElement.id == "role-menu-list" ||
            clickedElement.className == "role-menu-entry" ||
            clickedElement.className == "role-menu-entry-roleName"
        ) {
            return;
        }

        profileContent.style.display = "none";
        profileContent.innerHTML = "";

        hideRoleMenu()
    }


});

function showRoleMenu(mouseX, mouseY) {
    var roleMenu = document.getElementById("profile-role-menu");
    roleMenu.style.display = "block"
    roleMenu.style.top = `${mouseY - roleMenu.offsetHeight}px`
    roleMenu.style.left = `${mouseX - roleMenu.offsetWidth - 20}px`;
}

function hideRoleMenu() {
    var roleMenu = document.getElementById("profile-role-menu");
    roleMenu.style.display = "none"
}

scope.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    const { clientX: mouseX, clientY: mouseY } = event;
    var clickedElement = document.elementFromPoint(mouseX, mouseY);

    //console.log(clickedElement)
    //console.log(clickedElement.className)

    ContextMenuSelectedMessage = clickedElement;


    var ErrorButtonCode = `onMouseOver="this.style.backgroundColor='#eb5055'; this.style.color='white';"
                onMouseOut="this.style.backgroundColor='transparent'; this.style.color='#eb5055';" 
                style="color: #eb5055;"`;

    var SuccessButtonCode = `onMouseOver="this.style.backgroundColor='#4ba135'; this.style.color='white';"
                onMouseOut="this.style.backgroundColor='transparent'; this.style.color='#87de54';" 
                style="color: #87de54;"`;

    var OkButtonCode = `onMouseOver="this.style.backgroundColor='#5d7fe3'; this.style.color='white';"
                onMouseOut="this.style.backgroundColor='transparent'; this.style.color='#5d7fe3';" 
                style="color: #5d7fe3;"`;

    var WarningButtonCode = `onMouseOver="this.style.backgroundColor='#e38a5d'; this.style.color='white';"
                onMouseOut="this.style.backgroundColor='transparent'; this.style.color='#e38a5d';" 
                style="color: #e38a5d;"`;


    // Entire Message: message-profile-content-message
    // Single Message: message-profile-content-message


    if (clickedElement.className == "markdown" ||
        clickedElement.className == "message-profile-content-message" ||
        clickedElement.parentNode.className == "message-profile-content-message"
    ) {

        if (clickedElement.parentNode.className == "message-profile-content-message") {
            clickedElement.id = clickedElement.parentNode.id;
        }

        resetContextMenuItem(ContextMenu);

        try {
            // userid of msg
            let msgAuthor = clickedElement.parentNode.parentNode.parentNode.querySelector(".message-profile-info").id

            if (getID() == msgAuthor) {
                addContextMenuItem(ContextMenu, "Edit Message",
                    `onclick="editMessage('${clickedElement.id}');
                    ContextMenu.classList.remove('visible');
                    "`);
            }

        } catch { }


        addContextMenuItem(ContextMenu, "Delete Message",
            ErrorButtonCode + `onclick="deleteMessageFromChat('${clickedElement.id}');
            ContextMenu.classList.remove('visible');
            "`);
    }
    /*
    else if(clickedElement.className == "message-profile-content-message-appended" ||
        clickedElement.className == "iframe-container"){

        var messageid = getMessageId(clickedElement);

        resetContextMenuItem(ContextMenu);
        addContextMenuItem(ContextMenu, "Delete",
            `onclick="deleteMessageFromChat('${messageid}');
            ContextMenu.classList.remove('visible');
            "`);
    }
    */
    else if (clickedElement.className == "memberlist-member-info" ||
        clickedElement.classList.contains("memberlist-img") ||
        clickedElement.className == "memberlist-container" ||
        clickedElement.className == "message-profile-img" ||
        clickedElement.className == "memberlist-member-info status" ||
        clickedElement.className == "memberlist-member-info name" ||
        clickedElement.className == "message-profile-info-name"
    ) {

        try {
            var userid = clickedElement.id;
            resetContextMenuItem(ContextMenu);

            socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "banMember" }, function (response) {
                if (response.permission == "granted") {
                    addContextMenuItem(ContextMenu, "Ban User",
                        ErrorButtonCode + `onclick="banUser('${userid}');
                        ContextMenu.classList.remove('visible');
                        "`);
                }
            });

            socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "kickUsers" }, function (response) {
                if (response.permission == "granted") {
                    addContextMenuItem(ContextMenu, "Kick User",
                        ErrorButtonCode + `onclick="kickUser('${userid}');
                        ContextMenu.classList.remove('visible');
                        "`);
                }
            });

            socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "muteUsers" }, function (response) {
                if (response.permission == "granted") {

                    // check if target user is muted
                    socket.emit("getUserFromId", { id: getID(), token: getToken(), target: userid }, function (response2) {

                        console.log(response2)

                        if (response2.user.isMuted == 1) {
                            addContextMenuItem(ContextMenu, "Unmute User",
                                ErrorButtonCode + `onclick="unmuteUser('${userid}');
                            ContextMenu.classList.remove('visible');
                            "`);
                        }
                        else {
                            addContextMenuItem(ContextMenu, "Mute User",
                                ErrorButtonCode + `onclick="muteUser('${userid}');
                            ContextMenu.classList.remove('visible');
                            "`);
                        }
                    });

                }
            });

            addContextMenuItem(ContextMenu, "Mention user",
                OkButtonCode + `onclick="
                mentionUser('${userid}');
                ContextMenu.classList.remove('visible');
                ;
            "`);

            addContextMenuItem(ContextMenu, "Copy User ID",
                `onclick="navigator.clipboard.writeText('${userid}');
            ContextMenu.classList.remove('visible');
            "`);
        }
        catch (e) {
            console.log("Could get user id from context menu:");
            console.log(e);
        }
    }
    else if (clickedElement.className == "image-embed") {

        resetContextMenuItem(ContextMenu);

        addContextMenuItem(ContextMenu, "Open in new Tab",
            `onclick="
            openNewTab('${clickedElement.src}');
            ContextMenu.classList.remove('visible');
            "`);

        addContextMenuItem(ContextMenu, "Copy URL",
            `onclick="
            navigator.clipboard.writeText('${clickedElement.src}');
            ContextMenu.classList.remove('visible');
            "`);

        addContextMenuItem(ContextMenu, "Delete Embed",
            ErrorButtonCode + `onclick="deleteMessageFromChat('${clickedElement.id}');
            ContextMenu.classList.remove('visible');
            "`);
    }
    else if (clickedElement.id == "channellist" ||
        clickedElement.id == "channeltree"
    ) {

        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") { console.log(response); return; }
            addContextMenuItem(ContextMenu, "Create Category",
                `onclick="
                createCategory();
                ContextMenu.classList.remove('visible');
                "`);

            addContextMenuItem(ContextMenu, "Sort Channels",
                OkButtonCode + `onclick="
            sortChannels();
            ContextMenu.classList.remove('visible');
            "`);
        });
    }
    else if (clickedElement.className == "categoryTrigger") {

        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Create Channel",
                `onclick="
                createChannel('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
        });

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Create Category",
                `onclick="
            createCategory();
            ContextMenu.classList.remove('visible');
            "`);

        });

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Delete Category",
                ErrorButtonCode + `onclick="
            deleteCategory('${clickedElement.id}');
            ContextMenu.classList.remove('visible');
            "`);
        });
    }
    else if (clickedElement.className == "channelTrigger") {
        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") { return; }
            socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Create Channel",
                    `onclick="
                    createChannel('${clickedElement.id}');
                    ContextMenu.classList.remove('visible');
                    "`);
            });
        });

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") { return; }

            addContextMenuItem(ContextMenu, "Edit Channel",
                OkButtonCode + `onclick="
                editChannel('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
        });

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Set as Default",
                OkButtonCode + `onclick="
                setDefaultChannel('${clickedElement.id}', 'text');
                ContextMenu.classList.remove('visible');
                "`);
        });

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") { return; }

            addContextMenuItem(ContextMenu, "Delete Channel",
                ErrorButtonCode + `onclick="
                deleteChannel('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
        });
    }
    else if (clickedElement.id == "serverlist") {

        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "createGroup" }, function (response) {
            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Create Group",
                `onclick="
                createGroup();
                ContextMenu.classList.remove('visible');
                "`);
        });
    }
    else if (clickedElement.classList.contains("server-icon")) {

        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", {
            id: getID(), token: getToken(), permission: ["manageServer",
                "manageGroup",
                "manageChannels",
                "manageUploads",
                "manageGroup",
                "viewLogs",
                "manageEmojis",
                "manageBans",
                "manageServerInfo",
                "manageRateSettings"]
        }, function (response) {
            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Server Settings",
                OkButtonCode + `onclick="
                editServer();
                ContextMenu.classList.remove('visible');
                "`);

            addContextMenuItem(ContextMenu, "Edit Group",
                OkButtonCode + `onclick="
            editGroup('${clickedElement.id}');
            ContextMenu.classList.remove('visible');
            "`);

            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Delete Group",
                ErrorButtonCode + `onclick="
            deleteGroup('${clickedElement.id}');
            ContextMenu.classList.remove('visible');
            "`);

            addContextMenuItem(ContextMenu, "Change Icon",
                `onclick="
            changeGroupIcon('${clickedElement.id}');
            ContextMenu.classList.remove('visible');
            "`);
        });

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "redeemKey" }, function (response) {
            console.log(response)
            if (response.permission == "denied") { return; }

            addContextMenuItem(ContextMenu, "Redeem Key",
                `onclick="
            redeemKey();
            ContextMenu.classList.remove('visible');
            "`);

        });
    }
    else if (clickedElement.id == "serverbanner-image") {

        resetContextMenuItem(ContextMenu);
        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageServer" }, function (response) {
            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Edit Server",
                `onclick="
                editServer();
                ContextMenu.classList.remove('visible');
                "`);
        });

        socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageGroups" }, function (response) {
            if (response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Change Banner",
                `onclick="
                changeGroupBanner();
                ContextMenu.classList.remove('visible');
                "`);
        });
    }
    else {
        resetContextMenuItem(ContextMenu);
    }

    if ((ContextMenu.offsetHeight * 4) + mouseY > document.body.offsetHeight) {
        ContextMenu.style.top = `${mouseY - ContextMenu.offsetHeight}px`;
        ContextMenu.style.left = `${mouseX}px`;
    }
    else {
        ContextMenu.style.top = `${mouseY}px`;
        ContextMenu.style.left = `${mouseX}px`;
    }


    ContextMenu.classList.add("visible");

});

scope.addEventListener("click", (e) => {

    if (e.target.offsetParent != ContextMenu) {
        ContextMenu.classList.remove("visible");
    }
});

function editGroup(id) {
    window.location.href = "/settings/group?id=" + id;
}

function mentionUser(id) {
    messageInputBox.textContent += `<@${id}>`;
    messageInputBox.focus();
}

function editChannel(channelId) {
    window.location.href = "/settings/channel?id=" + channelId;
}

function getMemberProfile(id, x, y, event = null) {
    //console.log("Requesting profile")

    if (x == null && y == null) {
        x = event.clientX;
        y = event.clientY;
    }

    socket.emit("getMemberProfile", { id: getID(), token: getToken(), target: id, posX: x, posY: y });
}

function editServer() {
    window.location.href = "settings/server/";
}
function sortChannels() {
    window.location.href = "/settings/server/?page=channeltree-sorting";
}

function redeemKey() {
    var catname = prompt("Enter the key you want to redeem");

    if (catname == null || catname.length <= 0) {
        return;
    }
    else {
        socket.emit("redeemKey", { id: getID(), value: catname, token: getToken() });
    }
}

function changeGroupIcon(id) {
    var catname = prompt("Group Icon URL:");

    if (catname == null || catname.length <= 0) {
        return;
    }
    else {
        socket.emit("updateGroupIcon", { id: getID(), value: catname, token: getToken(), group: id });
    }
}

function changeGroupBanner() {
    var catname = prompt("Group Banner URL:");

    if (catname == null || catname.length <= 0) {
        return;
    }
    else {
        socket.emit("updateGroupBanner", { id: getID(), value: catname, token: getToken(), group: getGroup() });
    }
}

function createGroup() {
    var catname = prompt("Group Name:");

    if (catname == null || catname.length <= 0) {
        return;
    }
    else {
        socket.emit("createGroup", { id: getID(), value: catname, token: getToken() });
    }
}

function openNewTab(url) {
    window.open(url, '_blank');
}

function createCategory() {
    var catname = prompt("Category Name:");

    if (catname == null || catname.length <= 0) {
        return;
    }
    else {
        socket.emit("createCategory", { id: getID(), value: catname, token: getToken(), group: getGroup() });
    }
}

function deleteChannel(id) {

    customPrompts.showConfirm(
        "Do you want to delete the channel?",
        [["Yes", "success"], ["No", "error"]],
        (selectedOption) => {

            if (selectedOption == "yes") {

                socket.emit("deleteChannel", { id: getID(), token: getToken(), channelId: id, group: getGroup().replace("group-", "") }, function (response) {
                    showSystemMessage({
                        title: response.msg,
                        text: "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: 1000
                    });
                });
            }
        }
    )
}

function deleteGroup(groupid) {
    socket.emit("deleteGroup", { id: getID(), token: getToken(), group: groupid });
}


function deleteCategory(id) {
    customPrompts.showConfirm(
        "Do you want to delete the category?",
        [["Yes", "success"], ["No", "error"]],
        (selectedOption) => {

            if (selectedOption == "yes") {

                socket.emit("deleteCategory", { id: getID(), token: getToken(), group: getGroup(), category: id }, function (response) {
                    showSystemMessage({
                        title: response.msg,
                        text: "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: 1000
                    });
                });
            }
        }
    )
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

function resetContextMenuItem(element) {
    element.innerHTML = "";
}

function addContextMenuItem(element, displayname, onclick = "") {
    var code = `<div class="item" ${onclick}>${displayname}</div>`;
    element.innerHTML += code;
}



function kickUser(id) {
    var reason = prompt("Reason:");
    if (!reason) return;
    socket.emit("kickUser", { id: getID(), token: getToken(), target: id, reason: reason });
}

function muteUser(id) {
    //var reason = prompt("Reason: (empty for none)");
    //var duration = prompt("Duration in minutes: (empty for permanent until unmuted)");
    //socket.emit("muteUser", { id: getID(), token: getToken(), target: id, reason: reason, time: duration });


    customPrompts.showPrompt(
        "Mute User",
        `
        <div class="prompt-form-group">
            <label class="prompt-label" for="muteReason">Reason (optional)</label>
            <input class="prompt-input" id="tt_muteUserDialog_muteReason" type="text" name="muteReason">
        </div>

        <div class="prompt-form-group">
            <label class="prompt-label" for="muteDurationType">Mute Duration Type</label>            
            <input class="prompt-input" type="number" id="tt_muteUserDialog_muteDurationNumber" min="0" step="1" name="muteDurationNumber" placeholder="Number in minutes, e.g. 10">
            
            <select class="prompt-input prompt-select" id="tt_muteUserDialog_muteDurationType" name="muteDurationType">
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option default selected value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="perma">Permanent</option>
            </select>
        </div>

        `,
        (values) => {
            console.log('Submitted Values:', values);

            let muteReason = values.muteReason;
            let muteDuration = `${Math.floor(values.muteDurationNumber)} ${values.muteDurationType}`

            socket.emit("muteUser", {
                id: getID(),
                token: getToken(),
                target: id,
                reason: muteReason,
                time: muteDuration
            }, function (response) {
                showSystemMessage({
                    title: response.msg,
                    text: "",
                    icon: response.type,
                    img: null,
                    type: response.type,
                    duration: 1000
                });
            });
        },
        ["Mute", "error"],
        false,
        250,
        () => {
            tooltipSystem.clearTooltipLocalStorage("tt_mutenUserDialog_");
            muteUserTooltip();
        }
    );
}

function unmuteUser(id) {
    socket.emit("unmuteUser", { id: getID(), token: getToken(), target: id });
}

function banUser(id) {

    customPrompts.showPrompt(
        "Ban User",
        `
        <div class="prompt-form-group">
            <label class="prompt-label" for="banReason">Reason (optional)</label>
            <input class="prompt-input" id="tt_banUserDialog_banReason" type="text" name="banReason">
        </div>

        <div class="prompt-form-group">
            <label class="prompt-label" for="banDurationType">Ban Duration Type</label>            
            <input class="prompt-input" type="number" id="tt_banUserDialog_banDurationNumber" min="0" step="1" name="banDurationNumber" placeholder="Number in days, e.g. 7">
            
            <select class="prompt-input prompt-select" id="tt_banUserDialog_banDurationType" name="banDurationType">
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option default selected value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="perma">Permanent</option>
            </select>
        </div>

        `,
        (values) => {
            console.log('Submitted Values:', values);

            let banReason = values.banReason;
            let banDuration = `${Math.floor(values.banDurationNumber)} ${values.banDurationType}`

            socket.emit("banUser", {
                id: getID(),
                token: getToken(),
                target: id,
                reason: banReason,
                duration: banDuration
            }, function (response) {
                showSystemMessage({
                    title: response.msg,
                    text: "",
                    icon: response.type,
                    img: null,
                    type: response.type,
                    duration: 1000
                });
            });
        },
        ["Ban", "error"],
        false,
        250,
        () => {
            tooltipSystem.clearTooltipLocalStorage("tt_banUserDialog_");
            banUserTooltip();
        }
    );
}



function getChannelTreeSocket() {
    socket.emit("getChannelTree", { id: getID(), token: getToken(), username: getUsername(), icon: getPFP(), group: getGroup() }, function (response) {
        channeltree.innerHTML = response.data;
        document.getElementById("mobile_channelList").innerHTML = response.data;

        try {
            document.querySelector("div #channeltree #channel-" + getChannel()).style.color = "white";
            document.querySelector("div #channeltree #category-" + getCategory()).style.color = "white";

            var markedMessage3 = [];
            markedMessage3 = getCookie("unmarkedMessages");

            //console.log(markedMessage3);
        }
        catch (Ex) {
            //console.log(Ex)
        }
    });
}

function setDefaultChannel(channelId) {
    socket.emit("setDefaultChannel", { id: getID(), token: getToken(), value: channelId.replace("channel-", "") }, function (response) {
        showSystemMessage({
            title: response.msg,
            text: "",
            icon: response.type,
            img: null,
            type: response.type,
            duration: 1000
        });
    });
}

function userJoined(onboardingFlag = false, passwordFlag = null, loginNameFlag = null) {
    if (getUsername() != null) {
        var username = getUsername();

        socket.emit("userConnected", {
            id: getID(), name: username, icon: getPFP(), status: getStatus(), token: getToken(), password: passwordFlag, onboarding: onboardingFlag,
            aboutme: getAboutme(), banner: getBanner(), loginName: loginNameFlag
        }, function (response) {

            // if we finished onboarding
            if (!response.error && response.finishedOnboarding == true) {
                socket.emit("setRoom", { id: getID(), room: getRoom(), token: getToken() });
                socket.emit("getGroupBanner", { id: getID(), token: getToken(), username: getUsername(), icon: getPFP(), group: getGroup() });
                socket.emit("getGroupList", { id: getID(), group: getGroup(), token: getToken(), username: getUsername(), icon: getPFP() });
                getMemberList()
                getChannelTreeSocket()
                socket.emit("getCurrentChannel", { id: getID(), token: getToken(), username: getUsername(), icon: getPFP(), group: getGroup(), category: getCategory(), channel: getChannel() });
                socket.emit("setRoom", { id: getID(), room: getRoom(), token: getToken() });

                getServerInfo();

                getChatlog();
            }
            else {
                if (response.error) {
                    showSystemMessage({
                        title: response.title,
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

window.onunload = (event) => {
    socket.emit("userDisconnected", { id: getID(), time: new Date().getTime() });
};

function setTyping() {
    socket.emit("isTyping", { id: getID(), token: getToken(), room: getRoom() });


    clearTimeout(typetimeout);
    typetimeout = setTimeout(() => {

        socket.emit("stoppedTyping", { id: getID(), token: getToken(), room: getRoom() });

    }, 2 * 1000);


}

function getRoom() {
    return getUrlParams("group") + "-" + getUrlParams("category") + "-" + getUrlParams("channel");
}

function getUrlParams(param) {
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}

function promptForUsername(reloadAfterChange = false) {
    createPopup(
        'Choosing a Username',
        'Please enter your username:',
        [
            {
                text: 'Change',
                onClick: () => {
                    const username = document.getElementById('username-input').value;
                    if (username.length > 0) {
                        setCookie("username", username, 360);
                        updateUsernameOnUI(username, true);

                        if (reloadAfterChange == true)
                            window.location.reload();
                    }
                    else {
                        alert("Your username was too short");
                    }

                    closePopup();
                }
            },
            {
                text: 'Cancel',
                onClick: closePopup
            }
        ]
    );

    // Add input field
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'username-input';
    document.querySelector('.popup p').appendChild(input);
}

function changeUsername() {
    promptForUsername(true);
}

function changeStatus() {
    var status = prompt("What should your new status be?", getStatus());

    if (status.length > 0) {
        setCookie("status", status, 360);
        updateStatusOnUI(status, true);
    }
    else {
        alert("Your status was too short");
    }
}

function changePFP() {
    var pfp = prompt("Enter the url of your new pfp", getPFP());

    if (pfp.length > 0) {
        setCookie("pfp", pfp, 360);
        updatePFPOnUI(pfp, true);
    }
    else {

        var reset = confirm("Your pfp url was too short. Want to reset your pfp?");

        if (reset) {
            pfp = "/img/default_pfp.png";
            setPFP(pfp);
        }
        else {
            return;
        }
    }

    if (pfp == null || isImage(pfp) == false) {
        pfp = "https://wallpapers-clan.com/wp-content/uploads/2022/05/cute-pfp-25.jpg";
    }

    setCookie("pfp", pfp, 360);
    updatePFPOnUI(pfp, true);
}

function updateUsernameOnUI(username, sync = false) {
    document.getElementById("profile-qa-info-username").innerText = username;

    if (sync == true) {
        socket.emit("setUsername", { token: getToken(), id: getID(), username: getUsername(), icon: getPFP() });
    }

}

function updateStatusOnUI(status, sync = false) {
    document.getElementById("profile-qa-info-status").innerText = status;

    if (sync == true) {
        socket.emit("setStatus", { id: getID(), username: getUsername(), icon: getPFP(), status: getStatus() });
    }
}

function updatePFPOnUI(url, sync = false) {
    document.getElementById("profile-qa-img").src = url;

    if (sync == true) {
        socket.emit("setPFP", { id: getID(), username: getUsername(), icon: getPFP() });
    }
}

function getChatlog(index = -1) {
    socket.emit("getChatlog", { id: getID(), token: getToken(), groupId: getGroup(), categoryId: getCategory(), channelId: getChannel(), startIndex: index });
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


    return /\.(mp4|webp)$/.test(url.toLowerCase());
    /*
    const vid = new HTMLVideoElement();
    vid.src = url;
    vid.load();


    if(vid.height > 0 && vid.width > 0){
        return true;
    }
    else{
        return false;
    }

    */
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

    if (getGroup() != null && getCategory() != null && getChannel() != null) {
        return `<meta http-equiv="content-Type" content="text/html; utf-8" />
                <meta http-equiv="Pragma" content="cache" />
                <meta name="robots" content="INDEX,FOLLOW" />
                <meta http-equiv="content-Language" content="en" />
                <meta name="description" content="You have been invited to chat in ${getChannel()} ! Join the discussion on ${serverName} !" />
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

function getGroup() {

    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get("group");

    if (urlChannel == null) {
        return "0";
    }
    else {
        return urlChannel;
    }
}

function getCategory() {

    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get("category");

    if (urlChannel == null) {
        return null;
    }
    else {
        return urlChannel;
    }
}

function getChannel() {

    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get("channel");

    if (urlChannel == null) {
        return null;
    }
    else {
        return urlChannel;
    }
}

function getPassword() {
    let passprompt = prompt("Please enter your account password:");
    if (passprompt) return passprompt;
}

function getToken() {
    var token = getCookie("token");

    if (token == null || token.length <= 0) {
        return null;
    }
    else {
        return token;
    }
}

function getID() {
    var id = getCookie("id");

    if (id == null || id.length != 12) {
        id = generateId(12);
        setCookie("id", id, 360);
        return id;
    }
    else {
        return id;
    }
}

function getPFP() {
    var pfp = getCookie("pfp");

    if (pfp == null || pfp.length <= 0) {
        //pfp = prompt("Please enter the url to your profile picture.");

        //if(pfp.length <= 0){
        pfp = "/img/default_pfp.png";
        //}
        setCookie("pfp", pfp, 360);
        updatePFPOnUI(pfp);
        return pfp;
    }

    updatePFPOnUI(pfp);
    return pfp;
}

function getStatus() {
    var status = getCookie("status");

    if (status == null || status.length <= 0) {
        setCookie("status", "Hey im new!", 360);
        updateStatusOnUI(status);
        return status;
    }
    else {
        updateStatusOnUI(status);
        return status;
    }
}


function createChannel(category) {
    customPrompts.showPrompt(
        "Create a channel",
        `
        <div class="prompt-form-group">
            <label class="prompt-label" for="channelName">Channel Name</label>
            <input class="prompt-input" type="text" id="tt_channelCreateDialog_channelName" name="channelName" placeholder="Enter channel name">
        </div>
        <div class="prompt-form-group">
            <label class="prompt-label">Channel Type</label>
            <div style="display: flex; gap: 10px;" id="tt_channelCreateDialog_channelType">
                <div class="prompt-click-select" onclick="customPrompts.handleSelect(this, 'text')">
                    <p>Text</p>
                </div>
                <div class="prompt-click-select" onclick="customPrompts.handleSelect(this, 'voice')">
                    <p>Voice</p>
                </div>
            </div>
        </div>
        `,
        (values) => {
            console.log('Submitted Values:', values);

            socket.emit("createChannel", {
                id: getID(),
                value: values.channelName,
                type: values.selected,
                token: getToken(),
                group: getGroup().replace("group-", ""),
                category: category.replace("category-", "")
            }, function (response) {
                showSystemMessage({
                    title: response.msg,
                    text: "",
                    icon: response.type,
                    img: null,
                    type: response.type,
                    duration: 1000
                });
            });
        },
        ["Create", "success"],
        false,
        250,
        () => {
            tooltipSystem.clearTooltipLocalStorage("tt_channelCreateDialog_")
            createChannelTooltip()
        }
    );


    createChannelTooltip()
}



function doAccountLogin() {
    customPrompts.showPrompt(
        "Login",
        `
        <div style="width: 100%; float :left;">
            <a style="
                margin-top: -20px; 
                margin-bottom: 60px;
                display: block; 
                float: left;
                font-size: 14px; 
                font-style: italic;
                text-align: left; 
                background-color: #F0F0F0;
                border-radius: 2px;
                padding: 2px 6px;
                color: #34383C;
                text-decoration: none;
                cursor: pointer;
                " 
            onclick="doAccountOnboarding();" >Need to register? Click here!</a>
        </div>
        
        <div style="display: block;float: left; margin-right: 100px;">
            <div class="prompt-form-group" id="loginNameContainer">
                <label class="prompt-label" for="loginName">Login Name</label>
                <input class="prompt-input" type="text" name="loginName" onkeyup="handleLoginNameInput(this)" id="loginName" placeholder="Enter login name" value="">
                <label style="color: indianred;" class="prompt-label error-text"></label>
            </div>
            <div class="prompt-form-group" id="passwordContainer">
                <label class="prompt-label" for="password">Password</label>
                <input class="prompt-input" type="password" name="password" id="password" placeholder="Enter password">
            </div>
        </div>
        `,
        async (values) => {
            console.log('Login Name:', values.loginName);
            console.log('Password:', values.password);


            // check login name
            if (values.loginName) {

                if (validateLoginname(values.loginName)) {
                    socket.emit("userLogin", { id: getID(), loginName: values.loginName, password: values.password }, function (response) {

                        console.log(response)
                        if (response?.error == null && response.member) {
                            setCookie("token", response.member.token, 365);
                            setCookie("id", response.member.id, 365);
                            setCookie("username", response.member.name, 365);

                            setPFP(response.member.icon);
                            setBanner(response.member.banner);
                            setAboutme(response.member.aboutme);
                            setStatus(response.member.status);

                            window.location.reload();
                        }
                        else {
                            customAlerts.showAlert("error", response.error)
                        }
                    });
                }
                else {
                    customAlerts.showAlert("error", "Your login name contains illegal characters")
                    customPrompts.closePrompt();
                    return;
                }
            }




            customPrompts.closePrompt();
        }
    );
}

function doAccountOnboarding() {
    customPrompts.showPrompt(
        "Onboarding",
        `
        <div style="width: 100%; float :left;">
            <a style="
                margin-bottom: 60px;
                display: block; 
                float: left;
                font-size: 14px; 
                font-style: italic;
                text-align: left; 
                background-color: #F0F0F0;
                border-radius: 2px;
                padding: 2px 6px;
                color: #34383C;
                text-decoration: none;
                cursor: pointer;
                " 
            onclick="doAccountLogin()">Got an account? Login!</a>
        </div>
        
        <div id="tt_accountOnboardingUserDialog"> <!-- silly lil space helper -->
            <div style="display: block;float: left; margin-right: 100px;">
                
                <div class="prompt-form-group" id="usernameContainer">
                    <label class="prompt-label" for="username">Display Name</label>
                    <input class="prompt-input" type="text" name="username" id="username" placeholder="Enter Display name" value="">
                </div>
                <div class="prompt-form-group" id="loginNameContainer">
                    <label class="prompt-label" for="loginName">Login Name</label>
                    <input class="prompt-input" type="text" name="loginName" onkeyup="handleLoginNameInput(this)" id="loginName" placeholder="Enter login name" value="">
                    <label style="color: indianred;" class="prompt-label error-text"></label>
                </div>
                <div class="prompt-form-group" id="passwordContainer">
                    <label class="prompt-label" for="password">Password</label>
                    <input class="prompt-input" type="password" name="password" id="password" placeholder="Enter password">
                </div>
                <div class="prompt-form-group" id="repeatedPasswordContainer">
                    <label class="prompt-label" for="repeatedPassword">Repeated Password</label>
                    <input class="prompt-input" type="password" name="repeatedPassword" id="repeatedPassword" placeholder="Repeat password">
                </div>
            </div>
            <div style="float: left; width: 250px;">
                <div class="prompt-form-group">
                    <label class="prompt-label" for="profileImage">Profile Image</label>
                    <div class="profile-image-container" id="profileImageContainer" onclick="document.getElementById('profileImage').click()">
                        <img id="profileImagePreview" src="" alt="Profile Image" class="profile-image-preview">
                    </div>
                    <input class="prompt-input" type="file" name="profileImage" id="profileImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
                </div>
                <div class="prompt-form-group">
                    <label class="prompt-label" for="bannerImage">Banner Image</label>
                    <div class="profile-image-container" id="bannerImageContainer" onclick="document.getElementById('bannerImage').click()" style="width: 100% !important; border-radius: 8px !important;">
                        <img id="bannerImagePreview" src="" alt="Banner Image" class="profile-image-preview">
                    </div>
                    <input class="prompt-input" type="file" name="bannerImage" id="bannerImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
                </div>
            </div>
        </div>
        `,
        async (values) => {
            console.log('Username:', values.username);
            console.log('Login Name:', values.loginName);
            console.log('Password:', values.password);
            console.log('Repeated Password:', values.repeatedPassword);

            // validate password
            if (values.repeatedPassword !== values.password) {
                customAlerts.showAlert("error", "Your repeated password is incorrect");
                customPrompts.closePrompt();
                return;
            }

            // check profile picture
            if (values.profileImage) {
                const profileUrl = await upload(values.profileImage);

                if (!profileUrl.error) {
                    console.log('Profile Image :', profileUrl.urls);
                    setPFP(profileUrl.urls)
                }
            } else {
                console.log('No profile image selected.');
            }

            // check banner
            if (values.bannerImage) {
                const bannerUrl = await upload(values.bannerImage);

                if (!bannerUrl.error) {
                    console.log('Banner Image :', bannerUrl.urls);
                    setBanner(bannerUrl.urls)
                }
            } else {
                console.log('No banner image selected.');
            }

            // check username
            if (values.username) {
                setCookie("username", values.username, 360);
            } else {
                alert("Your username was too short");
            }

            // check login name
            if (values.loginName) {

                if (validateLoginname(values.loginName)) {
                    setCookie("loginName", values.loginName, 360);
                }
                else {
                    customAlerts.showAlert("error", "Your login name contains illegal characters")
                    customPrompts.closePrompt();
                    return;
                }
            } else {
                customAlerts.showAlert("error", "Your login name was too short");
                customPrompts.closePrompt();
                return;
            }


            // resubmit userjoin but with onboarding done
            userJoined(true, values.password, values.loginName)

            customPrompts.closePrompt();
        },
        null,
        null,
        null,
        () => {
            doAccountOnboardingTooltip();
        }
    );
}

function handleLoginNameInput(element) {
    if (!element.value) return;

    if (validateLoginname(element.value)) {
        element.parentNode.querySelector(".error-text").innerText = "";
        element.style.border = "1px solid transparent";
    }

    if (!validateLoginname(element.value)) {
        element.parentNode.querySelector(".error-text").innerText = "Only supports . | _ | 0-9 | a-z | A-Z";
        element.style.border = "1px solid red";
    }

}

function validateLoginname(loginName) {
    const regex = /^[a-zA-Z0-9._]+$/;
    return regex.test(loginName);
}


function getUsername() {
    var username = getCookie("username");

    if (username == null || username.length <= 0) {
        return "User";
    }
    else {
        updateUsernameOnUI(username);
        return username;
    }
}

function getAboutme() {
    var aboutme = getCookie("aboutme");

    if (aboutme == null || aboutme.length <= 0) {
        return "";
    }
    else {
        //updateUsernameOnUI(aboutme);
        return aboutme;
    }
}

function getBanner() {
    var banner = getCookie("banner");

    if (banner == null || banner.length <= 0) {
        return "";
    }
    else {
        //updateUsernameOnUI(aboutme);
        return banner;
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
        socket.emit("stoppedTyping", { id: getID(), token: getToken(), room: getRoom() });
    }

    if (messagebox.innerText != "") {
        setTyping();
    }

}

function switchLeftSideMenu(checkChannelLink = false) {

    let leftSideMenuContainer = document.getElementById("mobile_GroupAndChannelContainer")

    if (leftSideMenuContainer.style.display == "block") {

        if (getCategory() != null && getChannel() != null && checkChannelLink == true)
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

    if (getGroup() == null || getGroup().length <= 0 || getCategory() == null || getCategory().length <= 0 || getChannel() == null || getChannel().length <= 0) {
        showSystemMessage({
            title: "Please select a channel first",
            text: "",
            icon: "warning",
            img: null,
            type: "warning",
            duration: 1000
        });
        //alert("Please select any channel first");
        return;
    }

    // important
    if (editMessageId != null)
        editMessageId = editMessageId.replaceAll("msg-", "")

    message = message.replaceAll("<p><br></p>", "");
    socket.emit("messageSend", {
        id: authorId, name: authorUsername, icon: pfp, token: getToken(),
        message: message, group: getGroup(), category: getCategory(),
        channel: getChannel(), room: getRoom(), editedMsgId: editMessageId
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
        var userId = getID();

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
        var userId = getID();


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
    doAccountOnboarding()
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

    if (editorContentHeight > initialHeight) {
        const newHeight = Math.min(editorContentHeight, maxHeight);
        editorContainer.style.height = newHeight + 'px';
        editorContainer.style.transform = `translateY(-${(newHeight - (40 - toolbarHeightDiff))}px)`;
        quillContainer.style.height = newHeight + 'px';
    } else {
        resetEditorHeight();
    }
}, 100); // Adjust the wait time as needed

function resetEditorHeight() {
    // Reset the Quill editor's content programmatically
    //quill.setContents([]); // Clears Quill's internal state for content

    // Ensure height reset to initial values
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

        sendMessageToServer(getID(), getUsername(), getPFP(), msgContent);

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
        id: getID(), token: getToken(), messageId: id.replace("msg-", ""),
        group: getGroup(), category: getCategory(), channel: getChannel()
    });
}

function bulkDeleteMessageFromChat(id) {
    var children = null;

    try {
        console.log("Trying to get parentnode.")
        children = document.querySelector(`#${id} p`).parentNode;
    }
    catch {
        console.log("Trying fallback parentnode")
        children = document.querySelector(`#${id}`).parentNode;
    }

    children = children.querySelector("p");

    for (var i = 0; i < children.length; i++) {
        socket.emit("deleteMessage", {
            id: getID(), token: getToken(), messageId: children[i].id.replace("msg-", ""),
            group: getGroup().replace("group-", ""), category: getCategory().replace("category-", ""), channel: getChannel().replace("channel-", "")
        });

    }
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

    getChannelTreeSocket();
    return;

    channeltree.innerHTML = data;
    try {
        document.querySelector("div #channeltree #channel-" + getChannel()).style.color = "white";
        document.querySelector("div #channeltree #category-" + getCategory()).style.color = "white";

        var markedMessage3 = [];
        markedMessage3 = getCookie("unmarkedMessages");
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



    setActiveGroup(getGroup());
});


socket.on('newMemberJoined', function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' +
        '            <p><label class="systemAnnouncementChatUsername">' + author.name + '</label> joined the server! <label class="timestamp" id="' + author.timestamp + '">' + author.timestamp.toLocaleString("narrow") + '</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();

    //socket.emit("getChannelTree", { id: getID(), token: getToken(), username: getUsername(), icon: getPFP(), room: getRoom(), group: getGroup() });
});

socket.on('memberOnline', function (member) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' +
        '            <p><label class="systemAnnouncementChatUsername">' + member.username + '</label> is now online!</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();

    //socket.emit("getChannelTree", { id: getID(), token: getToken(), username: getUsername(), icon: getPFP(), room: getRoom(), group: getGroup() });
});

socket.on('memberPresent', function (member) {
    //socket.emit("getChannelTree", { id: member.id, username: member.username, icon: member.pfp });
    //socket.emit("getChannelTree", { id: getID(), token: getToken(), username: getUsername(), icon: getPFP(), room: getRoom(), group: getGroup() });
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

socket.on('memberOffline', function (member) {
    var message = '<div class="systemAnnouncementChat">' +
        '            <p><label class="systemAnnouncementChatUsername">' + member + '</label> is now offline!</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();
});

socket.on('configUpdate', function () {
    getChannelTreeSocket()
});

socket.on('receiveToken', function (data) {
    setCookie("token", data, 365);
});

socket.on('modalMessage', function (data) {

    console.log(data)

    var buttonArray = [];
    if(data.buttons){
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
        setCookie("token", data.token, 365);
    }
    else if (data.token != null && data.action == "login") {
        setCookie("token", data.token, 365);
        setCookie("id", data.id, 365);

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

function addRoleFromProfile(userId) {
    socket.emit("getAllRoles", { id: getID(), token: getToken(), group: getGroup(), targetUser: userId }, function (response) {

        var roleList = document.getElementById("profile-role-menu").querySelector("#role-menu-list");
        roleList.innerHTML = "";

        var roles = response.data
        Object.keys(roles).forEach(function (role) {

            var roleObj = roles[role]

            var roleId = roleObj.info.id;
            var roleName = roleObj.info.name;
            var roleColor = roleObj.info.color;
            var hasRole = roleObj.info.hasRole;

            var displayChecked = "";
            if (hasRole == 1) {
                displayChecked = "checked";
            }
            else {
                displayChecked = "";
            }

            roleList.insertAdjacentHTML("beforeend", `<div class="role-menu-entry" onclick="checkCheckedRoleMenu(this.querySelector('input'))">
                        <input type="checkbox" ${displayChecked} class="role-menu-entry-checkbox" id="role-menu-entry_${roleId}_${userId}" onclick="checkCheckedRoleMenu(this)">
                        <label style="color: ${roleColor};" class="role-menu-entry-roleName">${roleName}</label>
                    </div>`)
        });

    });
}

function checkCheckedRoleMenu(element) {
    socket.emit("checkPermission", { id: getID(), token: getToken(), permission: "manageMembers" }, function (response) {
        if (response.permission == "granted") {
            element.checked = !element.checked;
            var roleId = element.id.split("_")[1];
            var userId = element.id.split("_")[2];

            if (element.checked == true) {
                // Assign role
                socket.emit("addUserToRole", { id: getID(), token: getToken(), role: roleId, target: userId }, function (response) {

                    if (response.type != "success") {
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
                // Remove role
                socket.emit("removeUserFromRole", { id: getID(), token: getToken(), role: roleId, target: userId }, function (response) {
                    if (response.type != "success") {
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
        }
    });
}

function importToken() {
    var combinedInput = prompt("Please paste your exported token here.")

    var token = combinedInput.split(":")[0];
    var id = combinedInput.split(":")[1];

    console.log(token)

    if (token.length != 48) {
        alert("This token was invalid. If you forgot your token please contact the server admin");
        return;
    }
    if (id.length != 12) {
        alert("The ID in your token string was invalid. Format: token:id (48, 12)");
        return;
    }

    alert("Token successfully set!\nPlease save it if you havent already");
    setCookie("token", token, 365);
    setCookie("id", id, 365);
}

function resetAccount() {
    var reset = confirm("Do you really want to reset your account? EVERYTHING will be reset.")

    if (reset) {
        setCookie("id", null, 365);
        setCookie("username", null, 365);
        setCookie("status", null, 365);
        setCookie("pfp", null, 365);
        setCookie("token", null, 365);
        setCookie("banner", null, 365);

        alert("Your account has been reset. Please refresh the page if you want to continue");
    }
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

        socket.emit("searchTenorGif", { id: getID(), token: getToken(), search: gifSearchbarInput.value }, function (response) {

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
        sendMessageToServer(getID(), getUsername(), getPFP(), document.querySelector('.ql-editor').innerHTML);
    }

    sendMessageToServer(getID(), getUsername(), getPFP(), url);

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

    socket.emit("getEmojis", { id: getID(), token: getToken() }, function (response) {

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


function exportCookies() {
    var cookieData = document.cookie.split(';').map(function (c) {
        var i = c.indexOf('=');
        return [c.substring(0, i), c.substring(i + 1)];
    });

    copy(JSON.stringify(JSON.stringify(cookieData)));
}

function importCookies(data) {
    var cookieData = JSON.parse(data);
    cookieData.forEach(function (arr) {
        document.cookie = arr[0] + '=' + arr[1];
    });
}

function setUser(username) {
    setCookie("username", username, 360);
    updateUsernameOnUI(username);
}

function setBanner(banner) {
    setCookie("banner", banner, 360);
}

function setStatus(status) {
    setCookie("status", status, 360);
    updateUsernameOnUI(status);
}

function setPFP(pfp) {
    setCookie("pfp", pfp, 360);
    updateUsernameOnUI(pfp);
}

function setAboutme(aboutme) {
    setCookie("aboutme", aboutme, 360);
    updateUsernameOnUI(aboutme);
}

socket.on('receiveGroupBanner', function (data) {
    groupbanner.src = data;
    document.getElementById("mobile_groupBannerDisplay").src = data;
});


function refreshValues() {
    var username = getUsername();
    getID();
    getPFP();
    getStatus();
    getGroup();
    getChannel();
    getCategory();
    getRoles();
    getToken();
    userJoined();
    getServerInfo();

    socket.emit("setRoom", { id: getID(), username: getUsername(), icon: getPFP(), room: getRoom(), token: getToken() });
    getGroupList();
    getMemberList();
    getChannelTreeSocket()
    socket.emit("getCurrentChannel", { id: getID(), username: username, icon: getPFP(), group: getGroup(), category: getCategory(), channel: getChannel(), token: getToken() });
}

function getMemberList() {
    socket.emit("getMemberList", { id: getID(), username: getUsername(), icon: getPFP(), token: getToken(), channel: getChannel(), group: getGroup() }, function (response) {

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
    socket.emit("getGroupList", { id: getID(), group: getGroup(), username: getUsername(), icon: getPFP(), token: getToken() });
    getGroupBanner();
}

function getGroupBanner() {
    socket.emit("getGroupBanner", { id: getID(), username: getUsername(), icon: getPFP(), group: getGroup(), token: getToken() });
}

var serverName;
var serverDesc;
function getServerInfo(returnData = false) {
    socket.emit("getServerInfo", { id: getID(), token: getToken() }, function (response) {

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
    if (getChannel() == channelId && channelId && getChannel()) return;


    window.history.replaceState(null, null, param); // or pushState

    if (isVC == true) {
        socket.emit("checkChannelPermission", { id: getID(), channel: getChannel(), token: getToken(), permission: "useVOIP" }, function (response) {
            if (response.permission == "granted") {
                switchLeftSideMenu(true)
                stopRecording();

                socket.emit("setRoom", { id: getID(), username: getUsername(), icon: getPFP(), room: getRoom(), token: getToken() });

                joinVC(param);
                document.getElementById("messagebox").style.visibility = "hidden";
                document.getElementById("content").innerHTML = "";
            }
        });
    }
    else {
        stopRecording();
        socket.emit("checkChannelPermission", { id: getID(), channel: getChannel(), token: getToken(), permission: "sendMessages" }, function (response) {
            if (response.permission == "granted") {
                switchLeftSideMenu(true)

                socket.emit("setRoom", { id: getID(), username: getUsername(), icon: getPFP(), room: getRoom(), token: getToken() });
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
    if (getGroup() != null && getCategory() == null && getChannel() == null) {

        messageInputBox.parentNode.parentNode.style.visibility = "hidden";
        socket.emit("getGroupStats", { id: getID(), token: getToken(), group: getGroup() }, function (response) {

            if (response.type == "success") {

                // not enough users chatted to show group stats
                if(response.mostActiveUsers.length <= 1) return;

                contentBox = document.getElementById("content");

                let code = `
                <div id="homeScreenGroupContainer">
                
                <h1 style="text-align: center">${response.group.info.name}</h1><br>
                <h2>Top 100 Active Users</h2><hr>
                
                <div id="homeGroupStatsMostActiveUserContainer">
                <table id="activeUserTableList">`;

                // Get newly created container
                activeUserTable = document.getElementById("activeUserTableList");

                for (let i = 0; i < response.mostActiveUsers.length; i += 2) {


                    let username1 = response.mostActiveUsers[i].user.name;
                    let message_count1 = response.mostActiveUsers[i].message_count;

                    let username2 = response.mostActiveUsers[i + 1].user.name;
                    let message_count2 = response.mostActiveUsers[i + 1].message_count;

                    code += `                            
                            <tr>
                                <td>
                                    <div class="activeUserEntry" onclick='getMemberProfile("${response.mostActiveUsers[i].user.id}", null, null, event)'>
                                        <p class="activeUserEntryName">
                                            ${username1}
                                        <p>
                                        
                                        <div class="activeUserEntryDivider"></div>

                                        <p class="activeUserEntryName">
                                            ${message_count1} messages
                                        <p>
                                    </div>
                                </td>

                                <td>
                                    <div class="activeUserEntry" onclick='getMemberProfile("${response.mostActiveUsers[i + 1].user.id}", null, null, event)'>
                                        <p class="activeUserEntryName">
                                            ${username2}
                                        <p>
                                        
                                        <div class="activeUserEntryDivider"></div>

                                        <p class="activeUserEntryName">
                                            ${message_count2} messages
                                        <p>
                                    </div>
                                </td>
                            </tr>
                    `;
                }


                code += `</table></div></div>`;
                contentBox.insertAdjacentHTML("beforeend", code)


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
    socket.emit("RequestRoles", { id: getID(), username: getUsername(), pfp: getPFP() });
}

function generateId(length) {
    let result = '1';
    const characters = '0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length - 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
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
                    getID(),
                    getUsername(),
                    getPFP(),
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
function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}
