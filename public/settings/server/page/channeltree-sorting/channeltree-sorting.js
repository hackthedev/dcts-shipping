var rolelist = document.getElementById("rolelist");
var roleColor = document.getElementById("roleColor");
var roleName = document.getElementById("roleName");
var serverGroupResponse = "";
var editedServerGroupResponse = [];
var editedPermissions = {};
var currentRoleId = "";
var selectedgroup = null;

function getUrlParams(param){
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}

setupNotify();

socket.emit("userConnected", { id: getID(), name: getUsername(), icon: getPFP(), status: getStatus(), token: getToken(),
    aboutme: getAboutme(), banner: getBanner()});

socket.emit("checkPermission", {id:getID(), token: getToken(), permission: ["manageChannels", "manageChannelSorting", "manageGroups"] }, function (response) {

    if(response.permission == "denied"){
        window.location.href = window.location.origin + "/settings/server";
    }
    else{
        document.getElementById("pagebody").style.display = "block";
    }
});



socket.emit("getGroupChannels", {id:getID(), token: getToken(), group: getUrlParams("group") }, function (response) {

    rolelist = document.getElementById("rolelist");
    roleColor = document.getElementById("roleColor");
    roleName = document.getElementById("roleName");

    console.log(response);
    serverGroupResponse = response;
    editedServerGroupResponse = response;

    loadGroupChannels(1);
});

function appearanceChanged(element){
    var groupId = document.getElementById("groupId").value;
    editedServerGroupResponse[groupId].info.name = document.getElementById("groupName").value;
}

function saveSorting(){
    var sortedGroups = document.querySelectorAll(`.group-tree-entry`);
    var sortedCategories = document.querySelectorAll(`.category-tree-entry`);
    //var sortedChannels = document.querySelectorAll(`.channel-tree-entry`);

    var sortGroupArray = [];
    var groupSortIndex = sortedGroups.length;
    sortedGroups.forEach(group =>{
        sortGroupArray.push(group.id);

        console.log(`Setting Group Index to ${groupSortIndex} on ${group.id}`)
        console.log(editedServerGroupResponse);

        editedServerGroupResponse[group.id].info.sortId = groupSortIndex;

        // Actually do it
        groupSortIndex--;

        //console.log("Group: " + group.id)
    })

    // Category Sorting
    var sortCategoryArray = [];

    // The biggest index (sortId) is always top, therefore we
    // index it backwards
    var catSortIndex = sortedCategories.length;

    // Channel Sorting
    var sortChannelArray = [];
    var chanSortIndex = 0;
    var sortedChannels = 0;

    // Makes it possible to use .reverse()
    sortedCategories = Array.prototype.slice.call(sortedCategories);

    // Foreach Sorted Category
    sortedCategories.forEach(cat =>{

        console.log(`Setting Category Index to ${catSortIndex} on ${cat.id}`)
        editedServerGroupResponse[selectedgroup].channels.categories[cat.id].info.sortId = catSortIndex;
        // Actually do it

        console.log("- " + editedServerGroupResponse[selectedgroup].channels.categories[cat.id].info.name + ` (${editedServerGroupResponse[selectedgroup].channels.categories[cat.id].info.sortId})`);

        sortedChannels = document.querySelectorAll(`.tmp-${cat.id}-channel-tree-entry`);
        sortedChannels = Array.prototype.slice.call(sortedChannels);

        sortChannelArray = [];
        chanSortIndex = sortedChannels.length;

        sortedChannels.forEach(chan =>{

            //console.log(`Setting Channel Index to ${chanSortIndex} on channel ${chan.id} in cat ${cat.id}`)
            editedServerGroupResponse[selectedgroup].channels.categories[cat.id].channel[chan.id].sortId = chanSortIndex;

            console.log("    - " + editedServerGroupResponse[selectedgroup].channels.categories[cat.id].channel[chan.id].name + ` (${editedServerGroupResponse[selectedgroup].channels.categories[cat.id].channel[chan.id].sortId})`);
            // Actually do it

            chanSortIndex--;
        })

        catSortIndex--;
    })

    //console.log("Changes:")
    //console.log(serverGroupResponse[selectedgroup].channels);
    //console.log(editedServerGroupResponse[selectedgroup].channels);

    socket.emit("updateChannelHierarchy", {id:getID(), token: getToken(), sorted: editedServerGroupResponse, group: 0 }, function (response) {

        if(response.type == "success"){
            notify(response.msg, "success", null, null, true);
        }
        else{
            notify(response.msg, "error");
        }
    });


}

function savePermissions(){
    /*
    socket.emit("saveRolePermissions", {id:getID(), token: getToken(), role: currentRoleId, permissions: editedPermissions }, function (response) {

        alert(response.msg);
        window.location.reload();
    });

     */
}


new Sortable(rolelist, {
    animation: 150,
    ghostClass: 'sortable-ghost'
});

new Sortable(channeltree_list, {
    animation: 150,
    ghostClass: 'sortable-ghost'
});

function loadSingleGroupChannels(groupId){

    selectedgroup = groupId;

    document.getElementById("groupId").value = groupId;
    document.getElementById("groupName").value = serverGroupResponse[groupId].info.name;

    channeltree_list.innerHTML = "";
    // Sort all Categories
    const catCollection = serverGroupResponse[groupId].channels.categories;
    let sortedCats = Object.keys(catCollection).sort((a, b) => {
        return catCollection[b].info.sortId - catCollection[a].info.sortId
    });

    // For each Category, sort the category's channels
    sortedCats = sortedCats.map((key) => catCollection[key]);


    sortedCats.forEach(cat => {

        // Display the Category name on the web page
        channeltree_list.insertAdjacentHTML("beforeend", `
            <p class="category category-tree-entry" id="${cat.info.id}">${cat.info.name}</p>`
        );

        // Sort all the Channels inside the current category
        const catChannelCollection = cat.channel;
        let sortedCatChannels = Object.keys(catChannelCollection).sort((a, b) => {
            return catChannelCollection[b].sortId - catChannelCollection[a].sortId
        });

        // Foreach channel in the category, display it on the web page
        sortedCatChannels = sortedCatChannels.map((key) => catChannelCollection[key]);
        sortedCatChannels.forEach(chan => {
            channeltree_list.insertAdjacentHTML("beforeend", `
                <p class="channel tmp-${cat.info.id}-channel-tree-entry" id="${chan.id}">${chan.name}</p>
            `);
        })
    });
}

function loadGroupChannels(groupId){

    /*
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

     */

    //document.getElementById("permheader").innerText = "Channels - " + serverGroupResponse[groupId].info.name;

    // Show Role Delete Button
    var channeltree_list = document.getElementById("channeltree_list");

    rolelist.innerHTML = `
     <h2>Channel Sorting</h2>
        <h3>Groups</h3>

        <button id="saveSortingButton" style="display: block; margin-bottom: 4px; background-color: #289b28; color: white; font-weight: normal; border-radius: 4px; border: 1px solid transparent;"
                onclick="saveSorting()">
            Save updates
        </button>

        <button id="cancelSortingButton" style="margin-bottom: 4px; display: block;background-color: white; color: black; font-weight: normal; border-radius: 4px; border: 1px solid transparent;"
                onclick="window.location.reload()">
            Cancel updates
        </button>

        <br><br>
    `;

    document.getElementById("permissionlist").style.display = "block";

    currentRoleId = groupId;
    rolelist = document.getElementById("rolelist");



    // Sort all the Channels inside the current category
    const groupCollection = serverGroupResponse;
    let sortedGroups = Object.keys(groupCollection).sort((a, b) => {
        return groupCollection[b].info.sortId - groupCollection[a].info.sortId
    });

    // Foreach channel in the category, display it on the web page
    sortedGroups = sortedGroups.map((key) => groupCollection[key]);

    sortedGroups.forEach(group => {

        rolelist.insertAdjacentHTML("beforeend", `
                <div class="role-entry-container" id="${group.info.id}">
                       <div onclick="moveRoleUp(${group.info.id})" style="background-image: url('/img/up.png');background-size: cover;object-fit: cover;background-position: center center;
                       width: 10px; height: 10px;display: inline-block;"></div>
                       
                       <div onclick="moveRoleDown(${group.info.id})" style="background-image: url('/img/down.png');background-size: cover;object-fit: cover;background-position: center center;
                       width: 10px; height: 10px;display: inline-block;"></div>
                       
                        <p class="role-entry group-tree-entry" onclick="loadSingleGroupChannels('${group.info.id}')" id="${group.info.id}" style="display: inline-block;color: ${group.info.color};">
                            ${group.info.name}
                        </p>
                   </div>
        `);

    })


}
