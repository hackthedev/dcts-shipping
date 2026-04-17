window.loadRolePerms = loadRolePerms;
window.savePermissions = savePermissions;

var serverconfigName;
var editChannel = null;

var serverRoleResponse = null;
var currentChannelId = "";
var currentRoleId = "";
let permListPage = null;
let invalidRoleWarningShown = false;

document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "channel-permissions") return;

    initChannelRoles();
});

let channelRolesRightPanel = null;

async function initChannelRoles(){
    currentChannelId = getUrlParams("id");
    invalidRoleWarningShown = false;

    channelRolesRightPanel = [
        {
            direction: "column",
            children: [
                document.querySelector("#permissionlist")
            ]
        }
    ];
    MobilePanel.setRightMenu(channelRolesRightPanel, "right");

    socket.emit("getChannelInfo", { id: UserManager.getID(), token: UserManager.getToken(), channel: currentChannelId }, function (response) {
        try {
            editChannel = response.data;
            renderChannelRoleList();

        }
        catch (err) {
            console.log("Unable to get Channel Information");
            console.log(err);
        }

    });

    socket.emit("getServerRoles", { id: UserManager.getID(), token: UserManager.getToken() }, function (response) {

        //console.log(response);
        serverRoleResponse = response;
        renderChannelRoleList();
    });
}

function renderChannelRoleList() {
    if (!editChannel?.permissions || !serverRoleResponse) return;

    const invalidRoleIds = [];
    let code = "";

    Object.keys(editChannel.permissions).forEach(function (perm) {
        const role = serverRoleResponse[perm];
        if (!role?.info) {
            invalidRoleIds.push(perm);
            return;
        }

        code += `
               <div class="role-entry-container" id="${role.info.id}">
                   <div onclick="moveRoleUp(${role.info.id})" style="background-image: url('/img/up.png');background-size: cover;object-fit: cover;background-position: center center;
                   width: 10px; height: 10px;display: inline-block;"></div>
                   
                   <div onclick="moveRoleDown(${role.info.id})" style="background-image: url('/img/down.png');background-size: cover;object-fit: cover;background-position: center center;
                   width: 10px; height: 10px;display: inline-block;"></div>
                   
                    <p class="role-entry" onclick="loadRolePerms('${role.info.id}')" id="${role.info.id}" style="display: inline-block;color: ${role.info.color};">
                        <span style="color: ${role.info.color};background: ${role.info.background};background-clip: ${role.info.backgroundClip};">${role.info.name}</span>
                    </p>
               </div>`;
    });

    rolelist.innerHTML = code;

    if (invalidRoleIds.length && !invalidRoleWarningShown) {
        invalidRoleWarningShown = true;
        showSystemMessage({
            title: "Skipped invalid role permissions",
            text: `Ignored missing role IDs: ${invalidRoleIds.join(", ")}`,
            icon: "warning",
            img: null,
            type: "warning",
            duration: 4000
        });
    }
}

function removeRole() {

    console.log(currentRoleId);

    socket.emit("removeRoleFromChannel", { id: UserManager.getID(), token: UserManager.getToken(), role: currentRoleId, channel: currentChannelId }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function addRole() {

    chooseRole().then(result => {
        Object.values(result.roles).forEach(role => {
            console.log(role);

            let roleId = role.id;

            if (roleId != 0) {
                if (String(roleId).length != 4) {
                    alert("The role id (4 character long number) you've entered is incorrect.");
                    return;
                }
            }
            if (isNaN(roleId) == true) {
                alert("The role id has to be a number");
                return;
            }


            socket.emit("addRoleToChannel", { id: UserManager.getID(), token: UserManager.getToken(), role: roleId, channel: currentChannelId }, function (response) {
                alert(response.msg);
                window.location.reload();
            });
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

function savePermissions() {

    console.log(editChannel.permissions);

    socket.emit("saveChannelPermissions", { id: UserManager.getID(), token: UserManager.getToken(), channel: currentChannelId, role: currentRoleId, permission: editChannel.permissions[currentRoleId] }, function (response) {
        alert(response.msg);
        console.log(response)
        //window.location.reload();
    });
}

/*
function tickSetting(element){
    document.getElementById("saveButton").style.display = "inline-block";
    document.getElementById("cancelButton").style.display = "inline-block";

    var childInput = document.querySelectorAll(`#${element.id} input`);
    childInput[0].checked = !childInput[0].checked;

    //console.log("!obj2")
    //console.log(editChannel)
    //console.log(element.id)

    if(childInput[0].checked == true){
        editChannel.permissions[currentRoleId][element.id] = 1;
    }
    else{
        editChannel.permissions[currentRoleId][element.id] = 0;
    }

    //console.log(editChannel.permissions);
}*/

function loadRolePerms(roleId) {

    currentRoleId = roleId;
    console.log("Role id: " + currentRoleId);

    // Get Permissions
    if (!editChannel?.permissions?.[roleId]) {
        showSystemMessage({
            title: "Role permissions not found",
            text: "This role no longer exists in the server role list.",
            icon: "warning",
            img: null,
            type: "warning",
            duration: 3000
        });
        return;
    }

    //console.log("Channel Permissions for role " + roleId)
    //console.log(channelperms);

    document.getElementById("permheader").innerText = "Channel Permissions - " + editChannel.name;
    document.getElementById("removeRole").style.display = "block";
    document.getElementById("permissionlist").style.display = "block";
    document.getElementById("permissionlistEntries").innerHTML = "";

    // Uncheck everything before checking the permissions for the specific role
    permListPage = document.querySelectorAll(`#permissionlist p input`);
    if(!permListPage){
        console.error("No perms element found")
        return;
    }
    permListPage.forEach(perm => {
        perm.checked = false;
    })

    socket.emit("getPermissions", { id: UserManager.getID(), token: UserManager.getToken(), categories: ["channelPerms"] }, function (response) {
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
            const currentRolePermissions = editChannel.permissions[currentRoleId] || {};
            Object.entries(response.permissions).forEach(([permName, permission]) => {
                const currentValue = currentRolePermissions[permName] ?? 0;

                const callback = (value) => {
                    // Always show save/cancel buttons
                    if (!editChannel.permissions[currentRoleId]) {
                        editChannel.permissions[currentRoleId] = {};
                    }
                    editChannel.permissions[currentRoleId][permName] = value;

                    document.getElementById("saveButton").style.display = "inline-block";
                    document.getElementById("cancelButton").style.display = "inline-block";
                };

                PermUI.showSetting(
                    document.getElementById("permissionlistEntries"),
                    permName,
                    permission.name,
                    permission.type,
                    permission.description,
                    currentValue,
                    callback
                );
            });

            if (MobilePanel.isMobile()) {
                MobilePanel.renderPanel(channelRolesRightPanel, "right")
            }
        }
    });

}
