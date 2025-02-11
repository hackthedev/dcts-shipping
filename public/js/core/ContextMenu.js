let ContextMenu;

document.addEventListener("DOMContentLoaded", function () {


    // Context Menu Stuff
    ContextMenu = document.getElementById("context-menu");
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
            getMemberProfile(userid, mouseX, mouseY);
        }
        else if (clickedElement.className.includes("role") && clickedElement.id.split("-")[0] == "addRole") {
            // Open Role Menu

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageMembers" }, function (response) {
                if (response.permission == "granted") {
                    ModActions.showRoleMenu(mouseX, mouseY);
                    ModActions.addRoleFromProfile(clickedElement.id.split("-")[1])
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

            ModActions.hideRoleMenu()
        }


    });


    scope.addEventListener("contextmenu", (event) => {
        event.preventDefault();

        const { clientX: mouseX, clientY: mouseY } = event;
        var clickedElement = document.elementFromPoint(mouseX, mouseY);

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

                if (UserManager.getID() == msgAuthor) {
                    addContextMenuItem(ContextMenu, "Edit Message",
                        `onclick="editMessage('${clickedElement.id}');
                        ContextMenu.classList.remove('visible');
                        "`);

                    addContextMenuItem(ContextMenu, "Delete Message",
                        ErrorButtonCode + `onclick="deleteMessageFromChat('${clickedElement.id}');
                                ContextMenu.classList.remove('visible');
                                "`);
                }
                else {
                    socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageMessages" }, function (response) {
                        if (response.permission == "granted") {
                            addContextMenuItem(ContextMenu, "Delete Message",
                                ErrorButtonCode + `onclick="deleteMessageFromChat('${clickedElement.id}');
                                    ContextMenu.classList.remove('visible');
                                    "`);
                        }
                    });
                }

            } catch { }




            /*
            ModView.addNotification(() => {
                console.log('User clicked the notification badge!');
            });
            */

            addContextMenuItem(ContextMenu, "Report Message",
                ErrorButtonCode + `onclick="UserReports.reportMessage('${clickedElement.id}')

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

                socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "banMember" }, function (response) {
                    if (response.permission == "granted") {
                        addContextMenuItem(ContextMenu, "Ban User",
                            ErrorButtonCode + `onclick="ModActions.banUser('${userid}');
                            ContextMenu.classList.remove('visible');
                            "`);
                    }
                });

                socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "kickUsers" }, function (response) {
                    if (response.permission == "granted") {
                        addContextMenuItem(ContextMenu, "Kick User",
                            ErrorButtonCode + `onclick="ModActions.kickUser('${userid}');
                            ContextMenu.classList.remove('visible');
                            "`);
                    }
                });

                socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "muteUsers" }, function (response) {
                    if (response.permission == "granted") {

                        // check if target user is muted
                        socket.emit("getUserFromId", { id: UserManager.getID(), token: UserManager.getToken(), target: userid }, function (response2) {

                            if (response2.user.isMuted == 1) {
                                addContextMenuItem(ContextMenu, "Unmute User",
                                    ErrorButtonCode + `onclick="ModActions.unmuteUser('${userid}');
                                ContextMenu.classList.remove('visible');
                                "`);
                            }
                            else {
                                addContextMenuItem(ContextMenu, "Mute User",
                                    ErrorButtonCode + `onclick="ModActions.muteUser('${userid}');
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

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { console.log(response); return; }
                addContextMenuItem(ContextMenu, "Create Category",
                    `onclick="
                    AdminActions.createCategory();
                    ContextMenu.classList.remove('visible');
                    "`);
            });
        }
        else if (clickedElement.className == "categoryTrigger") {

            resetContextMenuItem(ContextMenu);

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Create Channel",
                    `onclick="
                    AdminActions.createChannel('${clickedElement.id}');
                    ContextMenu.classList.remove('visible');
                    "`);
            });

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Create Category",
                    `onclick="
                AdminActions.createCategory();
                ContextMenu.classList.remove('visible');
                "`);

            });

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Delete Category",
                    ErrorButtonCode + `onclick="
                AdminActions.deleteCategory('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
            });
        }
        else if (clickedElement.className == "channelTrigger") {
            resetContextMenuItem(ContextMenu);

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { return; }
                socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                    if (response.permission == "denied") { return; }
                    addContextMenuItem(ContextMenu, "Create Channel",
                        `onclick="
                        AdminActions.createChannel('${clickedElement.id}');
                        ContextMenu.classList.remove('visible');
                        "`);
                });
            });

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { return; }

                addContextMenuItem(ContextMenu, "Edit Channel",
                    OkButtonCode + `onclick="
                    AdminActions.editChannel('${clickedElement.id}');
                    ContextMenu.classList.remove('visible');
                    "`);
            });

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Set as Default",
                    OkButtonCode + `onclick="
                    AdminActions.setDefaultChannel('${clickedElement.id}', 'text');
                    ContextMenu.classList.remove('visible');
                    "`);
            });

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
                if (response.permission == "denied") { return; }

                addContextMenuItem(ContextMenu, "Delete Channel",
                    ErrorButtonCode + `onclick="
                    AdminActions.deleteChannel('${clickedElement.id}');
                    ContextMenu.classList.remove('visible');
                    "`);
            });
        }
        else if (clickedElement.id == "serverlist") {

            resetContextMenuItem(ContextMenu);

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "createGroup" }, function (response) {
                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Create Group",
                    `onclick="
                    AdminActions.createGroup();
                    ContextMenu.classList.remove('visible');
                    "`);
            });
        }
        else if (clickedElement.classList.contains("server-icon")) {

            resetContextMenuItem(ContextMenu);

            socket.emit("checkPermission", {
                id: UserManager.getID(), token: UserManager.getToken(), permission: ["manageServer",
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
                    AdminActions.editServer();
                    ContextMenu.classList.remove('visible');
                    "`);

                addContextMenuItem(ContextMenu, "Edit Group",
                    OkButtonCode + `onclick="
                AdminActions.editGroup('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);

                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Delete Group",
                    ErrorButtonCode + `onclick="
                AdminActions.deleteGroup('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);

                addContextMenuItem(ContextMenu, "Change Icon",
                    `onclick="
                AdminActions.changeGroupIcon('${clickedElement.id}');
                ContextMenu.classList.remove('visible');
                "`);
            });

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "redeemKey" }, function (response) {
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
            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageServer" }, function (response) {
                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Edit Server",
                    `onclick="
                    AdminActions.editServer();
                    ContextMenu.classList.remove('visible');
                    "`);
            });

            socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageGroups" }, function (response) {
                if (response.permission == "denied") { return; }
                addContextMenuItem(ContextMenu, "Change Banner",
                    `onclick="
                    AdminActions.changeGroupBanner();
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

    function resetContextMenuItem(element) {
        element.innerHTML = "";
    }

    function addContextMenuItem(element, displayname, onclick = "") {
        var code = `<div class="item" ${onclick}>${displayname}</div>`;
        element.innerHTML += code;
    }
})