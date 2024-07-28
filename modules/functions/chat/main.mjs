/*
    The functions here are basically the "core" of the chat app on the server side.
 */
import {serverconfig, xssFilters, colors} from "../../../index.mjs"
import {consolas} from "../io.mjs";
import {io} from "../../../index.mjs";
import {getMemberHighestRole, getUserBadges} from "./helper.mjs";
import {checkEmptyConfigVar} from "../main.mjs";

var serverconfigEditable = serverconfig;

export function getMemberLastOnlineTime(memberID){
    var lastOnline = serverconfig.servermembers[memberID].lastOnline / 1000;

    var today = new Date().getTime() / 1000;
    var diff = today - lastOnline;
    var minutesPassed = Math.round(diff / 60);

    return minutesPassed
}

export function hasPermission(id, permission, searchGroup = null){

    var foundPermission = false;
    var foundAdmin = false;
    var stopExecution = false;
    var userroles = resolveRolesByUserId(id);

    // This needs to be on top so it can check for administrator permissions
    // For each server role
    Object.keys(serverconfig.serverroles).forEach(function(role) {

        if(serverconfig.serverroles[role].members.includes(id)){

            if(serverconfig.serverroles[role].permissions["administrator"] == 1){
                // User is admin
                foundPermission = true;
                stopExecution = true;
                return true;

            }
            else if(serverconfig.serverroles[role].permissions[permission] == 1){
                // User has permission
                foundPermission = true;
                stopExecution = true;
                return true;
            }
            else if(serverconfig.serverroles[role].permissions[permission] == 0){
                if(stopExecution != true){
                    foundPermission = false;
                }
            }
            else{

            }
        }
        else{
        }
    });

    if(stopExecution == true){
        return foundPermission;
    }


    // Search Permission in specific group
    if(searchGroup != null){

        // For each Group Permission Role
        Object.keys(serverconfig.groups[searchGroup].permissions).forEach(function(permrole) {

            // If the user role includes the group role
            if(userroles.includes(permrole)){

                // For each permission of the group role
                Object.keys(serverconfig.groups[searchGroup].permissions[permrole]).forEach(function(perm) {

                    if(permission == perm && serverconfig.groups[searchGroup].permissions[permrole][perm] == 1) {
                        //console.log("Found permission " + perm);
                        //console.log("it was " + serverconfig.groups[searchGroup].permissions[permrole][perm])

                        foundPermission = true;
                        return true;
                    }
                    else  if(permission == perm && serverconfig.groups[searchGroup].permissions[permrole][perm] == 0) {
                        foundPermission = false
                    }
                });
            }

        });

        return foundPermission;
    }


    // For each group
    Object.keys(serverconfig.groups).forEach(function(group) {

        // For each Group Permission Role
        Object.keys(serverconfig.groups[group].permissions).forEach(function(permrole) {

            // If the user role includes the group role
            if(userroles.includes(permrole)){

                // For each permission of the group role
                Object.keys(serverconfig.groups[group].permissions[permrole]).forEach(function(perm) {

                    if(permission == perm && serverconfig.groups[group].permissions[permrole][perm] == 1) {

                        foundPermission = true;
                    }
                    else  if(permission == perm && serverconfig.groups[group].permissions[permrole][perm] == 0) {
                        foundPermission = false
                    }
                });
            }

        });


        userroles.forEach(userrole =>{

            if(serverconfig.groups[group].permissions[userrole] != null){
                if(serverconfig.groups[group].permissions[userrole][permission] == 1 ||
                    serverconfig.groups[group].permissions[userrole]["administrator"] == 1){
                    foundPermission = true;
                }
            }
        })
    });


    return foundPermission;
}

export function checkUserChannelPermission(channel, userId, perm){

    var found = false;
    var userRoles = resolveRolesByUserId(userId);

    var group = resolveGroupByChannelId(channel);
    var category = resolveCategoryByChannelId(channel);

    for(let i = 0; i < userRoles.length; i++){
        let role = userRoles[i];

        if(hasPermission(userId, "administrator")){
            found = true;
            return true;
        }
        if(hasPermission(userId, "manageChannels")){
            found = true;
            return true;
        }

        if(group != null && category != null && channel != null){
            
            // if the channel wasnt setup with the role check the default role permissions
            if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions.hasOwnProperty(role) == false){
                role = "0";
            }
            
            // if the role is present in the channel perms
            if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions[role].hasOwnProperty(perm)){

                // the role is allowed to see it
                if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions[role][perm] == 1){
                    found = true;
                }
                // when a channel is denying that role
                else if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions[role][perm] == 0){
                    if(found != true) found = false;
                    //consolas(colors.red("IS forbidden!"))
                    if(found != true) return false;
                }
            }
            // if the role isnt setup there dont allow entrance
            else{
                if(found != true) found = false
                //consolas("Channel does not have the property")
                return false;
            }


            if(hasPermission(userId, perm)){
                found = true;
            }
            // if the channel wasnt setup yet with perms dont show it
            else if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions == {} ){
                if(found != true) found = false;
                if(found != true) return false;
            }
        }
        else{
            found = true;
        }
    }

    return found;

}

export function resolveGroupByChannelId(id){

    /*
    console.log(" ");
    console.log(" ");
    console.log(" ");
    console.log("Resolving Group by Channel ID " + id);

     */

    var found = null;
    // Foreach Group
    Object.keys(serverconfig.groups).reverse().forEach(function(group) {

        //console.log(group);

        // For each Category
        Object.keys(serverconfig.groups[group].channels.categories).reverse().forEach(function(category) {


            //console.log(category);

            // For each Channel
            Object.keys(serverconfig.groups[group].channels.categories[category].channel).reverse().forEach(function(channelId) {

                if(channelId == id){
                    found = group;
                }
            });
        });
    });

    return found;
}

export function resolveCategoryByChannelId(id){

    var found = null;
    // Foreach Group
    Object.keys(serverconfig.groups).reverse().forEach(function(group) {

        //console.log(group);

        // For each Category
        Object.keys(serverconfig.groups[group].channels.categories).reverse().forEach(function(category) {


            //console.log(category);

            // For each Channel
            Object.keys(serverconfig.groups[group].channels.categories[category].channel).reverse().forEach(function(channelId) {


                if(channelId == id){
                    found = category;
                }
            });
        });
    });

    return found;
}

export function resolveRolesByUserId(id){

    var userRoles = [];

    // Get the keys of serverroles in reverse order
    var roles = Object.keys(serverconfig.serverroles).reverse();

    // Loop through each role
    for (var i = 0; i < roles.length; i++) {
        var role = roles[i];
        var roleConfig = serverconfig.serverroles[role];
    
        // Check if the role configuration has a members array and if the user ID exists in it
        if (roleConfig.members.includes(id)) {
            
            // If the userRoles array does not already include this role, add it
            if (!userRoles.includes(role)) {
                userRoles.push(role);
            }
        }
    }
    return userRoles;
}

export function resolveChannelById(id){

    var found = null;
    // Foreach Group
    Object.keys(serverconfig.groups).reverse().forEach(function(group) {

        // For each Category
        Object.keys(serverconfig.groups[group].channels.categories).reverse().forEach(function(category) {

            // For each Channel
            Object.keys(serverconfig.groups[group].channels.categories[category].channel).reverse().forEach(function(channelId) {

                if(channelId == id){
                    found = serverconfig.groups[group].channels.categories[category].channel[id];
                    return serverconfig.groups[group].channels.categories[category].channel[id];
                }
            });
        });
    });

    return found;
}

export async function getMemberProfile(id){

    var memberUsername = xssFilters.inHTMLData(serverconfig.servermembers[id].name);
    var memberStatus = xssFilters.inHTMLData(serverconfig.servermembers[id].status);
    var memberAboutme = xssFilters.inHTMLData(serverconfig.servermembers[id].aboutme);
    var memberIcon = xssFilters.inHTMLData(serverconfig.servermembers[id].icon);
    var memberBanner = xssFilters.inHTMLData(serverconfig.servermembers[id].banner);
    var memberJoined = xssFilters.inHTMLData(serverconfig.servermembers[id].joined);
    var memberLastOnline = xssFilters.inHTMLData(serverconfig.servermembers[id].lastOnline);
    var isMuted = xssFilters.inHTMLData(serverconfig.servermembers[id].isMuted);

    // Important mhm
    memberJoined = Number(memberJoined);
    memberLastOnline = Number(memberLastOnline);
    isMuted = Number(isMuted);

    // Show a small badge if the user is muted
    var mutedBadge = "";
    if(isMuted == 1)
        mutedBadge = `<br><code class="joined" style="color: indianred; border: 1px solid indianred;">Muted</code>`

    // Handle User Badges
    return await getUserBadges(id).then(result => {

        var badgeCode = "";
        if(result != null){

            var badges = JSON.parse(result);


            Object.keys(badges).forEach(function (badge) {
                badgeCode += `<img class="profile_badge" src="https://raw.githubusercontent.com/hackthedev/dcts-shipping/main/badges/${badges[badge].icon}.png" title="${badges[badge].display}" />`;
            });
        }

        var profile = `
        <div id="profile_banner" style="background-image: url('${memberBanner}')"></div>
    
        <div id="profile_pfp_container">
            <div id="profile_icon" style="background-image: url('${memberIcon}');"></div>
            
            <div id="profile_badge_container">
                ${badgeCode}
            </div>
        
    
        <div id="profile_content">
            <div id="profile_username"><h2 style="margin-bottom: 0 !important;">${memberUsername}</h2></div>
            <div id="profile_status">${memberStatus}</div>
            <hr>
    
            
            <h2 class="profile_headline">About Me</h2>
            <div class="profile_aboutme">            
                ${memberAboutme}<br><br>
                <code class="joined">Joined ${new Date(memberJoined).toLocaleString("narrow")}</code><br>
                <code class="joined">Last Online ${new Date(memberLastOnline).toLocaleString("narrow")}</code>
                ${mutedBadge}
            </div>
            <hr>
            
    
            <h2 class="profile_headline">Roles</h2>
            <div id="profile_roles">`;


        // Collect roles into an array
        let roles = Object.keys(serverconfig.serverroles).map(role => ({
            id: role,
            ...serverconfig.serverroles[role].info
        }));

        // Sort roles by sortId
        roles.sort((a, b) => a.sortId - b.sortId);
        roles = roles.reverse(); // otherwise its shown upside down

        // Iterate through sorted roles and build profile HTML string
        for (let i = 0; i < roles.length; i++) {
            var role = roles[i];
            var roleColor = role.color;
            var roleName = role.name;

            if (serverconfig.serverroles[role.id].members.includes(id)) {
                profile += `<code class="role" id="${role.id}"><div class="role_color" style="background-color: ${roleColor};"></div>${roleName}</code>`;
            }
        }
                        

            /*
        Object.keys(serverconfig.serverroles).reverse().forEach(function (role) {
            var roleColor = serverconfig.serverroles[role].info.color;
            var roleName = serverconfig.serverroles[role].info.name;

            if (serverconfig.serverroles[role].members.includes(id)) {
                profile += `<code class="role" id="${role}"><div class="role_color" style="background-color: ${roleColor};"></div>${roleName}</code>`;
            }
        });
        */

        // Add Role Button
        profile += `<code style="cursor: pointer;" onclick="addRoleFromProfile(id);" class="role" id="addRole-${id}">+</code>`;
        profile += `</div>
            </div>
        </div>`;

        return profile;
    });

    return codi;
}

export function getMemberList(member, channel){

    var code = "";

    var members = serverconfig.servermembers;
    var roles = serverconfig.serverroles;

    var sortedRoles = [];
    var offlineMember = []

    Object.keys(roles).reverse().forEach(function(role) {
        sortedRoles[roles[role].info.sortId] = roles[role];
    });

    // Foreach role
    sortedRoles = sortedRoles.reverse();
    sortedRoles.forEach(role =>{

        var noMembersInRole = true;
        // Role ID:
        // role

        // Role Object
        // roles[Role]


        // If role display is on
        if(role.info.displaySeperate == 1){

            // Foreach Role Member
            Object.keys(members).forEach(function(member) {

                // Member ID:
                // member
                //
                // Member Object
                // members[member]

                // Do not show banned users
                if(serverconfig.servermembers[member].isBanned == 1){
                    return;
                }

                // check here for highest role
                var highestMemberRole = getMemberHighestRole(member);

                // If member is in role and the role is set to be shown
                if((role.members.includes(member)  && role.info.displaySeperate == 1) ||
                    role.info.id == 1){

                    // if role is the "Offline" role and member is gone for more then 5 minutes
                    if(role.info.id == 1 && getMemberLastOnlineTime(member) > 5){
                        // Add member to offline list (if not already done)
                        if(!offlineMember.includes(member)){
                            offlineMember.push(member);
                        }
                    }

                    // If the user has the permission to see the channel
                    if(checkUserChannelPermission(channel, member, "viewChannel") == true){

                        // If role should be displayed and
                        // the current role is not the member's highest role and (dont remember why)
                        // the role is not the "Offline Role", then return lol
                        if(highestMemberRole.info.displaySeperate == 1 && role.info.id != highestMemberRole.info.id && role.info.id != 1){
                            return;
                        }

                        // Gray Color effect for offline members in the member list
                        // Should also avoid duplicate listing in role AND offline for memberlist
                        var extraClassOffline = "";
                        if(role.info.id != 1){ // != Offline
                            if(getMemberLastOnlineTime(member) > 5){
                                return;
                            }
                        }
                        else{
                            if(getMemberLastOnlineTime(member) < 5){
                                return;
                            }
                            else{
                                extraClassOffline = "offline_pfp";
                            }
                        }

                        // This can hide offline members from the list
                        // Could be useful for big servers
                        // Will be a future feature
                        //if(offlineMember.includes(member)){
                        //    return;
                        //}

                        // hide online members from offline section (?)
                        if(offlineMember.includes(member)){
                            offlineMember.pop(member);
                        }

                        // If the role object itself wasnt yet listed
                        if(noMembersInRole == true){

                            // Add the code for the role "header"
                            code += `<div class="infolist-role" title="${role.info.name}" style="color: ${role.info.color};">
                                    ${role.info.name}
                                    <hr style="margin-bottom: 16px;border: 1px solid ${role.info.color};">
                                </div>`;

                            // Flip the bool because now we want to add all members of this role
                            // until we're going through the next role
                            noMembersInRole = false;
                        }

                        // Making sure just in case
                        members[member].name = xssFilters.inHTMLData(members[member].name);
                        members[member].status = xssFilters.inHTMLData(members[member].status);
                        members[member].icon = xssFilters.inHTMLData(members[member].icon);
                        members[member].id = xssFilters.inHTMLData(members[member].id);

                        // If user is muted make it somehow visually known
                        var nameStyle = `${members[member].name}`
                        var statusStyle = `${members[member].status}`


                        if(members[member].isMuted){
                            nameStyle = `<s style="color: indianred;"><span style="font-style: italic;color:indianred">${members[member].name}</span></s>`;
                            statusStyle = `<s style="color: indianred;"><span style="font-style: italic;color:indianred">${members[member].status}</span></s>`;
                            extraClassOffline = "offline_pfp";
                        }


                        code += `<div class="memberlist-container" id="${members[member].id}">
                                <img class="memberlist-img ${extraClassOffline}" id="${members[member].id}" src="${members[member].icon}" onerror="this.src = '/img/default_pfp.png'">
                                <div class="memberlist-member-info name" 
                                onclick="getMemberProfile('${members[member].id}');" id="${members[member].id}" 
                                style="color: ${role.info.color};">
                                    ${nameStyle}
                                </div>
                                <div class="memberlist-member-info status" id="${members[member].id}" style="color: ${role.info.color};">
                                    ${statusStyle}
                                </div>
                            </div>`;

                    }

                }

            });
        }
    });

    return code;
}

export function getGroupList(member){

    member.id = xssFilters.inHTMLData(member.id)
    member.token = xssFilters.inHTMLData(member.token)

    var code = "";
    var groups = serverconfig.groups;
    var addedGroups = []

    var userroles = resolveRolesByUserId(member.id);

    const groupCollection = groups;
    let sortedGroups = Object.keys(groupCollection).sort((a, b) => {
        return groupCollection[b].info.sortId - groupCollection[a].info.sortId
    });

    // Foreach channel in the category, display it on the web page
    sortedGroups = sortedGroups.map((key) => groupCollection[key]);
    sortedGroups.forEach(group => {

        // Admin
        if(hasPermission(member.id, "manageGroups") &&
            addedGroups.includes(group.info.id) == false
        ){
            addedGroups.push(group.info.id);
            code += `
                    <a onclick="setUrl('?group=${group.info.id}');" id="group-entry-${group.info.id}">
                        <div class="group-entry-marker" id="group-marker-${group.info.id}"></div>
                        <div class="server-entry">
                           <img title="${group.info.name}" id="${group.info.id}" class="server-icon" src="${group.info.icon}">
                        </div>
                    </a>`;
        }
        else {
            //reverse()

            // Normal user
            userroles.forEach(role => {
                try {
                    if (group.permissions[role].viewGroup == 1 &&
                        addedGroups.includes(group.info.id) == false
                    ) {
                        addedGroups.push(group.info.id);
                        code += `<a onclick="setUrl('?group=${group.info.id}');"><div class="server-entry">
                                    <img title="${group.info.name}" id="${group.info.id}" class="server-icon" src="${group.info.icon}">
                                </div></a>`;
                    }
                } catch {

                }
            });
        }

    });


    return code;
}

export function getChannelTree(member){

    member.id = xssFilters.inHTMLData(member.id)
    member.token = xssFilters.inHTMLData(member.token)
    member.group = xssFilters.inHTMLData(member.group)

    var group = member.group;

    var addedChannels = [];
    var addedCategories = [];

    var treecode = `<h2>${serverconfig.groups[group].info.name}</h2><hr>`;

    var groups = serverconfig.groups;
    var roles = serverconfig.serverroles;

    if(group == null || groups[group] == null){
        group = 0;
    }

    var groupCategories = groups[group].channels.categories;
    var showedCategory = false;

    const catCollection = serverconfig.groups[group].channels.categories;
    let sortedCats = Object.keys(catCollection).sort((a, b) => {
        return catCollection[b].info.sortId - catCollection[a].info.sortId
    });


    var added_channels = [];

    // Foreach channel in the category, display it on the web page
    sortedCats = sortedCats.map((key) => catCollection[key]);
    sortedCats.forEach(cat => {

        showedCategory = false;

        // Show Category if can edit channels (grammar 101)
        if(hasPermission(member.id, "manageChannels", member.group) == true ){
            // Add Category
            treecode +=  "<details open>";
            treecode += `<summary class="categoryTrigger" id="category-${cat.info.id}" style="color: #ABB8BE;">${cat.info.name}</summary>`;
            treecode += `<ul>`

            // change flag that it was already showed
            showedCategory = true;
        }

        // Sort Categories based on sortID (Was a real pain to find out)
        const chanCollection = serverconfig.groups[group].channels.categories[cat.info.id].channel;
        let sortedChans = Object.keys(chanCollection).sort((a, b) => {
            return chanCollection[b].sortId - chanCollection[a].sortId
        });

        // For each Category, sort the category's channels
        sortedChans = sortedChans.map((key) => chanCollection[key]);
        sortedChans.forEach(chan => {

            // if has the permission to view the current group
            // and the category wasnt already shown
            // and the category has at least one channel
            // and the user is allowed to view the channel
            if (
                hasPermission(member.id, "viewGroup", member.group) &&
                showedCategory == false && sortedChans.length > 0 &&
                checkUserChannelPermission(chan.id, member.id, "viewChannel")
            ){
                // Add Category
                treecode +=  "<details open>";
                treecode += `<summary class="categoryTrigger" id="category-${cat.info.id}" style="color: #ABB8BE;">${cat.info.name}</summary>`;
                treecode += `<ul>`
                showedCategory = true;
            }

            // Foreach server role
            Object.keys(roles).forEach(function(role) {

                // if the member is part of the role
                if(roles[role].members.includes(member.id)){

                    // if the user has the permission to either view the channel or manage channels
                    if(checkUserChannelPermission(chan.id, member.id, "viewChannel") || hasPermission(member.id, "manageChannels", member.group)){


                        if(added_channels.includes(chan.id + "_" + chan.name) == false){

                            // if text channel
                            if(chan.type == "text"){
                                treecode += `<a onclick="setUrl('?group=${group}&category=${cat.info.id}&channel=${chan.id}')"><li class="channelTrigger" id="channel-${chan.id}" style="color: #ABB8BE;">⌨ ${chan.name}</li></a>`;

                                added_channels.push(chan.id + "_" + chan.name)
                            }
                            else if(chan.type == "voice"){
                                treecode += `<a onclick="setUrl('?group=${group}&category=${cat.info.id}&channel=${chan.id}', true);"><li class="channelTrigger" id="channel-${chan.id}" style="color: #ABB8BE;">🎤 ${chan.name}</li></a>`;
                                added_channels.push(chan.id + "_" + chan.name)
                            }
                        }

                    }
                    else{
                        //console.log(`User ${serverconfig.servermembers[member.id].name} was denied`)
                    }
                }
            });

        });


        treecode += "</ul>";
        treecode += "</details>";

    });

    return treecode;
}

export function banUser(member){
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    var duration = member.time;
    var bannedUntil = new Date().getTime();

    if(isNaN(duration) == true){
        sendMessageToUser(socket.id, JSON.parse(
            `{
                                "title": "Invalid Duration!",
                                "message": "Enter a number like 1,2,3 or leave it completely empty",
                                "buttons": {
                                    "0": {
                                        "text": "Ok",
                                        "events": ""
                                    }
                                },
                                "type": "error",
                                "popup_type": "confirm"
                            }`));
        return;
    }


    if(duration == null || duration <= 0){
        duration = -1;
        bannedUntil += bannedUntil * 2
    }
    else{
        bannedUntil += (86400 * duration) * 1000;
        //bannedUntil = bannedUntil;
    }

    // Ban IP of User
    var ip = socket.handshake.address;
    if(!serverconfig.ipblacklist.hasOwnProperty(ip)){

        // Add IP to Blacklist
        //serverconfig.ipblacklist.push(ip);

        // Set Member to be banned
        serverconfig.servermembers[member.target].isBanned = 1;

        //console.log(bannedUntil);

        // Add member to banlist
        serverconfigEditable.banlist[member.target] = JSON.parse(`
                        {
                            "bannedBy": "${member.id}",
                            "reason": "${member.reason}",
                            "until": ${bannedUntil}
                        }
                        `);

        saveConfig(serverconfigEditable);


        consolas(` User ${serverconfigEditable.servermembers[member.target].name} (IP ${ip}) was added to the blacklist because he was banned`.yellow);
        consolas(` Reason: ${member.reason}`);
        consolas(` Duration: ${duration}`);

        return true;
    }
}

export function muteUser(member){
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    var duration = member.time;

    if(isNaN(duration) == true){
        sendMessageToUser(socket.id, JSON.parse(
            `{
                                "title": "Invalid Duration!",
                                "message": "Enter a number like 1,2,3 or leave it completely for permanent mute until removed",
                                "buttons": {
                                    "0": {
                                        "text": "Ok",
                                        "events": ""
                                    }
                                },
                                "type": "error",
                                "popup_type": "confirm"
                            }`));
        return null;
    }

    if(duration == null || duration <= 0){
        duration = -1;
    }
    else{
        duration = new Date().getTime()+((60 * duration) * 1000);
    }

    if(!serverconfig.mutelist.hasOwnProperty(member.target)){

        // used for checks
        serverconfigEditable.servermembers[member.target].isMuted = 1;

        // Add member to mutelist
        serverconfigEditable.mutelist[member.target] = JSON.parse(`
                        {
                            "mutedBy": "${member.id}",
                            "reason": "${member.reason}",
                            "duration": ${duration}
                        }
                        `);

        saveConfig(serverconfigEditable);

        consolas(` User ${serverconfigEditable.servermembers[member.target].name} (IP ${ip}) was muted`.yellow);
        consolas(` Reason: ${member.reason}`);
        consolas(` Duration: ${duration}`);

        io.emit("updateMemberList");

        return duration;
    }
    else{
        serverconfigEditable.servermembers[member.target].isMuted = 1;
        serverconfigEditable.mutelist[member.target].duration = duration;
        saveConfig(serverconfigEditable);

        io.emit("updateMemberList");

        return duration;
    }

    return true;
}