var serverconfigName;
var editChannel = {};

var serverRoleResponse = {};
var currentChannelId = "";
var currentRoleId = "";

currentChannelId = getUrlParams("id");

socket.emit("userConnected", { id: getID(), name: getUsername(), icon: getPFP(), status: getStatus(), token: getToken(),
    aboutme: getAboutme(), banner: getBanner()});

socket.emit("getChannelInfo", {id: getID(), token: getToken(), channel: currentChannelId}, function (response) {
    try{

        editChannel = response.data;

        console.log("EditChannel")
        console.log(editChannel);

        //loadRolePerms(getUrlParams("id"));


    }
    catch(err){
        console.log("Unable to get Channel Information");
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

    console.log(editChannel)

    // Foreach role in the channel permissions
    Object.keys(editChannel.permissions).forEach(function(perm) {

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
                       <div onclick="moveRoleUp(${role.info.id})" style="background-image: url('/img/up.png');background-size: cover;object-fit: cover;background-position: center center;
                       width: 10px; height: 10px;display: inline-block;"></div>
                       
                       <div onclick="moveRoleDown(${role.info.id})" style="background-image: url('/img/down.png');background-size: cover;object-fit: cover;background-position: center center;
                       width: 10px; height: 10px;display: inline-block;"></div>
                       
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

function removeRole(){

    console.log(currentRoleId);

    socket.emit("removeRoleFromChannel", {id:getID(), token: getToken(), role: currentRoleId, channel: currentChannelId }, function (response) {
        alert(response.msg);
        window.location.reload();
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


    socket.emit("addRoleToChannel", {id:getID(), token: getToken(), role: roleId, channel: currentChannelId }, function (response) {
        alert(response.msg);
        window.location.reload();
    });
}

function savePermissions(){

    console.log(editChannel);
    console.log(editChannel.permissions);
    console.log(editChannel.permissions[currentRoleId]);

    socket.emit("saveChannelPermissions", {id:getID(), token: getToken(), channel: currentChannelId, role: currentRoleId, permission: editChannel.permissions[currentRoleId] }, function (response) {
        alert(response.msg);
        console.log(response)
        //window.location.reload();
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
        editChannel.permissions[currentRoleId][element.id] = 1;
    }
    else{
        editChannel.permissions[currentRoleId][element.id] = 0;
    }

    //console.log(editChannel.permissions);
}

function loadRolePerms(roleId){

    currentRoleId = roleId;
    console.log("Role id: " + currentRoleId);

    // Get Permissions
    var channelperms = editChannel.permissions[roleId];

    //console.log("Channel Permissions for role " + roleId)
    //console.log(channelperms);

    document.getElementById("permheader").innerText = "Channel Permissions - " + editChannel.name;
    document.getElementById("removeRole").style.display = "block";
    document.getElementById("permissionlist").style.display = "block";


    // Uncheck everything before checking the permissions for the specific role
    permListPage = document.querySelectorAll(`#permissionlist p input`);
    permListPage.forEach(perm =>{
        perm.checked = false;
    })

    // Set the permissions in the view
    Object.keys(channelperms).forEach(function(perm) {

        children = document.querySelectorAll(`#${perm} input`);
        console.log(perm);

        if (channelperms[perm] == 1){
            children[0].checked = true;
        }
        else{
            children[0].checked = false;
        }
    });

}
