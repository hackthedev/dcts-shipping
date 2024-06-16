console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect()


var chatlog = document.getElementById("content");
var channeltree = document.getElementById("channeltree");
var serverlist = document.getElementById("serverlist");
var groupbanner = document.getElementById("serverbanner-image");
var memberlist = document.getElementById("infolist");
var typingIndicator = document.getElementById("typing-indicator");
var messageInputBox = document.getElementById("messagebox-content");

var typetimeout;

setupNotify();
setupPrompt();

/*
console.log("Current Username: " + getUsername());
console.log("Current Status: " + getStatus());
console.log("Current About Me: " + getAboutme());
console.log("Current ID: " + getID());
console.log("Current PFP: " + getPFP());
console.log("Current Banner: " + getBanner());
console.log("Current Group: " + getGroup());
console.log("Current Channel: " + getChannel());
console.log("Current Category: " + getCategory());
console.log("Current Room: " + getRoom());

 */
//console.log("Current Token: " + getToken());


userJoined();

var blockedData = [];
var blockedDataCounter = [];
var bypassElement = [];
var bypassCounter = [];

// If markdown didnt get converted, this will
function updateMarkdownLinks(delay) {
    // await ...
    var elements = document.querySelectorAll(".message-profile-content p");

    var lengthi = 0;
    if(elements.length <= 50){
        lengthi = elements.length;
    }
    else{
        lengthi = 50;
    }

    for(var i = elements.length; i > (elements.length - lengthi); i--){

        try{

            if(elements[i] != null && elements[i].innerText.length > 0) {


                var marked = markdown(elements[i].innerText, elements[i].id);

                if(marked != null && marked != elements[i].innerText){

                    if(bypassCounter[elements[i].id] == null){
                        bypassCounter[elements[i].id] = 0;
                    }
                    else{

                        if(bypassCounter[elements[i].id] >= 1){
                            bypassElement[elements[i].id] = 1;
                        }
                        bypassCounter[elements[i].id]++;
                    }

                    if(bypassElement[elements[i].id] == null){
                        elements[i].innerHTML = marked;
                        setTimeout(() => scrollDown(), 10)
                    }
                }
            }
        }
        catch (err){
            console.log(err)
        }

    }



    setTimeout(() => updateMarkdownLinks(delay), delay)
}
updateMarkdownLinks(2000)// If markdown didnt get converted, this will

function markdown(msg, msgid){

    try{


        //msg = msg
        //    //.replace(/\*(.*?)*/gim, '<i>$1</i>')
        //    .replace(/__(.*?)__/gim, '<u>$1</u>')
        //    .replace(/`(.*?)`/gim, '<code class="markdown">$1</code>')
        //    .replace(/´´´(.*?)´´´/gim, '<pre class="markdown">$1</pre>')
        //    .replace(/~~(.*)~~/gim, '<del>$1</del>')
        //    .replace(/-(.*)/gim, '<li>$1</li>')
        //    .replace(/**(.*)**/gim, '<b>$1</b>')
        //    //.replace(/\*(.*)\*/gim, '<i>$1</i>');

        if(msg == null){
            return msg;
        }

        try{

            var msgUrls = getUrlFromText(msg);

            msgUrls.forEach(url => {
                if(isURL(url)) {
                    if (isAudio(msg)) {
                        //setTimeout(() => scrollDown(), 10)
                        msg = msg.replace(url, `
                                <div class="iframe-container" id="msg-${msgid}" >
                                    <label>${url.split("/").pop().split("_").pop()}</label>
                                    <div class="audio-embed-container">
                                        <audio controls>
                                            <source src="${url}">
                                        </audio>
                                    </div>
                                </div>
                           `);
                    }
                    else if (isImage(url) == true) {

                        console.log("is image")
                        //setTimeout(() => scrollDown(), 10)
                        msg = msg.replace(url, `<div class="image-embed-container">
                                                    <img class="image-embed" id="msg-${msgid.replace("msg-", "")}" alt="${url}" src="${url}" onerror="this.src = '/img/error.png';" >
                                                </div>`);

                    } else if (isVideo(msg) == true) {
                        console.log("Is video")
                        var code = `<!--<p id="msg-${msgid}"><div class="iframe-container" id="${msgid}" > --><video width="560" height="315" class="video-embed" controls>
                                    <source src="${url}">
                                    </video></div><!--</p>-->`;

                        //setTimeout(() => scrollDown(), 10)

                        msg = msg.replace(url, `<video width="560" height="315" class="video-embed" controls>
                                                    <source src="${url}">
                                                </video></div>`)

                    } else {
                        if (url.toLowerCase().includes("youtube") || url.toLowerCase().includes("youtu.be")) {
                            //setTimeout(() => scrollDown(), 10)

                            console.log("Is yt video")
                            msg = msg.replace(url, createYouTubeEmbed(url, msgid))
                        } else {
                            msg = msg.replace(url, `<a href="${url}" target="_blank">${url}</a>`)
                            //return msg.replaceAll(url, `<a href="${url}" target="_blank">${url}</a>`)
                        }

                    }
                }
            });


        }
        catch (Exce){
            //console.log(Exce)
        }

        return msg;
    }
    catch (Exception){
        //console.log(Exception);
    }
}

// Check if client disconnected
var disconnected = false;
var initConnectionCheck = false;
async function checkConnection(delay) {

    //console.log(socket.connected)

    if(initConnectionCheck == false){
        notify("Connecting...", "info", 1000);

        if(socket.connected == true){
            notify("Connected!", "success", 1000);
            initConnectionCheck = true;
        }
    }
    else{
        if(socket.connected == false && initConnectionCheck == true){
            disconnected = true;
            notify("Connection Lost...", "error", 1000);
        }
        else if(socket.connected == true && initConnectionCheck == true && disconnected == true){
            disconnected = false;
            notify("Successfully reconnected! Reloading...", "success");
            setTimeout(() => window.location.reload(), 2000)
        }
    }



    setTimeout(() => checkConnection(delay), delay)
}
checkConnection(2000)




function mictest(){
    var constraints = { audio: true };
    navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream) {
        var mediaRecorder = new MediaRecorder(mediaStream);

        mediaRecorder.start();

        mediaRecorder.onstart = function(e) {
            //
        };

        mediaRecorder.ondataavailable = async function(e) {
            var blob = new Blob([e.data], { 'type' : 'audio/ogg; codecs=opus' });
            socket.emit("sendVoiceData", {id:getID(), token: getToken(), voice: blob }, function (response) {
                // response
            });
        };


        mediaRecorder.onstop = function(e) {
            //
        };

        // Start recording


        // Stop recording after 5 seconds and broadcast it to server
        setTimeout(function() {
            mediaRecorder.stop()
        }, 10);
    });
}


async function getMedia(constraints) {

    try {
        let stream = null;

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        var blob = new Blob([stream], { 'type' : 'audio/ogg; codecs=opus' });
        socket.emit("sendVoiceData", {id:getID(), token: getToken(), voice: blob }, function (response) {
            // response
        });

        console.log(blob);
        let audio = new Audio();
        audio.srcObject = stream;
        audio.play();


    } catch(err) {
        document.write(err)
    }
}

//getMedia({ audio: true, video: false })


socket.on('receiveVoiceData', function (data) {

    console.log("RE")

    var blob = new Blob([data], { 'type' : 'audio/ogg; codecs=opus' });
    console.log(blob);
    var audio = document.createElement('audio');    // document.createElement('audio')
    audio.src = window.URL.createObjectURL(blob);
    audio.play();

    //data.play();

    /*
    let audio = new Audio();
    audio.srcObject = data;
    audio.play();

     */

});




// Context Menu Stuff
const ContextMenu = document.getElementById("context-menu");
const profile = document.getElementById("context-menu");
var ContextMenuSelectedMessage;

const scope = document.querySelector("body");

scope.addEventListener("click", (event) => {

    const {clientX: mouseX, clientY: mouseY} = event;
    var clickedElement = document.elementFromPoint(mouseX, mouseY);
    var profileContent = document.getElementById("profile_container");



    if(clickedElement.className == "memberlist-member-info" ||
        clickedElement.classList.contains("memberlist-img") ||
        clickedElement.className == "memberlist-container" ||
        clickedElement.className == "message-profile-img" ||
        clickedElement.className == "message-profile-info-name" ||
        clickedElement.className == "memberlist-member-info name" ||
        clickedElement.className == "memberlist-member-info status" ||
        clickedElement.className == "mention"
    ){
        var userid = clickedElement.id;

        if(clickedElement.className == "mention") { userid = userid.replace("mention-", "")}
        getMemberProfile(userid, mouseX, mouseY);
    }
    else if(clickedElement.className.includes("role") && clickedElement.id.split("-")[0] == "addRole"){
        // Open Role Menu

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageMembers" }, function (response) {
            if(response.permission == "granted"){
                showRoleMenu(mouseX, mouseY);
                addRoleFromProfile(clickedElement.id.split("-")[1])
            }
        });
    }
    else if(clickedElement.className.includes("role_color")){
        // Remove role code

    }
    else{

        if(clickedElement.id == "profile-role-menu" ||
            clickedElement.id == "role-menu-header" ||
            clickedElement.id == "role-menu-search-icon" ||
            clickedElement.id == "role-menu-search-input" ||
            clickedElement.id == "role-menu-list" ||
            clickedElement.className == "role-menu-entry" ||
            clickedElement.className == "role-menu-entry-roleName"
        ){
            return;
        }

        profileContent.style.display = "none";
        profileContent.innerHTML = "";

        hideRoleMenu()
    }


});

function showRoleMenu(mouseX, mouseY){
    var roleMenu = document.getElementById("profile-role-menu");
    roleMenu.style.display = "block"
    roleMenu.style.top = `${mouseY - roleMenu.offsetHeight}px`
    roleMenu.style.left = `${mouseX - roleMenu.offsetWidth - 20}px`;
}

function hideRoleMenu(){
    var roleMenu = document.getElementById("profile-role-menu");
    roleMenu.style.display = "none"
}

scope.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    const {clientX: mouseX, clientY: mouseY} = event;
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

    if(//clickedElement.className == "message-profile-content" ||
        clickedElement.className == "message-profile-content-message" ){

        var messageid = getMessageId(clickedElement);

        resetContextMenuItem(ContextMenu);
        /*
        addContextMenuItem(ContextMenu, "Delete All <i>(Buggy)</i>",
            ErrorButtonCode + `onclick="bulkDeleteMessageFromChat('${clickedElement.id}');
            ContextMenu.classList.remove('visible');
            "`);

         */

        addContextMenuItem(ContextMenu, "Delete Message",
            `onclick="deleteMessageFromChat('${clickedElement.id}');
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
    else if(clickedElement.className == "memberlist-member-info" ||
        clickedElement.classList.contains("memberlist-img") ||
        clickedElement.className == "memberlist-container" ||
        clickedElement.className == "message-profile-img" ||
        clickedElement.className == "memberlist-member-info status" ||
        clickedElement.className == "memberlist-member-info name" ||
        clickedElement.className == "message-profile-info-name"
    ){

        try{
            var userid = clickedElement.id;
            console.log("Found userid " + userid);

            resetContextMenuItem(ContextMenu);

            socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "banMember" }, function (response) {
                if(response.permission == "granted"){
                    addContextMenuItem(ContextMenu, "Ban User",
                        ErrorButtonCode + `onclick="banUser('${userid}');
                        ContextMenu.classList.remove('visible');
                        "`);
                }
            });

            socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "kickUsers" }, function (response) {
                if(response.permission == "granted"){
                    addContextMenuItem(ContextMenu, "Kick User",
                        ErrorButtonCode + `onclick="kickUser('${userid}');
                        ContextMenu.classList.remove('visible');
                        "`);
                }
            });

            socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "muteUsers" }, function (response) {
                if(response.permission == "granted"){

                    // check if target user is muted
                    socket.emit("getUserFromId", {id:getID(), token: getToken(), target: userid }, function (response2) {

                        console.log(response2)

                        if(response2.user.isMuted == 1){
                            addContextMenuItem(ContextMenu, "Unmute User",
                                ErrorButtonCode + `onclick="unmuteUser('${userid}');
                            ContextMenu.classList.remove('visible');
                            "`);
                        }
                        else{
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
        catch (e){
            console.log("Could get user id from context menu:");
            console.log(e);
        }
    }
    else if(clickedElement.className == "image-embed"){

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
    else if(clickedElement.id == "channellist" ||
        clickedElement.id == "channeltree"
    ){

        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if(response.permission == "denied") { console.log(response); return; }
            addContextMenuItem(ContextMenu, "Create Category",
                `onclick="
                createCategory();
                ContextMenu.classList.remove('visible');
                "`);

            addContextMenuItem(ContextMenu, "Sort Channels",
                OkButtonCode +    `onclick="
            sortChannels();
            ContextMenu.classList.remove('visible');
            "`);
        });
    }
    else if(clickedElement.className == "categoryTrigger"){

        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if(response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Create Channel",
                `onclick="
                createChannel('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
        });

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if(response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Create Category",
                `onclick="
            createCategory();
            ContextMenu.classList.remove('visible');
            "`);

        });

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if(response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Delete Category",
                ErrorButtonCode + `onclick="
            deleteCategory('${clickedElement.id}');
            ContextMenu.classList.remove('visible');
            "`);
        });
    }
    else if(clickedElement.className == "channelTrigger"){
        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if(response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Create Channel",
                `onclick="
                createChannel('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
        });

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if(response.permission == "denied") { return; }

            addContextMenuItem(ContextMenu, "Edit Channel",
                OkButtonCode + `onclick="
                editChannel('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
        });

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageChannels" }, function (response) {
            if(response.permission == "denied") { return; }

            addContextMenuItem(ContextMenu, "Delete Channel",
                ErrorButtonCode +`onclick="
                deleteChannel('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
        });
    }
    else if(clickedElement.id == "serverlist"){

        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "createGroup" }, function (response) {
            if(response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Create Group",
                `onclick="
                createGroup();
                ContextMenu.classList.remove('visible');
                "`);
        });
    }
    else if(clickedElement.classList.contains("server-icon")){

        resetContextMenuItem(ContextMenu);

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: ["manageServer",
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
            if(response.permission == "denied") { return; }
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

            if(response.permission == "denied") { return; }
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

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "redeemKey" }, function (response) {
            if(response.permission == "denied") { return; }

            addContextMenuItem(ContextMenu, "Redeem Key",
                `onclick="
            redeemKey();
            ContextMenu.classList.remove('visible');
            "`);

        });
    }
    else if(clickedElement.id == "serverbanner-image"){

        resetContextMenuItem(ContextMenu);
        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageServer" }, function (response) {
            if(response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Edit Server",
                `onclick="
                editServer();
                ContextMenu.classList.remove('visible');
                "`);
        });

        socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageGroups" }, function (response) {
            if(response.permission == "denied") { return; }
            addContextMenuItem(ContextMenu, "Change Banner",
                `onclick="
                changeGroupBanner();
                ContextMenu.classList.remove('visible');
                "`);
        });
    }
    else{
        resetContextMenuItem(ContextMenu);
    }

    if((ContextMenu.offsetHeight*4) + mouseY > document.body.offsetHeight){
        ContextMenu.style.top = `${mouseY - ContextMenu.offsetHeight}px`;
        ContextMenu.style.left = `${mouseX}px`;
        console.log("is out of bounds")
    }
    else{
        ContextMenu.style.top = `${mouseY}px`;
        ContextMenu.style.left = `${mouseX}px`;
        console.log("is not out of bounds")
    }


    ContextMenu.classList.add("visible");

});

scope.addEventListener("click", (e) => {

    if (e.target.offsetParent != ContextMenu) {
        ContextMenu.classList.remove("visible");
    }
});

function editGroup(id){
    window.location.href = "/settings/group?id=" + id;
}

function mentionUser(id){
    messageInputBox.value += ` <@${id}> `;
    messageInputBox.focus();
}

function editChannel(channelId){
    window.location.href = "/settings/channel?id=" + channelId;
}

function getMemberProfile(id, x, y){
    //console.log("Requesting profile")
    socket.emit("getMemberProfile", { id: getID(), token: getToken(), target: id, posX: x, posY: y });
}

function editServer(){
    window.location.href = "settings/server/";
}
function sortChannels(){
    window.location.href = "/settings/server/?page=channeltree-sorting";
}

function redeemKey(){
    var catname = prompt("Enter the key you want to redeem");

    if(catname == null ||catname.length <= 0){
        return;
    }
    else{
        socket.emit("redeemKey", { id: getID(), value: catname, token: getToken() });
    }
}

function changeGroupIcon(id){
    var catname = prompt("Group Icon URL:");

    if(catname == null ||catname.length <= 0){
        return;
    }
    else{
        socket.emit("updateGroupIcon", { id: getID(), value: catname, token: getToken(), group: id  });
    }
}

function changeGroupBanner(){
    var catname = prompt("Group Banner URL:");

    if(catname == null ||catname.length <= 0){
        return;
    }
    else{
        socket.emit("updateGroupBanner", { id: getID(), value: catname, token: getToken(), group: getGroup()  });
    }
}

function createGroup(){
    var catname = prompt("Group Name:");

    if(catname == null ||catname.length <= 0){
        return;
    }
    else{
        socket.emit("createGroup", { id: getID(), value: catname, token: getToken() });
    }
}

function openNewTab(url){
    window.open(url, '_blank');
}

function createCategory(){
    var catname = prompt("Category Name:");

    if(catname == null ||catname.length <= 0){
        console.log("No name?")
        return;
    }
    else{
        socket.emit("createCategory", { id: getID(), value: catname, token: getToken(), group: getGroup() });
    }
}


function createChannel(category){
    var catname = prompt("Channel Name:");

    if(catname == null ||catname.length <= 0){
        return;
    }
    else{
        socket.emit("createChannel", { id: getID(), value: catname, token: getToken(), group: getGroup().replace("group-", ""), category: category.replace("category-", "")});
    }
}

function deleteChannel(id){
    console.log(id);
    socket.emit("deleteChannel", { id: getID(), token: getToken(), channelId: id, group: getGroup().replace("group-", "")});
}

function deleteGroup(groupid){
    socket.emit("deleteGroup", { id: getID(), token: getToken(), group: groupid });
}


function deleteCategory(id){
    socket.emit("deleteCategory", { id: getID(), token: getToken(), group: getGroup(), category: id});
}

function getMessageId(element){

    if(element.className != "message-profile-content-message-appended"){
        var entireElement = null;
        element = element.closest(".message-container");
        return element.id;
    }
    else{
        return element.id;
    }


}

function resetContextMenuItem(element){
    element.innerHTML = "";
}

function addContextMenuItem(element, displayname, onclick = ""){
    var code = `<div class="item" ${onclick}>${displayname}</div>`;
    element.innerHTML += code;
}



function kickUser(id){
    var reason = prompt("Reason: (empty for none)");
    socket.emit("kickUser", { id: getID(), token: getToken(), target: id, reason: reason });
}

function banUser(id){
    var reason = prompt("Reason: (empty for none)");
    var duration = prompt("Duration in days: (empty for permanent)");
    socket.emit("banUser", { id: getID(), token: getToken(), target: id, reason: reason, time: duration });
}

function muteUser(id){
    var reason = prompt("Reason: (empty for none)");
    var duration = prompt("Duration in minutes: (empty for permanent until unmuted)");
    socket.emit("muteUser", { id: getID(), token: getToken(), target: id, reason: reason, time: duration });
}

function unmuteUser(id){
    socket.emit("unmuteUser", { id: getID(), token: getToken(), target: id });
}

function getChannelTreeSocket(){
    socket.emit("getChannelTree", { id: getID() , token: getToken(), username: getUsername(), icon: getPFP(), group: getGroup() }, function (response) {
        channeltree.innerHTML = response.data;

        try{
            document.querySelector("div #channeltree #channel-" + getChannel()).style.color = "white";
            document.querySelector("div #channeltree #category-" + getCategory()).style.color = "white";

            var markedMessage3 = [];
            markedMessage3= getCookie("unmarkedMessages");

            //console.log(markedMessage3);
        }
        catch(Ex){
            //console.log(Ex)
        }
    });
}

function userJoined(){
    if(getUsername() != null) {
        var username = getUsername();

        socket.emit("userConnected", { id: getID(), name: username, icon: getPFP(), status: getStatus(), token: getToken(),
            aboutme: getAboutme(), banner: getBanner()});

        socket.emit("setRoom", { id: getID(), room: getRoom(), token: getToken()});
        socket.emit("getGroupBanner", { id: getID(), token: getToken() , username: getUsername(), icon: getPFP(), group: getGroup() });
        socket.emit("getGroupList", { id: getID() , group: getGroup(), token: getToken(), username: getUsername(), icon: getPFP() });
        socket.emit("getMemberList", { id: getID() , token: getToken(), channel: getChannel(), group: getGroup(), username: getUsername(), icon: getPFP() });
        getChannelTreeSocket()
        socket.emit("getCurrentChannel", { id: getID() , token: getToken(), username: getUsername(), icon: getPFP(), group: getGroup(), category: getCategory(), channel: getChannel() });
        socket.emit("setRoom", { id: getID(), room: getRoom(), token: getToken()});

        getServerInfo();

        getChatlog();

        /*
        try{
            var url = window.location.search;
            var urlParams = new URLSearchParams(url);
            console.log(url);

            var currentGroup = urlParams.get("group");
            var currentChannel = urlParams.get("channel");
            var currentCategory = urlParams.get("category");
        }

         */
    }
    else{
        console.log("gay")
    }
}

window.onunload = (event) => {
    socket.emit("userDisconnected", { id: getID(), time: new Date().getTime() });
};

function setTyping(){
    socket.emit("isTyping", { id: getID(), token: getToken(), room: getRoom() });


    clearTimeout(typetimeout);
    typetimeout = setTimeout(() => {

        socket.emit("stoppedTyping", { id: getID(), token: getToken(), room: getRoom() });

    }, 2 * 1000);


}

function getRoom(){
    return getUrlParams("group") + "-" + getUrlParams("category") + "-" + getUrlParams("channel");
}

function getUrlParams(param){
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}

function changeUsername(){
    var username = prompt("What should your new username be?", getUsername());

    if(username.length > 0){
        setCookie("username", username, 360);
        updateUsernameOnUI(username, true);
    }
    else{
        alert("Your username was too short");
    }
}

function changeStatus(){
    var status = prompt("What should your new status be?", getStatus());

    if(status.length > 0){
        setCookie("status", status, 360);
        updateStatusOnUI(status, true);
    }
    else{
        alert("Your status was too short");
    }
}

function changePFP(){
    var pfp = prompt("Enter the url of your new pfp", getPFP());

    if(pfp.length > 0){
        setCookie("pfp", pfp, 360);
        updatePFPOnUI(pfp, true);

        console.log("Letting Server know pfp changed");
    }
    else{

        var reset = confirm("Your pfp url was too short. Want to reset your pfp?");

        if(reset){
            pfp = "/img/default_pfp.png";
            setPFP(pfp);
        }
        else{
            return;
        }
    }

    if(pfp == null || isImage(pfp) == false){
        pfp = "https://wallpapers-clan.com/wp-content/uploads/2022/05/cute-pfp-25.jpg";
    }

    setCookie("pfp", pfp, 360);
    updatePFPOnUI(pfp, true);
}

function updateUsernameOnUI(username, sync = false){
    document.getElementById("profile-qa-info-username").innerText = username;

    if(sync == true){
        socket.emit("setUsername", { id: getID() , username: getUsername(), icon: getPFP() });
    }

}

function updateStatusOnUI(status, sync = false){
    document.getElementById("profile-qa-info-status").innerText = status;

    if(sync == true){
        socket.emit("setStatus", { id: getID() , username: getUsername(), icon: getPFP(), status: getStatus() });
    }
}

function updatePFPOnUI(url, sync = false){
    document.getElementById("profile-qa-img").src = url;

    if(sync == true){
        socket.emit("setPFP", { id: getID() , username: getUsername(), icon: getPFP() });
    }
}

function getChatlog(){
    socket.emit("getChatlog", { id: getID(), token: getToken(), group: getGroup(), category: getCategory(), channel: getChannel()});
}

function createYouTubeEmbed(url, messageid){

    var videocode = url.replace("https://www.youtube.com/watch?v=", "").replaceAll(" ", "");
    if (url.toLowerCase().includes("youtube")) {
        videocode = url.replace("https://www.youtube.com/watch?v=", "").replaceAll(" ", "");
    }
    else if(url.toLowerCase().includes("youtu.be")){
        videocode = url.replace("https://youtu.be/", "").replaceAll(" ", "");
    }

    var code = `<p id="msg-${messageid}"><div class="iframe-container" id="msg-${messageid}" ><iframe width="560" height="315" src="https://www.youtube.com/embed/${videocode}" 
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
function isImage(url){

    const img = new Image();

    /*
    if(notAImage.includes(url)){
        console.log("Not a Image")
        return false;
    }

    if(validImage.includes(url)){
        return true;
    }

     */

    //console.log("checking link " + url)

    img.src = url;


    if(img.height > 0 && img.width > 0){
        if(validImage.includes(url) == false){
            validImage.push(url);
        }


        return true;
    }
    else{

        // Try to load a image 6 times
        if(notAImage.includes(url) == false && notAImageCount[url] > 6){
            notAImage.push(url);
        }

        notAImageCount[url]++;
        return false;
    }
}

function isAudio(url) {
    return /\.(mp3|wav|ogg)$/.test(url);
}

function isVideo(url) {


    return /\.(mp4|webp)$/.test(url);
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

function getUrlFromText(text){
    var geturl = new RegExp(
        "(^|[ \t\r\n])((ftp|http|https|mailto|file):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
        ,"g"
    );
    return text.match(geturl)
}

var isValidUrl = []
function isURL(text){
    try {

        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol == "data:";


    } catch (err) {
        return false;
    }
}

function generateMetaTags(){
    getServerInfo();

    if(getGroup() != null && getCategory() != null && getChannel() != null){
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

function getGroup(){

    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get("group");

    if(urlChannel == null){
        return "0";
    }
    else{
        return urlChannel;
    }
}

function getCategory(){

    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get("category");

    if(urlChannel == null){
        return null;
    }
    else{
        return urlChannel;
    }
}

function getChannel(){

    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get("channel");

    if(urlChannel == null){
        return null;
    }
    else{
        return urlChannel;
    }
}

function getToken(){
    var token = getCookie("token");

    if(token == null || token.length <= 0){
        return null;
    }
    else{
        return token;
    }
}

function getID(){
    var id = getCookie("id");

    if(id == null || id.length != 12){
        id = generateId(12);
        setCookie("id", id, 360);
        return id;
    }
    else{
        return id;
    }
}

function getPFP(){
    var pfp = getCookie("pfp");

    if(pfp == null || pfp.length <= 0){
        pfp = prompt("Please enter the url to your profile picture.");

        if(pfp.length <= 0){
            pfp = "/img/default_pfp.png";
        }
        setCookie("pfp", pfp, 360);
        updatePFPOnUI(pfp);
        return pfp;
    }

    updatePFPOnUI(pfp);
    return pfp;
}

function getStatus(){
    var status = getCookie("status");

    if(status == null || status.length <= 0){
        setCookie("status", "Hey im new!", 360);
        updateStatusOnUI(status);
        return status;
    }
    else{
        updateStatusOnUI(status);
        return status;
    }
}

function getUsername(){
    var username = getCookie("username");

    if(username == null || username.length <= 0){
        username = prompt("Whats your username?");

        if(username.length > 0){
            setCookie("username", username, 360);
            updateUsernameOnUI(username);
            return username;
        }
    }
    else{
        updateUsernameOnUI(username);
        return username;
    }
}

function getAboutme(){
    var aboutme = getCookie("aboutme");

    if(aboutme == null || aboutme.length <= 0){

        return "";
    }
    else{
        //updateUsernameOnUI(aboutme);
        return aboutme;
    }
}

function getBanner(){
    var banner = getCookie("banner");

    if(banner == null || banner.length <= 0){
        return "";
    }
    else{
        //updateUsernameOnUI(aboutme);
        return banner;
    }
}

var lastKey = "";
var test = 0;
var testrun = 0;
function sendMessage(messagebox) {

    //console.log(event.keyCode)


    if(event.keyCode != 13){
        lastKey = event.keyCode;
    }

    /*
    if(event.keyCode == 8){

    }
    */

    // Adding new line
    if(event.keyCode == 13 && lastKey == 16 && testrun < 6){
        //document.getElementById("messagebox").style.height = `calc(${document.getElementById("messagebox").offsetHeight}px + 5px) !important;`

        /*document.getElementById("messagebox").offsetHeight +*/

        if(test == 0){
            test = 44;
        }
        else{
            test += 22;
        }

        testrun++;

        // Resize message box container
        document.getElementById('messagebox').setAttribute("style",
            `
            height: calc(${test}px - 4px) !important;
            margin-top: -${test}px !important;
        `);


        // Resize message box input
        // height: calc(${messageInputBox.offsetHeight}px + 10px) !important;
        messageInputBox.setAttribute("style",
            `
               height: calc(100% - 4px)!important;                   
               margin-top: 0.01px !important;
               padding-bottom: 4px !important;               
               overflow-y: auto;
        `);
        /*
            height: calc(${messageInputBox.offsetHeight}px + 2px ) !important;
            margin-top: -16px !important;
            margin-bottom: -6px !important;
            padding: 0 !important;
         */


        //document.getElementById("messagebox").style.marginTop = `-40px !important`;
    }

    if(event.keyCode == 37 || event.keyCode == 38 ||
        event.keyCode == 39 || event.keyCode == 40){
        return;
    }

    if(event.keyCode == 13 && lastKey != 16) {
        sendMessageToServer(getID(), getUsername(), getPFP(), messagebox.value);
        messagebox.value = "";

        messageInputBox.setAttribute("style",
            `
                padding: 8px;
                height: calc(20px - 3px);
                width: calc(100% - 32px - 40px - 25px - 5px);        
                margin: -6px 8px 0 8px;
                overflow-y: hidden;
        `);


        // Resize message box container
        document.getElementById('messagebox').setAttribute("style",
            `
            height: calc(22px);
            width: calc(100% - 16px - 16px);
    
        `);

        setTimeout(() => {
            messageInputBox.value = ""
        }, 10);

        test = 0;
        testrun = 0;

        socket.emit("stoppedTyping", { id: getID(), token: getToken(), room: getRoom() });
    }


    if(messagebox.value != ""){
        setTyping();
    }

}

function sendMessageToServer(authorId, authorUsername, pfp, message){

    if(getGroup() == null || getGroup().length <= 0 || getCategory() == null || getCategory().length <= 0 || getChannel() == null || getChannel().length <= 0){
        notify("Please select a channel first", "warning", null, "normal");
        //alert("Please select any channel first");
        return;
    }

    socket.emit("messageSend", { id: authorId, name: authorUsername, icon: pfp, token: getToken(),
        message: message, group: getGroup(), category: getCategory(),
        channel: getChannel(), room: getRoom()  });
}

function resolveMentions(){
    var mentions = document.querySelectorAll("label.mention")

    if(mentions.length <= 0){
        return;
    }

    mentions.forEach(mention => {
        var userId = getID();

        if(mention.id.replace("mention-", "") == userId){
            mention.parentNode.style.backgroundColor = "rgba(255, 174, 0, 0.12)";
            //mention.parentNode.style.borderRadius = "6px";
            mention.parentNode.style.borderLeft = "3px solid rgba(255, 174, 0, 0.52)";
            mention.parentNode.style.marginTop = "0px";
            mention.parentNode.style.width =  "calc(100% - 8px)";
        }
        else{
            mention.style.backgroundColor = "transparent";
        }

    })
}

function convertMention(text, playSoundOnMention = false){

    try{
        var doc = new DOMParser().parseFromString(text.message, "text/html").querySelector("label")
        var userId = getID();

        if(doc.id.replace("mention-", "") == (userId)){

            if(playSoundOnMention == true)
            {
                //console.log("PLayed message sound");
                //console.log(playSoundOnMention)
                playSound("message", 0.5);
            }
        }

    }
    catch (exe){
        //console.log(exe)
    }
}

socket.on('messageCreate', function (message) {
    message.message = markdown(message.message, message.messageId);

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var messagecode = `<div class="message-container" id="${message.messageId}">
            <div class="message-profile-img-container">
                <img class="message-profile-img" src="${message.icon}"  id="${message.id}" onerror="this.src = '/img/default_pfp.png';">
            </div>

            <div class="message-profile-info" id="${message.id}">
                <label class="message-profile-info-name"  id="${message.id}" style="color: ${message.color};">${message.name}</label>
                <label class="timestamp">${new Date(message.timestamp).toLocaleString("narrow")}</label>
           </div>
            <div class="message-profile-content" id="${message.timestamp}">
                <p class="message-profile-content-message" id="msg-${message.messageId}">
                    ${message.message.replaceAll("\n", "<br>")}
                </p>
            </div>
        </div>`;


    var childDivs = document.getElementById("content").lastElementChild;

    if(childDivs != null){

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

        if(messagecontent[0] == null){
            addToChatLog(chatlog, messagecode);
            return;
        }

        // Calculate time passed
        var lastMessage = messagecontent[0].id / 1000;

        var today = new Date().getTime() / 1000;
        var diff = today - lastMessage;
        var minutesPassed = Math.round(diff / 60);

        //console.log("Past: " + minutesPassed + " minutes");

        if(authorDivs[0].id == message.id && minutesPassed < 5){
            messagecontent[0].insertAdjacentHTML("beforeend",
                `<p class="message-profile-content-message" id="msg-${message.messageId}">${message.message.replaceAll("\n", "<br>")}</p>`
                //`<p class="message-profile-content-message-appended" id="msg-${message.messageId}">${message.message}</p>`
            );
        }
        else{
            addToChatLog(chatlog, messagecode);
        }
    }
    else{
        addToChatLog(chatlog, messagecode);
    }

    convertMention(message, true)
    resolveMentions();
    scrollDown();
});


function getLastMessage(time = false){
    var childDivs = document.getElementById("content").lastElementChild;

    if(childDivs != null) {


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

        if(messagecontent[0] == null){
            return;
        }

        // Calculate time passed
        var lastMessage = messagecontent[0].id / 1000;

        var today = new Date().getTime() / 1000;
        var diff = today - lastMessage;
        var minutesPassed = Math.round(diff / 60);

        if(time == true){
            return messagecontent[0].id;
        }
        else{
            return messagecontent[0];
        }
    }
}

function compareTimestamps(stamp1, stamp2){
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
        '            <p>User <label class="systemAnnouncementChatUsername">' + author.username + '</label> joined the chat!</p>' +
        '        </div>';

    addToChatLog(chatlog, message);
    scrollDown();
});

socket.on('updateGroupList', function (author) {

    getGroupList();
});

function deleteMessageFromChat(id){

    socket.emit("deleteMessage", { id: getID(), token: getToken(), messageId: id.replace("msg-", ""),
        group: getGroup(), category: getCategory(), channel: getChannel() });
}

function bulkDeleteMessageFromChat(id){


    //var children = [].slice.call(document.getElementById(id));
    var children = null;

    try{
        console.log("Trying to get parentnode.")
        children = document.querySelector(`#${id} p`).parentNode;
    }
    catch{
        console.log("Trying fallback parentnode")
        children = document.querySelector(`#${id}`).parentNode;
    }

    //console.log("Child")
    //console.log(children)
    children = children.querySelector("p");
    console.log(children)

    for (var i = 0; i < children.length; i++) {
        //console.log(children[i]); //second console output

        socket.emit("deleteMessage", { id: getID(), token: getToken(), messageId: children[i].id.replace("msg-", ""),
            group: getGroup().replace("group-", ""), category: getCategory().replace("category-", ""), channel: getChannel().replace("channel-", "") });

    }
}

socket.on('receiveDeleteMessage', function (id) {

    console.clear();

    //var parent = document.querySelector(`#msg-${CSS.escape(id)}`);
    //parent.remove();
    //var container = document.querySelector(`.message-container #${id}`).parentNode.parentNode;
    //console.log(container)

    console.log(`Deleting from chat #msg-${id}`)
    console.log(`Scanning for #msg-${id}`)
    //var parent = document.querySelector(`#msg-${id} p`).parentNode.parentNode;


    // document.querySelector(`#msg-152598637369 p`).parentNode;
    var message = document.querySelectorAll(`div .message-profile-content #msg-${id}`);
    var parentContainer = message[0].parentNode.parentNode;
    var parent = message[0].parentNode;


    console.log("Message is:")
    console.log(message)
    message.forEach(msg => {
        msg.remove();
    });

    console.log("parent: ")
    console.log(parent)
    console.log(parent.children.length)

    if(parentContainer.querySelector(".message-profile-content-message") == null){
        parentContainer.remove();
    }


});

socket.on('memberTyping', function (members) {

    var runner = 0;
    var displayUsersText = "";

    if(members.length <= 0){
        typingIndicator.innerText = "";
        typingIndicator.style.display = "none";
        return;
    }

    if(members.length == 1){
        displayUsersText += members[0] + " is typing...";
    }
    else if(members.length == 2){
        displayUsersText += members[0] + " and " + members[1] + " are typing...";
    }
    else{
        members.forEach(member => {

            // Show multiple typing
            if(runner <= 2){
                displayUsersText += member + ", ";
            }
            runner++;
        });
    }

    if(runner > 2){
        displayUsersText += " and " + members.length - 2 + " users are typing";
    }

    typingIndicator.innerText = displayUsersText;
    typingIndicator.style.display = "block";
});

socket.on('receiveChannelTree', function (data) {

    getChannelTreeSocket();
    return;

    channeltree.innerHTML = data;
    try{
        document.querySelector("div #channeltree #channel-" + getChannel()).style.color = "white";
        document.querySelector("div #channeltree #category-" + getCategory()).style.color = "white";

        var markedMessage3 = [];
        markedMessage3 = getCookie("unmarkedMessages");

        console.log(markedMessage3);
    }
    catch(Ex){
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

socket.on('receiveChatlog', function (data) {


    if(data == null){
        console.log("Data was null history")
        return;
    }

    var previousMessageID = 0;
    data.forEach(message => {

        if(message.id == "0"){
            var message = `<div class="systemAnnouncementChat">
                                <p><label class="systemAnnouncementChatUsername">${message.name}</label> joined the server!</p>
                                </div>`;

            document.getElementById("content").insertAdjacentHTML("beforeend", message);
            scrollDown();
        }
        else{
            if(compareTimestamps(message.timestamp, getLastMessage(true)) <= 5
                && previousMessageID == message.id
            ){
                message.message = markdown(message.message, message.messageId);

                getLastMessage().insertAdjacentHTML("beforeend", `<p class='message-profile-content-message' id="msg-${message.messageId}">${message.message}</p>`);
                //getLastMessage().insertAdjacentHTML("beforeend", `<p class='message-profile-content-message-appended' id="msg-${message.messageId}">${message.message}</p>`);
                previousMessageID = message.id;

            }
            else{
                message.message = markdown(message.message, message.messageId);
                showMessageInChat(message)
                previousMessageID = message.id;
            }
        }


    });

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
    try{
        if(channel.name == null){
            channel.name = "";
        }
        setChannelName(channel.name);
    }
    catch{
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
    var winHeight= window.innerHeight;

    // If is out of bounds

    /*
    console.log(winHeight)
    console.log(data.top);
    console.log(profileContent.offsetHeight);
    console.log((profileContent.offsetHeight - data.top));

     */

    if((data.top + profileContent.offsetHeight) <= winHeight){
        profileContent.style.top = `${data.top}px`;
        //console.log("first");
    }
    else{
        if(data.top + profileContent.offsetHeight > winHeight){
            profileContent.style.top = `${data.top - ((data.top + profileContent.offsetHeight) - winHeight) - 20}px`;
            //console.log("second");
        }
        else{
            profileContent.style.top = `${data.top - (winHeight - profileContent.offsetHeight)}px`;
            //console.log("second");
        }

    }

    // If X out of bounds
    if((data.left + profileContent.offsetWidth) < winWidth){
        profileContent.style.left =  `${data.left + 20}px`;
    }
    else{
        profileContent.style.left =  `${data.left - 20 - profileContent.offsetWidth}px`;
    }



});

socket.on('receiveMemberList', function (data) {
    memberlist.innerHTML = data;
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
    setActiveGroup(getGroup());
});


socket.on('newMemberJoined', function (author) {

    // <p>User <label class="systemAnnouncementChat username">' + author.username + '</label> joined the chat!</p>' +
    var message = '<div class="systemAnnouncementChat">' +
        '            <p><label class="systemAnnouncementChatUsername">' + author.name + '</label> joined the server!</p>' +
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
    ) ;
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

    console.log(data);

    var buttonArray = [];
    Object.keys(data.buttons).forEach(function(button) {

        var buttonText = data.buttons[button].text;
        var buttonEvents = data.buttons[button].events;

        buttonArray.push([buttonText.toLowerCase(), buttonEvents])
    });

    for(let i = 0; i < data.buttons.length; i++){
        console.log("button : " + data.buttons[i])
    }

    console.log(buttonArray);

    Confirm(data.title, data.message, "info", buttonArray, "confirm").then(result => {

        console.log(result);
    })
});

function setActiveGroup(group){
    if(group == null){
        return;
    }
    document.getElementById(group).classList.add('selectedGroup');
}

function addRoleFromProfile(userId){
    socket.emit("getAllRoles", {id:getID(), token: getToken(), group: getGroup(), targetUser: userId }, function (response) {
        console.log(response)

        var roleList = document.getElementById("profile-role-menu").querySelector("#role-menu-list");
        roleList.innerHTML = "";

        var roles = response.data
        Object.keys(roles).forEach(function (role) {

            var roleObj = roles[role]

            console.log(roleObj)
            var roleId = roleObj.info.id;
            var roleName = roleObj.info.name;
            var roleColor = roleObj.info.color;
            var hasRole = roleObj.info.hasRole;

            var displayChecked = "";
            if(hasRole == 1){
                displayChecked = "checked";
            }
            else{
                displayChecked = "";
            }

            roleList.insertAdjacentHTML("beforeend", `<div class="role-menu-entry" onclick="checkCheckedRoleMenu(this.querySelector('input'))">
                        <input type="checkbox" ${displayChecked} class="role-menu-entry-checkbox" id="role-menu-entry_${roleId}_${userId}" onclick="checkCheckedRoleMenu(this)">
                        <label style="color: ${roleColor};" class="role-menu-entry-roleName">${roleName}</label>
                    </div>`)
        });

    });
}

function checkCheckedRoleMenu(element){
    socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageMembers" }, function (response) {
        if(response.permission == "granted"){
            element.checked = !element.checked;
            var roleId = element.id.split("_")[1];
            var userId = element.id.split("_")[2];

            if(element.checked == true){
                // Assign role
                socket.emit("addUserToRole", {id:getID(), token: getToken(), role: roleId, target: userId }, function (response) {

                    if(response.type != "success"){
                        notify(response.type, response.msg)
                    }
                });
            }
            else{
                // Remove role
                socket.emit("removeUserFromRole", {id:getID(), token: getToken(), role: roleId, target: userId }, function (response) {
                    if(response.type != "success"){
                        notify(response.type, response.msg)
                    }
                });
            }
        }
    });
}

function showModal(data){
    var modalBox = document.getElementById("modalBox");
    var modalBoxTitle = document.getElementById("modalBoxTitle");
    var modalBoxText = document.getElementById("modalBoxText");
    var modalBoxButtons = document.getElementById("modalBoxButtons");

    var BodyBlur = document.getElementsByTagName('BODY')[0];;
    // filter: blur(3px);
    // transform: translateZ(0);

    //BodyBlur.style.filter = "blur(4px)";
    //BodyBlur.style.transform = "translateZ(0)";


    modalBox.removeAttribute("filter");
    modalBoxTitle.removeAttribute("filter");
    modalBoxText.removeAttribute("filter");

    modalBox.style.display = "block";
    modalBoxButtons.innerHTML = "";
    modalBoxTitle.innerText = data.title.replaceAll("#", "\n");
    modalBoxText.innerText = data.message.replaceAll("#", "\n");


    if(data.buttons != null){

        Object.keys(data.buttons).forEach(function(button) {

            var buttonText = data.buttons[button].text;
            var buttonEvent = data.buttons[button].events;

            modalBoxButtons.insertAdjacentHTML("beforeend", `<button ${buttonEvent}>${buttonText}</button>`)
        });
    }

    if(data.token != null){
        setCookie("token", data.token, 365);
    }
}

function closeModal(){
    var modalBox = document.getElementById("modalBox");
    var modalBoxTitle = document.getElementById("modalBoxTitle");
    var modalBoxText = document.getElementById("modalBoxText");

    modalBox.style.display = "none";
    modalBoxTitle.innerText = "";
    modalBoxText.innerText = "";
}

function importToken(){
    var token = prompt("Please paste your exported token here.")

    if(token.length != 48){
        alert("This token was invalid. If you forgot your token please contact the server admin");
        return;
    }

    else{
        alert("Token successfully set!\nPlease save it if you havent already");
        setCookie("token", token, 365);
    }
}

function resetAccount(){
    var reset = confirm("Do you really want to reset your account? EVERYTHING will be reset.")

    if(reset){
        setCookie("id", null, 365);
        setCookie("username", null, 365);
        setCookie("status", null, 365);
        setCookie("pfp", null, 365);
        setCookie("token", null, 365);
        setCookie("banner", null, 365);

        alert("Your account has been reset. Please refresh the page if you want to continue");
    }
}



document.getElementById("message-actions").onclick = function(e) {
    // e = Mouse click event.
    //var rect = e.target.getBoundingClientRect();
    //var x = e.clientX - rect.left; //x position within the element.
    //var y = e.clientY - rect.top;  //y position within the element.
    //console.log("Left? : " + x + " ; Top? : " + y + ".");

    var x = e.clientX;
    var y = e.clientY;

    var emojiBox = document.getElementById("emoji-box-container");

    var clickedElement = document.elementFromPoint(x, y)

    if(clickedElement.id != "message-actions-image" ){
        return;
    }

    if(emojiBox.style.display == "block"){
        closeEmojiBox();
    }
    else{
        emojiBox.style.display = "block";
        selectEmojiTab(document.getElementById("emoji-box-emojis"))
        getEmojis()

        var test = document.getElementById("message-actions-image");



        /*
        console.log(emojiBox.offsetHeight)
        emojiBox.style.top = ((test.style.top + (emojiBox.offsetHeight * 2)) - 60) + "px";
        emojiBox.style.left = ((test.style.left + emojiBox.offsetWidth * 3.1) + "px");

         */


        emojiBox.style.top = (y - emojiBox.offsetHeight - 40) + "px";
        emojiBox.style.left = x -  emojiBox.offsetWidth +"px";
    }
}

window.addEventListener('resize', function(event){
    // do stuff here

    var emojiContainer = document.getElementById("emoji-box-container");
    var profileContainer = document.getElementById("profile_container");

    if(emojiContainer.style.display == "block"){
        //emojiContainer.style.display = "none";
        closeEmojiBox()
    }
    if(profileContainer.style.display == "block"){
        profileContainer.style.display = "none";
    }
});

document.addEventListener("keydown", (event) => {
    var emojiContainer = document.getElementById("emoji-box-container");
    var profileContainer = document.getElementById("profile_container");

    if(event.key == "Escape"){
        if(emojiContainer.style.display == "block"){
            //emojiContainer.style.display = "none";
            closeEmojiBox();
        }
        if(profileContainer.style.display == "block"){
            profileContainer.style.display = "none";
        }
    }


});

var gifSearchbarInput = document.getElementById("gif-searchbar-input");
// Execute a function when the user presses a key on the keyboard
gifSearchbarInput.addEventListener("keypress", function(event) {
    // If the user presses the "Enter" key on the keyboard

    if (event.key === "Enter") {

        var emojiEntryContainer = document.getElementById("emoji-entry-container");
        emojiEntryContainer.innerHTML = "";

        // socket.emit

        socket.emit("searchTenorGif", { id:getID(), token: getToken(), search: gifSearchbarInput.value }, function (response) {

            if(response.type == "success") {
                console.log("Tenor Response");
                console.log(response)
            }
            else{
                notify(response.msg, "error")
            }
        });

        //searchTenor(gifSearchbarInput.value);
    }
});

function selectEmojiTab(element){
    var parentnode = element.parentNode.children;
    console.log(parentnode)

    for(let i = 0; i < parentnode.length; i++){
        if(parentnode[i].classList.contains("SelectedTab")){
            parentnode[i].classList.remove("SelectedTab");
        }
    }

    element.classList.add("SelectedTab");
}

function sendGif(url){

    if(document.getElementById("messagebox-content").value.replaceAll(" ", "").length >= 1){
        sendMessageToServer(getID(), getUsername(), getPFP(), document.getElementById("messagebox-content").value);
    }

    sendMessageToServer(getID(), getUsername(), getPFP(), url);

    closeEmojiBox();
}

function closeEmojiBox(){
    var emojiContainer = document.getElementById("emoji-box-container");
    emojiContainer.style.display = "none";

    var gifSearchbarInput = document.getElementById("gif-searchbar-input");
    gifSearchbarInput.value = "";

    var emojiEntryContainer = document.getElementById("emoji-entry-container");
    emojiEntryContainer.innerHTML = "";

    var emojiTab = document.getElementById("emoji-box-emojis");
    var gifTab = document.getElementById("emoji-box-gifs");

    try{
        emojiTab.classList.add("SelectedTab");
        gifTab.classList.remove("SelectedTab");
    }
    catch(e){ console.log(e) }
}


function changeGIFSrc(url, element){
    element.src = url;
}


function getGifs(){

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

    socket.emit("getEmojis", { id:getID(), token: getToken() }, function (response) {

        if(response.type == "success"){
            //settings_icon.value = response.msg;
            //emojiContainer.innerHTML = "<div id='emoji-box-header'><h2>Emojis</h2></div>";



            emojiEntryContainer.innerHTML = "";
            response.data.forEach(emoji =>{

                var emojiId = emoji.split("_")[1];
                var emojiName = emoji.split("_")[2].split(".")[0];


                var code = `
                    <div class="emoji-entry" title="${emojiName}" onclick="
                              document.getElementById('messagebox-content').value += ' :${emojiName}: ';
                              document.getElementById('emoji-box-container').style.display = 'none';
                              document.getElementById('messagebox-content').focus();">
                        <div class="emoji-img">
                            <img class="emoji" src="/emojis/${emoji}">
                        </div>
                    </div>`


                emojiEntryContainer.insertAdjacentHTML("beforeend", code);
            })

            //notify(response.msg)
        }
        else{
            notify(response.msg, "error")
        }

        //console.log(response);
    });
}


function exportCookies(){
    var cookieData = document.cookie.split(';').map(function(c) {
        var i = c.indexOf('=');
        return [c.substring(0, i), c.substring(i + 1)];
    });

    copy(JSON.stringify(JSON.stringify(cookieData)));
}

function importCookies(data){
    var cookieData = JSON.parse(data);
    cookieData.forEach(function (arr) {
        document.cookie = arr[0] + '=' + arr[1];
    });
}

function setUser(username){
    setCookie("username", username, 360);
    updateUsernameOnUI(username);
}

function setBanner(banner){
    setCookie("banner", banner, 360);
}

function setStatus(status){
    setCookie("status", status, 360);
    updateUsernameOnUI(status);
}

function setPFP(pfp){
    setCookie("pfp", pfp, 360);
    updateUsernameOnUI(pfp);
}

function setAboutme(aboutme){
    setCookie("aboutme", aboutme, 360);
    updateUsernameOnUI(aboutme);
}

socket.on('receiveGroupBanner', function (data) {
    groupbanner.src = data;
});


function refreshValues(){
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

    socket.emit("setRoom", { id: getID() , username: getUsername(), icon: getPFP(), room: getRoom(), token: getToken() });
    getGroupList();
    getMemberList();
    getChannelTreeSocket()
    socket.emit("getCurrentChannel", { id: getID() , username: username, icon: getPFP(), group: getGroup(), category: getCategory(), channel: getChannel(), token: getToken() });
}

function getMemberList(){
    socket.emit("getMemberList", { id: getID() , username: getUsername(), icon: getPFP(), token: getToken(), channel: getChannel() });
}

function getGroupList(){
    socket.emit("getGroupList", { id: getID() , group: getGroup(), username: getUsername(), icon: getPFP(), token: getToken() });
    getGroupBanner();
}

function getGroupBanner(){
    socket.emit("getGroupBanner", { id: getID() , username: getUsername(), icon: getPFP(), group: getGroup(), token: getToken() });
}

var serverName;
var serverDesc;
function getServerInfo(returnData = false){
    socket.emit("getServerInfo", {id:getID(), token: getToken() }, function (response) {

        var headline = document.getElementById("header");

        servername = response.name;
        serverdesc = response.description;

        headline.innerHTML = `${servername} - ${serverdesc}`;
    });
}

function setUrl(param){

    window.history.replaceState(null, null, param); // or pushState
    chatlog.innerHTML = "";

    document.getElementById("messagebox-content").focus();

    refreshValues();
}

function setChannelName(name){
    document.getElementById("channelname").innerText = name;
}

function getRoles(){
    socket.emit("RequestRoles", { id: getID(), username: getUsername(), pfp: getPFP() });
}

function generateId(length) {
    let result = '1';
    const characters = '0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length-1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

function addToChatLog(element, text){
    //text = markdown(text, null);
    element.insertAdjacentHTML('beforeend', text);
    scrollDown();
}

function scrollDown(){
    var objDiv = document.getElementById("content");
    objDiv.scrollTop = objDiv.scrollHeight;
}



function upload(files) {
    socket.emit("fileUpload", {file: files, filename: files.name, id:getID(), token: getToken() }, function (response) {

        if(response.type == "success"){
            //notify(response.msg, "success")
            console.log(response);

            //console.log(`sending  ${window.location.origin + response.msg}`)
            sendMessageToServer(getID(), getUsername(), getPFP(), window.location.origin + response.msg);
        }
        else{
            notify(response.msg, "error", null, "normal")
        }
    });
}


var uploadObject = document.getElementById('content');
uploadObject.addEventListener('drop', function (e) {
    // Code for upload file here
    e.preventDefault()
    uploadObject.style.backgroundColor = '#36393F';

    var file = e.dataTransfer.files[0]
    var fileSize = file.size / 1024 / 1024;
    console.log(`Size: ${fileSize.toFixed(2)} MB`);

    upload(file);

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
    uploadObject.style.backgroundColor = '#36393F';
}, false);







function showMessageInChat(message) {


    message.message = markdown(message.message, message.messageId)

    var messagecode = `<div class="message-container" id="msg-${message.messageId}">
            <div class="message-profile-img-container">
                <img class="message-profile-img" src="${message.icon}" id="${message.id}" onerror="this.src = '/img/default_pfp.png';">
            </div>

            <div class="message-profile-info" id="${message.id}">
                <label class="message-profile-info-name" id="${message.id}" style="color: ${message.color};">${message.name}</label>
                <label class="timestamp">${new Date(message.timestamp).toLocaleString("narrow")}</label>
           </div>
            <div class="message-profile-content" id="${message.timestamp}">
                <p class="message-profile-content-message" id="msg-${message.messageId}">
                    ${message.message}
                </p>
            </div>
        </div>`;

    addToChatLog(chatlog, messagecode);
    convertMention(message, false)
    scrollDown();
}
function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}