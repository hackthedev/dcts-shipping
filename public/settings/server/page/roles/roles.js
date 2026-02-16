var rolelist = document.getElementById("rolelist");
var roleColor = document.getElementById("roleColor");
var roleName = document.getElementById("roleName");
var serverRoleResponse = "";
var editedServerRoleResponse = [];
var editedPermissions = {};
var currentRoleId = "";


document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "roles") return;

    initServerRoles();
});


function initServerRoles(){
    socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: ["manageRoles", "manageGroups"] }, function (response) {

        if (response.permission == "denied") {
            window.location.href = window.location.origin + "/settings/server";
        }
        else {
            document.getElementById("pagebody").style.display = "block";
        }
    });



    socket.emit("getServerRoles", { id: UserManager.getID(), token: UserManager.getToken() }, function (response) {

        rolelist = document.getElementById("rolelist");
        roleColor = document.getElementById("roleColor");
        roleName = document.getElementById("roleName");

        serverRoleResponse = response;
        editedServerRoleResponse = response;

        var roleArraySorted = [];

        Object.keys(response).reverse().forEach(function (role) {
            var rolecolor = response[role].info.color;
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
                       
                        <p class="role-entry" onclick="loadRolePerms('${role.info.id}')" id="${role.info.id}" style="display: inline-block;color: ${role.info.color};">
                            ${role.info.name}
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
    serverRoleResponse[currentRoleId].info.color = roleColor.value;

    if (document.getElementById("displaySeperate").checked == true) {
        serverRoleResponse[currentRoleId].info.displaySeperate = 1;
    }
    else {
        serverRoleResponse[currentRoleId].info.displaySeperate = 0;
    }

    socket.emit("updateRoleAppearance", { id: UserManager.getID(), token: UserManager.getToken(), roleId: currentRoleId, data: serverRoleResponse[currentRoleId] }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function appearanceChanged() {
    document.getElementById("saveAppearanceButton").style.display = "inline-block";
    document.getElementById("cancelAppearanceButton").style.display = "inline-block";
}

function saveSorting() {
    var sortedRoles = document.querySelectorAll(`.role-entry-container`);

    var sortArray = [];
    sortedRoles.forEach(role => {
        sortArray.push(role.id);
    })

    socket.emit("updateRoleHierarchy", { id: UserManager.getID(), token: UserManager.getToken(), sorted: sortArray }, function (response) {

        alert(response.msg);
        window.location.reload();
    });
}

function removeFromRole(roleId, userId) {

    socket.emit("removeUserFromRole", { id: UserManager.getID(), token: UserManager.getToken(), role: roleId, target: userId }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function savePermissions() {

    console.log("Saving")
    console.log(editedServerRoleResponse[currentRoleId].permissions)


    socket.emit("saveRolePermissions", { id: UserManager.getID(), token: UserManager.getToken(), role: currentRoleId, permissions: editedServerRoleResponse[currentRoleId].permissions }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function addToRole() {

    var userId = prompt("Please enter the user id of the account you want to add");

    if (userId.length != 12 || isNaN(userId) == true) {
        alert("The user id (12 character long number) you've entered is incorrect.");
        return;
    }

    socket.emit("addUserToRole", { id: UserManager.getID(), token: UserManager.getToken(), role: currentRoleId, target: userId }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function createRole() {
    console.log(socket.connected)
    socket.emit("createRole", { id: UserManager.getID(), token: UserManager.getToken() }, function (response) {
        alert(response.msg);
        window.location.reload();
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
    socket.emit("deleteRole", { id: UserManager.getID(), token: UserManager.getToken(), roleId: currentRoleId }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function loadRolePerms(roleId) {
    PermUI.init();

    let permContainer = document.getElementById("permList");
    permContainer.innerHTML = "";

    socket.emit("getPermissions", { id: UserManager.getID(), token: UserManager.getToken(), categories: ["serverRoles"] }, function (response) {
        if (response.error !== null) {
            showSystemMessage({
                title: response.error || "",
                text: response.msg || "",
                icon: "error",
                img: null,
                type: "error",
                duration: response.displayTime || 3000
            });
        }
        else {
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
            currentRole.forEach(role => {

                if (role.id == roleId) {
                    role.style.backgroundColor = "#292B2F";
                }
                else {
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

            // Color and Name
            roleColor.value = serverRoleResponse[roleId].info.color;
            roleName.value = serverRoleResponse[roleId].info.name;

            /*
            // Uncheck everything before checking the permissions for the specific role
            // 1. Reset numeric inputs and permission boxes
            document.querySelectorAll(`#permList p input[type="number"]`).forEach(input => {
                input.value = "";
            });

            document.querySelectorAll(`#permList .permStateBox`).forEach(box => {
                box.setAttribute("data-state", "0"); // reset to inherited
                box.parentElement.setAttribute("data-state", "0");
            });
*/
            /*
            // 2. Apply permission values
            Object.keys(roleperms).forEach(function (perm) {
                const value = roleperms[perm];

                try {
                    const numberInput = document.querySelector(`#${perm} input[type="number"]`);
                    const box = document.querySelector(`#${perm} .permStateBox`);

                    if (numberInput && !isNaN(value)) {
                        numberInput.value = parseInt(value);
                    } else if (box) {
                        // This is a checkbox-like permission (styled div)
                        box.setAttribute("data-state", value);
                        box.parentElement.setAttribute("data-state", value);
                    }
                } catch (ex) {
                    console.log("Failed to apply permission for", perm, ex);
                }
            });
            */


            // Set appearance checkbox down here, otherwise always unchecked
            if (serverRoleResponse[roleId].info.displaySeperate == 1) {
                document.getElementById("displaySeperate").checked = true;
            }
            else {
                document.getElementById("displaySeperate").checked = false;
            }

            // get members of the role
            var memberlist = document.getElementById("memberlist");
            memberlist.innerHTML = "";

            let roleMembersHeader = document.getElementById("roleMembersHeader");
            roleMembersHeader.innerText = `Role Members (${serverRoleResponse[currentRoleId].members.length})`

            Object.keys(serverRoleResponse[currentRoleId].members).reverse().forEach(function (member) {

                // resolve member

                socket.emit("resolveMember", { id: UserManager.getID(), token: UserManager.getToken(), target: serverRoleResponse[currentRoleId].members[member] }, function (response) {

                    if(response.data == null) return;

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
        }
    });
}
