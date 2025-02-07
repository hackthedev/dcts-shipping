var serverconfigName;
var editGroup = {};

var serverRoleResponse = {};
var editGroup = "";
var currentRoleId = "";

setupNotify();

currentGroupId = getUrlParams("id");

socket.emit("userConnected", { id: getID(), name: getUsername(), icon: getPFP(), status: getStatus(), token: getToken(),
    aboutme: getAboutme(), banner: getBanner()});

socket.emit("getGroupInfo", {id: getID(), token: getToken(), group: currentGroupId}, function (response) {
    try{

        editGroup = response.data;

        console.log("Edit Group")
        console.log(editGroup);

        //loadRolePerms(getUrlParams("id"));


    }
    catch(err){
        console.log("Unable to get Group Information");
        console.log(err);
    }

});

socket.emit("getServerRoles", {id:getID(), token: getToken() }, function (response) {

    //console.log(response);
    serverRoleResponse = response;

    console.log("Role Response:")
    console.log(response);

    var roleArraySorted = [];
    var code = "";
    var role = "";

    console.log(editGroup)

    // Foreach role in the channel permissions
    Object.keys(editGroup.permissions).forEach(function(perm) {

        //console.log("Role " + perm + " has the following permissions");

        /*
        console.log("Perm)")
        console.log(perm)
        console.log(serverRoleResponse[perm]);

         */

        role = serverRoleResponse[perm];

        /*
        console.log(role);
        console.log(serverRoleResponse[perm]);

         */



        code += `
                   <div class="role-entry-container" id="${role.info.id}">                       
                        <p class="role-entry" onclick="loadRolePerms('${role.info.id}')" id="${role.info.id}" style="display: inline-block;color: ${role.info.color};">
                            ${role.info.name}
                        </p>
                   </div>`;


        //children = document.querySelectorAll(`#${perm} input`);

        /*
        if (editChannel[perm] == 1){
            children[0].checked = true;
        }
        else{
            children[0].checked = false;
        }

         */
    });

    rolelist.insertAdjacentHTML("beforeend", code);
});

function removeRole(id){

    socket.emit("removeRoleFromGroup", {id:getID(), token: getToken(), role: id, group: currentGroupId }, function (response) {
        notify(response.msg, response.type, 2000, null, true);
    });
}

function addRole(){

    var roleId = prompt("Please enter the role id you want to add");

    if(roleId != 0){
        if(roleId.length != 4 || isNaN(roleId) == true){
            alert("The role id (4 character long number) you've entered is incorrect.");
            return;
        }
    }
    if(isNaN(roleId) == true){
        alert("The role id has to be a number");
        return;
    }


    socket.emit("addRoleToGroup", {id:getID(), token: getToken(), role: roleId, group: currentGroupId }, function (response) {
        notify(response.msg, response.type, 2000, null, true);
    });
}

function savePermissions(){

    console.log(editGroup.permissions[currentRoleId]);
    console.log(currentGroupId);


    socket.emit("updateGroupPermissions", {id:getID(), token: getToken(), roleId: currentRoleId, groupId: currentGroupId, perms: editGroup.permissions[currentRoleId] }, function (response) {

        if(response.type == "success"){
            notify(response.msg, "success", 2000, null,true)
        }
        else{
            notify(response.msg, "error", 2000, null,true)
        }
    });
}

function tickSetting(element){
    document.getElementById("saveButton").style.display = "inline-block";
    document.getElementById("cancelButton").style.display = "inline-block";

    var childInput = document.querySelectorAll(`#${element.id} input`);
    childInput[0].checked = !childInput[0].checked;

    //console.log("!obj2")
    //console.log(editChannel)
    //console.log(element.id)



    if(childInput[0].checked == true){
        editGroup.permissions[currentRoleId][element.id] = 1;
    }
    else{
        editGroup.permissions[currentRoleId][element.id] = 0;
    }

    console.log(editGroup.permissions[currentRoleId])
    console.log(editGroup)

    //console.log(editChannel.permissions);
}

function loadRolePerms(roleId){

    currentRoleId = roleId
    console.log("Group id: " + currentGroupId);
    console.log(editGroup);

    // Get Permissions
    var groupperms = editGroup.permissions[currentRoleId];

    //console.log("Channel Permissions for role " + roleId)
    //console.log(channelperms);

    document.getElementById("permheader").innerText = "Group Role Permissions - " + editGroup.info.name;
    document.getElementById("removeRole").style.display = "block";
    document.getElementById("removeRole").onclick = function() { removeRole(roleId) };
    document.getElementById("permissionlist").style.display = "block";


    // Uncheck everything before checking the permissions for the specific role
    permListPage = document.querySelectorAll(`#permissionlist p input`);
    permListPage.forEach(perm =>{
        perm.checked = false;
    })


    // Set the permissions in the view
    Object.keys(groupperms).forEach(function(perm) {

        console.log(perm);
        console.log(groupperms[perm]);
        console.log(groupperms);

        children = document.querySelectorAll(`#${perm} input`);
        console.log(`#${perm} input`)

        if (groupperms[perm] == 1){
            children[0].checked = true;
        }
        else{
            children[0].checked = false;
        }
    });

}
