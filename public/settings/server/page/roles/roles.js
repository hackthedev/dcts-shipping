var rolelist = document.getElementById("rolelist");
var roleName = document.getElementById("roleName");
var roleColor = document.getElementById("roleColor");
var roleColorGradient1 = document.getElementById("roleColorGradient1");
var roleColorGradient2 = document.getElementById("roleColorGradient2");
var serverRoleResponse = "";
var editedServerRoleResponse = [];
var editedPermissions = {};
var currentRoleId = "";
let serverRolesRightPanel = null;

document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "roles") return;

    initServerRoles();
});


function initServerRoles() {
    socket.emit("checkPermission", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        permission: ["manageRoles", "manageGroups"]
    }, function (response) {

        if (response.permission == "denied") {
            window.location.href = window.location.origin + "/settings/server";
        } else {
            document.getElementById("pagebody").style.display = "block";
        }
    });


    serverRolesRightPanel = [
        {
            direction: "column",
            children: [
                document.querySelector("#permissionlist")
            ]
        }
    ];


    socket.emit("getServerRoles", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {

        MobilePanel.setRightMenu(serverRolesRightPanel, "right");

        rolelist = document.getElementById("rolelist");
        roleStyle = computeRoleStyle();
        roleName = document.getElementById("roleName");
        roleColor = document.getElementById("roleColor");
        roleColorGradient1 = document.getElementById("roleColorGradient1");
        roleColorGradient2 = document.getElementById("roleColorGradient2");
        roleMenuEntryExample = document.getElementById("roleMenuEntryExample");

        serverRoleResponse = response;
        editedServerRoleResponse = response;

        var roleArraySorted = [];

        Object.keys(response).reverse().forEach(function (role) {
            var roleStyle = response[role].info.style;
            var roleName = response[role].info.name;

            roleArraySorted[response[role].info.sortId] = response[role];
        });

        var code = "";

        roleArraySorted = roleArraySorted.reverse();

        //var code = '<ul class="sortable-list">';
        roleArraySorted.forEach(role => {
            code += `
                   <div class="role-entry-container" id="${role.info.id}">
                       <div onclick="moveRoleUp(${role.info.id})" style="background-image: url('/img/up.png');background-size: cover;object-fit: cover;background-position: center center;
                       width: 10px; height: 10px;display: inline-block;"></div>
                       
                       <div onclick="moveRoleDown(${role.info.id})" style="background-image: url('/img/down.png');background-size: cover;object-fit: cover;background-position: center center;
                       width: 10px; height: 10px;display: inline-block;"></div>
                       
                        <p class="role-entry" onclick="loadRolePerms('${role.info.id}')" id="${role.info.id}">
                            <span style="color: ${role.info.color};background: ${role.info.background};background-clip: ${role.info.backgroundClip};">${role.info.name}</span>
                        </p>
                   </div>
        `;
        })
        //code += '</ul>';

        rolelist.insertAdjacentHTML("beforeend", code);
    });
}


function saveAppearance() {

    serverRoleResponse[currentRoleId].info.name = roleName.value;
    var roleStyle = computeRoleStyle();
    serverRoleResponse[currentRoleId].info.color = roleStyle.color;
    serverRoleResponse[currentRoleId].info.background = roleStyle.background;
    serverRoleResponse[currentRoleId].info.backgroundClip = roleStyle.backgroundClip;

    if (document.getElementById("displaySeperate").checked == true) {
        serverRoleResponse[currentRoleId].info.displaySeperate = 1;
    } else {
        serverRoleResponse[currentRoleId].info.displaySeperate = 0;
    }

    socket.emit("updateRoleAppearance", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        roleId: currentRoleId,
        data: serverRoleResponse[currentRoleId]
    }, function (response) {
        customPrompts.showAlert(response.msg, {title: "Role Appearance"}).then(() => {
            window.location.reload();
        });
    });
}

function computeRoleStyle() {
    var roleStyle = document.getElementById('roleMenuEntryExample').style
    if (document.getElementById('gradientsEnabled').checked) {
        var roleColorValue = document.getElementById("roleColor").value;
        var roleColorGradient1Value = document.getElementById("roleColorGradient1").value;
        var roleColorGradient2Value = document.getElementById("roleColorGradient2").value;
        roleStyle.background = `linear-gradient(90deg, ${roleColorValue}, ${roleColorGradient1Value}, ${roleColorGradient2Value})`;
        roleStyle.backgroundClip = "text";
        roleStyle.color = "transparent";
    } else {
        roleStyle.color = document.getElementById("roleColor").value;
        roleStyle.background = "none";
        roleStyle.backgroundClip = "initial";
    }
    return roleStyle;
}

function appearanceChanged() {
    var roleStyle = computeRoleStyle();
    console.log(`color: ${roleStyle.color}`)
    document.getElementById('roleMenuEntryExample').style.background = roleStyle.background;
    document.getElementById('roleMenuEntryExample').style.backgroundClip = roleStyle.backgroundClip;
    document.getElementById('roleMenuEntryExample').style.color = roleStyle.color;
    if (document.getElementById('gradientsEnabled').checked) {
        document.getElementById('gradientOptions').style.display = "block";
    } else {
        document.getElementById('gradientOptions').style.display = "none";
    }
    document.getElementById("saveAppearanceButton").style.display = "inline-block";
    document.getElementById("cancelAppearanceButton").style.display = "inline-block";
}

function saveSorting() {
    var sortedRoles = document.querySelectorAll(`.role-entry-container`);

    var sortArray = [];
    sortedRoles.forEach(role => {
        sortArray.push(role.id);
    })

    socket.emit("updateRoleHierarchy", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        sorted: sortArray
    }, function (response) {
        customPrompts.showAlert(response.msg, {title: "Role Hierarchy"}).then(() => {
            window.location.reload();
        });
    });
}

function removeFromRole(roleId, userId) {

    socket.emit("removeUserFromRole", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        role: roleId,
        target: userId
    }, function (response) {
        customPrompts.showAlert(response.msg, {title: "Remove User From Role"}).then(() => {
            window.location.reload();
        });
    });
}

function savePermissions() {

    console.log("Saving")
    console.log(editedServerRoleResponse[currentRoleId].permissions)


    socket.emit("saveRolePermissions", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        role: currentRoleId,
        permissions: editedServerRoleResponse[currentRoleId].permissions
    }, function (response) {
        customPrompts.showAlert(response.msg, {title: "Save Role Permissions"}).then(() => {
            window.location.reload();
        });
    });
}

function addToRole() {
    customPrompts.showInput({
        title: "Add User to Role",
        label: "User ID",
        placeholder: "Enter the 12-digit user id",
        submitText: "Add",
        submitColor: "success",
        minWidth: 340,
    }).then((userId) => {
        const trimmedUserId = userId?.trim();
        if (!trimmedUserId) return;

        if (trimmedUserId.length != 12 || isNaN(trimmedUserId) == true) {
            customPrompts.showAlert("The user id (12 character long number) you've entered is incorrect.", {title: "Invalid User ID"});
            return;
        }

        socket.emit("addUserToRole", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            role: currentRoleId,
            target: trimmedUserId
        }, function (response) {
            customPrompts.showAlert(response.msg, {title: "Add User to Role"}).then(() => {
                window.location.reload();
            });
        });
    });
}

function createRole() {
    console.log(socket.connected)
    socket.emit("createRole", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {
        customPrompts.showAlert(response.msg, {title: "Create Role"}).then(() => {
            window.location.reload();
        });
    });
}

function moveRoleUp(id) {
    document.getElementById("saveSortingButton").style.display = "inline-block";
    document.getElementById("cancelSortingButton").style.display = "inline-block";

    var roles = document.querySelectorAll(`.role-entry-container`);

    for (let i = 0; i < roles.length; i++) {

        if (roles[i].id == id) {
            roles[i - 1].before(roles[i]);
        }
    }
}

function moveRoleDown(id) {
    document.getElementById("saveSortingButton").style.display = "inline-block";
    document.getElementById("cancelSortingButton").style.display = "inline-block";

    var roles = document.querySelectorAll(`.role-entry-container`);

    for (let i = 0; i < roles.length; i++) {

        if (roles[i].id == id) {
            roles[i + 1].after(roles[i]);
        }
    }
}

function deleteRole() {
    socket.emit("deleteRole", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        roleId: currentRoleId
    }, function (response) {
        customPrompts.showAlert(response.msg, {title: "Delete Role"}).then(() => {
            window.location.reload();
        });
    });
}

function loadRolePerms(roleId) {
    PermUI.init();

    let permContainer = document.getElementById("permList");
    permContainer.innerHTML = "";

    socket.emit("getPermissions", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        categories: ["serverRoles"]
    }, function (response) {
        if (response.error !== null) {
            showSystemMessage({
                title: response.error || "",
                text: response.msg || "",
                icon: "error",
                img: null,
                type: "error",
                duration: response.displayTime || 3000
            });
        } else {
            // display the permission html stuff
            Object.entries(response.permissions).forEach(([permName, permission]) => {
                const currentValue = serverRoleResponse[roleId]?.permissions?.[permName] ?? 0;

                const callback = (value) => {
                    editedServerRoleResponse[currentRoleId].permissions[permName] = value;

                    // Always show save/cancel buttons
                    document.getElementById("saveButton").style.display = "inline-block";
                    document.getElementById("cancelButton").style.display = "inline-block";
                };

                PermUI.showSetting(
                    permContainer,
                    permName,
                    permission.name,
                    permission.type,
                    permission.description,
                    currentValue,
                    callback
                );
            });


            // Mark the current role that is being edited
            var currentRole = document.querySelectorAll(`.role-entry`);
            let roleInfoObj = serverRoleResponse[roleId].info;

            currentRole.forEach(role => {

                if (role.id == roleId) {
                    role.style.backgroundColor = "#292B2F";
                } else {
                    role.style.backgroundColor = "transparent";
                }
            })

            document.getElementById("displaySeperate").checked = serverRoleResponse[roleId].displaySeperate;


            // Get Permissions
            var roleperms = serverRoleResponse[roleId].permissions;
            document.getElementById("permheader").innerText = "Permissions - " + serverRoleResponse[roleId].info.name;

            // Show Role Delete Button
            document.getElementById("permissionlist").style.display = "block";
            document.getElementById("deleteRole").style.display = "block";
            currentRoleId = roleId;

            // Style and Name
            if (serverRoleResponse[roleId].info.color == 'transparent') {
                document.getElementById('gradientsEnabled').checked = true;
                document.getElementById('gradientOptions').style.display = "block";
                var roleColors = serverRoleResponse[roleId].info.background.match(/(rgb\(.*,.*,.*\)), (rgb\(.*,.*,*\)), (rgb\(.*,.*,.*[^)]\))/);

                roleColor.value = rgbToHex(roleColors[1]);
                roleColorGradient1.value = rgbToHex(roleColors[2])
                roleColorGradient2.value = rgbToHex(roleColors[3])
            } else {
                document.getElementById('gradientsEnabled').checked = false;
                document.getElementById('gradientOptions').style.display = "none";
                roleColor.value = rgbToHex(serverRoleResponse[roleId].info.color);
            }
            var roleStyle = computeRoleStyle();
            roleMenuEntryExample.color = roleStyle.color;
            roleMenuEntryExample.background = roleStyle.background;
            roleMenuEntryExample.backgroundClip = roleStyle.backgroundClip;
            roleName.value = serverRoleResponse[roleId].info.name;

            // Set appearance checkbox down here, otherwise always unchecked
            if (serverRoleResponse[roleId].info.displaySeperate == 1) {
                document.getElementById("displaySeperate").checked = true;
            } else {
                document.getElementById("displaySeperate").checked = false;
            }

            // get members of the role
            /*var memberlist = document.getElementById("memberlist");
            memberlist.innerHTML = "";

            let roleMembersHeader = document.getElementById("roleMembersHeader");
            roleMembersHeader.innerText = `Role Members (${serverRoleResponse[currentRoleId].members.length})`

            Object.keys(serverRoleResponse[currentRoleId].members).reverse().forEach(function (member) {

                // resolve member

                socket.emit("resolveMember", {
                    id: UserManager.getID(),
                    token: UserManager.getToken(),
                    target: serverRoleResponse[currentRoleId].members[member]
                }, function (response) {

                    if (response.data == null) return;

                    var code = `<div class="memberlist-container">
                                    <div class="memberlist-banner" style="background-image: url('${response.data?.banner}');"></div>
                                    <div class="memberlist-pfp" style="background-image: url('${response.data?.icon}');"></div>
                                    <div class="memberlist-username">${response.data?.name}</div>
                
                                    <div class="memberlist-actions">
                                        ${currentRoleId == 0 ? "" : `<input onclick="removeFromRole(${currentRoleId}, ${response.data?.id})" type="button" value="Remove from Role">`}
                                    </div>
                                </div>`;

                    memberlist.insertAdjacentHTML("beforeend", code);

                });
            });

             */

            if (MobilePanel.isMobile()) {
                console.log("render rightr")
                MobilePanel.renderPanel(serverRolesRightPanel, "right")
            }
        }
    });
}
