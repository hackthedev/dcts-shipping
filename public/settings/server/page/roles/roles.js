var rolelist = document.getElementById("rolelist");
var roleColor = document.getElementById("roleColor");
var roleName = document.getElementById("roleName");
var serverRoleResponse = "";
var editedServerRoleResponse = [];
var editedPermissions = {};
var currentRoleId = "";


socket.emit("checkPermission", {id:getID(), token: getToken(), permission: ["manageRoles", "manageGroup"] }, function (response) {

    if(response.permission == "denied"){
        window.location.href = window.location.origin + "/settings/server";
    }
    else{
        document.getElementById("pagebody").style.display = "block";
    }
});

function saveNumber(el){
    editedServerRoleResponse[currentRoleId].permissions[el.id] = el.value;
    console.log(editedServerRoleResponse[currentRoleId].permissions)

    document.getElementById("saveButton").style.display = "inline-block";
    document.getElementById("cancelButton").style.display = "inline-block";
}


socket.emit("getServerRoles", {id:getID(), token: getToken() }, function (response) {

    rolelist = document.getElementById("rolelist");
    roleColor = document.getElementById("roleColor");
    roleName = document.getElementById("roleName");

    console.log(response);
    serverRoleResponse = response;
    editedServerRoleResponse = response;

    var roleArraySorted = [];

    Object.keys(response).reverse().forEach(function(role) {

        console.log(response);
        var rolecolor = response[role].info.color;
        var roleName = response[role].info.name;

        roleArraySorted[response[role].info.sortId] = response[role];
    });

    var code = "";

    roleArraySorted = roleArraySorted.reverse();
    console.log(roleArraySorted)

    //var code = '<ul class="sortable-list">';
    roleArraySorted.forEach(role =>{
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

function saveAppearance(){

    serverRoleResponse[currentRoleId].info.name = roleName.value;
    serverRoleResponse[currentRoleId].info.color = roleColor.value;

    if(document.getElementById("displaySeperate").checked == true){
        serverRoleResponse[currentRoleId].info.displaySeperate = 1;
    }
    else{
        serverRoleResponse[currentRoleId].info.displaySeperate = 0;
    }

    socket.emit("updateRoleAppearance", {id:getID(), token: getToken(), roleId: currentRoleId, data: serverRoleResponse[currentRoleId] }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function appearanceChanged(){
    document.getElementById("saveAppearanceButton").style.display = "inline-block";
    document.getElementById("cancelAppearanceButton").style.display = "inline-block";
}

function saveSorting(){
    var sortedRoles = document.querySelectorAll(`.role-entry-container`);

    var sortArray = [];
    sortedRoles.forEach(role =>{
        sortArray.push(role.id);
    })

    socket.emit("updateRoleHierarchy", {id:getID(), token: getToken(), sorted: sortArray }, function (response) {

        alert(response.msg);
        window.location.reload();
    });
}

function removeFromRole(roleId, userId){

    console.log(`Removing user ${userId} from role `);
    socket.emit("removeUserFromRole", {id:getID(), token: getToken(), role: roleId, target: userId }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function savePermissions(){

    console.log("Saviong")
    console.log(editedServerRoleResponse[currentRoleId].permissions)

    socket.emit("saveRolePermissions", {id:getID(), token: getToken(), role: currentRoleId, permissions: editedServerRoleResponse[currentRoleId].permissions }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function addToRole(){

    var userId = prompt("Please enter the user id of the account you want to add");

    if(userId.length != 12 || isNaN(userId) == true){
        alert("The user id (12 character long number) you've entered is incorrect.");
        return;
    }

    socket.emit("addUserToRole", {id:getID(), token: getToken(), role: currentRoleId, target: userId }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function createRole(){
    socket.emit("createRole", {id:getID(), token: getToken() }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function moveRoleUp(id){
    document.getElementById("saveSortingButton").style.display = "inline-block";
    document.getElementById("cancelSortingButton").style.display = "inline-block";

    var roles = document.querySelectorAll(`.role-entry-container`);

    for(let i = 0; i < roles.length; i++){

        if(roles[i].id == id){
            roles[i-1].before(roles[i]);
        }
    }
}

function moveRoleDown(id){
    document.getElementById("saveSortingButton").style.display = "inline-block";
    document.getElementById("cancelSortingButton").style.display = "inline-block";

    var roles = document.querySelectorAll(`.role-entry-container`);

    for(let i = 0; i < roles.length; i++){

        if(roles[i].id == id){
            roles[i+1].after(roles[i]);
        }
    }
}

function tickSetting(element){
    document.getElementById("saveButton").style.display = "inline-block";
    document.getElementById("cancelButton").style.display = "inline-block";

    var childInput = document.querySelectorAll(`#${element.id} input`);
    childInput[0].checked = !childInput[0].checked;

    // Load current permissions too
    Object.keys(serverRoleResponse[currentRoleId].permissions).forEach(function(perm) {
        editedPermissions[perm] = serverRoleResponse[currentRoleId].permissions[perm];
    });

    console.log(" ")

    if(childInput[0].checked == true){
        editedServerRoleResponse[currentRoleId].permissions[element.id] = 1;
    }
    else{
        editedServerRoleResponse[currentRoleId].permissions[element.id] = 0;
    }

    console.log(serverRoleResponse[currentRoleId].permissions);

    // Update that tomorrow
    //console.log(editedPermissions);
}


function deleteRole() {
    socket.emit("deleteRole", {id: getID(), token: getToken(), roleId: currentRoleId}, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function loadRolePerms(roleId){

    // Mark the current role that is being edited
    var currentRole = document.querySelectorAll(`.role-entry`);
    currentRole.forEach(role =>{

        if(role.id == roleId){
            role.style.backgroundColor = "#292B2F";
        }
        else{
            role.style.backgroundColor = "transparent";
        }
    })



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

    // Uncheck everything before checking the permissions for the specific role
    permListPage = document.querySelectorAll(`#permissionlist p input`);
    permListPage.forEach(perm =>{
        perm.checked = false;
    })


    // Set the permissions in the view
    Object.keys(roleperms).forEach(function(perm) {

        children = document.querySelectorAll(`#${perm} input`);
        console.log(`#${perm} input`);
        console.log(children[0])
        console.log(children)

        if (roleperms[perm] == 1){
            children[0].checked = true;
        }
        else{
            if(children[0].type == "number"){
                children[0].value = roleperms[perm];
            }
            else{
                children[0].checked = false;
            }

        }
    });

    // Set appearance checkbox down here, otherwise always unchecked
    if(serverRoleResponse[roleId].info.displaySeperate == 1){
        console.log("checked element")
        document.getElementById("displaySeperate").checked = true;
    }
    else{
        document.getElementById("displaySeperate").checked = false;
    }

    // get members of the role
    var memberlist = document.getElementById("memberlist");
    memberlist.innerHTML = "";

    let roleMembersHeader = document.getElementById("roleMembersHeader");
    roleMembersHeader.innerText = `Role Members (${serverRoleResponse[currentRoleId].members.length})`

    Object.keys(serverRoleResponse[currentRoleId].members).reverse().forEach(function(member) {

        // resolve member

        socket.emit("resolveMember", {id:getID(), token: getToken(), target: serverRoleResponse[currentRoleId].members[member] }, function (response) {

            var code = `<div class="memberlist-container">
                        <div class="memberlist-banner" style="background-image: url('${response.data.banner}');"></div>
                        <div class="memberlist-pfp" style="background-image: url('${response.data.icon}');"></div>
                        <div class="memberlist-username">${response.data.name}</div>
    
                        <div class="memberlist-actions">
                            <input onclick="removeFromRole(${currentRoleId}, ${response.data.id})" type="button" value="Remove from Role">
                        </div>
                    </div>`;

            memberlist.insertAdjacentHTML("beforeend", code);

        });
    });

}
