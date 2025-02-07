/*
    The functions here are basically the "core" of the chat app on the server side.
 */
import { serverconfig, xssFilters, colors, saveConfig } from "../../../index.mjs"
import { consolas } from "../io.mjs";
import { io } from "../../../index.mjs";
import { getMemberHighestRole, getUserBadges } from "./helper.mjs";
import { checkBool, checkEmptyConfigVar, copyObject } from "../main.mjs";

var serverconfigEditable = serverconfig;

export function getMemberLastOnlineTime(memberID) {
    var lastOnline = serverconfig.servermembers[memberID].lastOnline / 1000;

    var today = new Date().getTime() / 1000;
    var diff = today - lastOnline;
    var minutesPassed = Math.round(diff / 60);

    return minutesPassed
}

export function hasPermission(userId, permissions, channelOrGroupId = null) {
    const userRoles = resolveRolesByUserId(userId);

    // Ensure permissions is an array
    const permissionsToCheck = Array.isArray(permissions) ? permissions : [permissions];

    // Sort roles by their sortId in descending order (highest priority first)
    const sortedRoles = userRoles
        .map((roleId) => ({
            id: roleId,
            sortId: serverconfig.serverroles[roleId]?.info?.sortId || 0,
        }))
        .sort((a, b) => b.sortId - a.sortId);

    // Helper to check permissions for sorted roles in a permissions object
    function checkPermissions(sortedRoles, permissionsObj) {
        let result = null; // Tracks whether permissions are granted or denied

        for (const { id: role } of sortedRoles) {
            const rolePermissions = permissionsObj[role];
            if (rolePermissions) {
                // Deny takes precedence in conflicts
                if (permissionsToCheck.some((perm) => rolePermissions[perm] === 0)) {
                    result = false;
                }
                // Grant if allowed
                if (permissionsToCheck.every((perm) => rolePermissions[perm] === 1)) {
                    result = true;
                }
            }
        }
        return result; // Return the final decision (true/false) based on precedence
    }

    // 1. Check if the user has "administrator" permission at the server level (global bypass)
    for (const role of userRoles) {
        const roleConfig = serverconfig.serverroles[role];
        if (roleConfig?.permissions?.administrator === 1) {
            return true; // Administrator bypasses all checks
        }
    }

    // 2. Check if the provided ID is a channel or a group
    const group = resolveGroupByChannelId(channelOrGroupId);
    if (group) {
        // Handle channel permissions
        const category = resolveCategoryByChannelId(channelOrGroupId);
        if (category) {
            const channelPermissions =
                serverconfig.groups[group]?.channels?.categories[category]?.channel[channelOrGroupId]?.permissions;

            if (channelPermissions) {
                const channelResult = checkPermissions(sortedRoles, channelPermissions);
                if (channelResult !== null) return channelResult; // Return if permissions are explicitly set
            }
        }
    } else if (serverconfig.groups[channelOrGroupId]) {
        // Handle group permissions if the ID corresponds to a valid group
        const groupPermissions = serverconfig.groups[channelOrGroupId]?.permissions;

        if (groupPermissions) {
            const groupResult = checkPermissions(sortedRoles, groupPermissions);
            if (groupResult !== null) return groupResult; // Return if permissions are explicitly set
        }
    }

    // 3. Check group permissions for all groups (middle priority)
    for (const groupId in serverconfig.groups) {
        const groupPermissions = serverconfig.groups[groupId]?.permissions || {};
        const groupResult = checkPermissions(sortedRoles, groupPermissions);
        if (groupResult !== null) return groupResult; // Return if permissions are explicitly set
    }

    // 4. Check server role permissions (lowest priority)
    for (const { id: role } of sortedRoles) {
        const roleConfig = serverconfig.serverroles[role];
        if (roleConfig?.permissions) {
            // Deny if any permission is explicitly set to 0
            if (permissionsToCheck.some((perm) => roleConfig.permissions[perm] === 0)) {
                return false;
            }
            // Grant if all permissions are explicitly allowed
            if (permissionsToCheck.every((perm) => roleConfig.permissions[perm] === 1)) {
                return true;
            }
        }
    }

    // Explicitly deny if no permissions are set
    return false;
}



export function checkUserChannelPermission(channel, userId, perms) {

    return hasPermission(userId, perms, channel);

    /* DEPRECATED */

    const userRoles = resolveRolesByUserId(userId);
    const group = resolveGroupByChannelId(channel);
    const category = resolveCategoryByChannelId(channel);

    // Validate if the channel, group, and category are properly configured
    if (!group || !category || !channel) {
        return false; // Deny if any required identifier is missing
    }

    const channelPermissions =
        serverconfig.groups[group]?.channels?.categories[category]?.channel[channel]?.permissions;

    if (!channelPermissions) {
        return false; // Deny if no permissions are configured for the channel
    }

    // Ensure `perms` is an array, even if a single permission is passed
    const permissionsToCheck = Array.isArray(perms) ? perms : [perms];

    // Check for "administrator" permission in any role
    for (const role of userRoles) {
        const effectiveRole = channelPermissions.hasOwnProperty(role) ? role : "0";

        if (channelPermissions[effectiveRole]?.["administrator"] === 1) {
            return true; // If the user has "administrator", grant access immediately
        }
    }

    // Check all specified permissions for each user role
    for (const role of userRoles) {
        const effectiveRole = channelPermissions.hasOwnProperty(role) ? role : "0";

        // Check if all required permissions are explicitly set to 1 for the role
        const allPermissionsGranted = permissionsToCheck.every(
            (perm) => channelPermissions[effectiveRole]?.[perm] === 1
        );

        // If all permissions are granted for this role, return true
        if (allPermissionsGranted) {
            return true;
        }

        // If any permission is explicitly denied (0), deny access immediately
        const anyPermissionDenied = permissionsToCheck.some(
            (perm) =>
                channelPermissions[effectiveRole]?.[perm] === 0 ||
                !(perm in channelPermissions[effectiveRole])
        );

        if (anyPermissionDenied) {
            return false;
        }
    }

    // Deny by default if no role grants all the required permissions
    return false;
}



export function resolveGroupByChannelId(id) {
    for (const group of Object.keys(serverconfig.groups).reverse()) {
        const categories = serverconfig.groups[group].channels.categories;
        for (const category of Object.keys(categories).reverse()) {
            const channels = categories[category].channel;
            if (channels.hasOwnProperty(id)) {
                return group; // Return as soon as the group is found
            }
        }
    }
    return null; // Return null if no group is found
}


export function resolveCategoryByChannelId(id) {
    for (const group of Object.keys(serverconfig.groups).reverse()) {
        const categories = serverconfig.groups[group].channels.categories;
        for (const category of Object.keys(categories).reverse()) {
            const channels = categories[category].channel;
            if (channels.hasOwnProperty(id)) {
                return category; // Return as soon as the category is found
            }
        }
    }
    return null; // Return null if no category is found
}


export function resolveRolesByUserId(id) {
    const userRoles = [];
    const roles = Object.keys(serverconfig.serverroles).reverse();

    for (const role of roles) {
        const roleConfig = serverconfig.serverroles[role];
        if (roleConfig.members.includes(id) && !userRoles.includes(role)) {
            userRoles.push(role); // Add role if user is a member and not already included
        }
    }

    return userRoles;
}


export function resolveChannelById(id) {
    for (const group of Object.keys(serverconfig.groups).reverse()) {
        const categories = serverconfig.groups[group].channels.categories;
        for (const category of Object.keys(categories).reverse()) {
            const channels = categories[category].channel;
            if (channels.hasOwnProperty(id)) {
                return channels[id]; // Return the channel configuration as soon as it's found
            }
        }
    }
    return null; // Return null if no channel is found
}


export async function getMemberProfile(id) {

    var memberUsername = xssFilters.inHTMLData(serverconfig.servermembers[id].name);
    var memberStatus = xssFilters.inHTMLData(serverconfig.servermembers[id].status);
    var memberAboutme = xssFilters.inHTMLData(serverconfig.servermembers[id].aboutme);
    var memberIcon = xssFilters.inHTMLData(serverconfig.servermembers[id].icon);
    var memberBanner = xssFilters.inHTMLData(serverconfig.servermembers[id].banner);
    var memberJoined = xssFilters.inHTMLData(serverconfig.servermembers[id].joined);
    var memberLastOnline = xssFilters.inHTMLData(serverconfig.servermembers[id].lastOnline);
    var isMuted = xssFilters.inHTMLData(serverconfig.servermembers[id].isMuted);
    var isBanned = xssFilters.inHTMLData(serverconfig.servermembers[id].isBanned);

    // Important mhm
    memberJoined = Number(memberJoined);
    memberLastOnline = Number(memberLastOnline);
    isMuted = Number(isMuted);

    // Show a small badge if the user is muted
    var mutedBadge = "";
    if (isMuted == 1)
        mutedBadge = `<br><code class="joined" style="color: indianred; border: 1px solid indianred;">Muted</code>`

    var banBadge = "";
    if (isBanned == 1)
        banBadge = `<br><code class="joined" style="color: indianred; border: 1px solid indianred;">Banned</code>`

    // Handle User Badges
    return await getUserBadges(id).then(result => {

        var badgeCode = "";
        if (result != null) {

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
                ${mutedBadge} ${banBadge}
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

export function getMemberList(member, channel) {

    var code = "";

    var members = serverconfig.servermembers;
    var roles = serverconfig.serverroles;

    var sortedRoles = [];
    var offlineMember = [];
    var bannedMember = [];

    Object.keys(roles).reverse().forEach(function (role) {
        sortedRoles[roles[role].info.sortId] = roles[role];
    });

    // Foreach role
    sortedRoles = sortedRoles.reverse();
    sortedRoles.forEach(role => {

        var noMembersInRole = true;
        // Role ID:
        // role

        // Role Object
        // roles[Role]


        // If role display is on
        if (role.info.displaySeperate == 1) {

            // Foreach Role Member
            Object.keys(members).forEach(function (member) {

                // Member ID:
                // member
                //
                // Member Object
                // members[member]

                // Do not show banned users
                if (serverconfig.servermembers[member].isBanned == 1) {
                    if(!bannedMember.includes(member)) bannedMember.push(member);

                    if(checkBool(serverconfig.serverinfo.moderation.bans.memberListHideBanned, "bool") == true) return;
                }

                // check here for highest role
                var highestMemberRole = getMemberHighestRole(member);

                // If member is in role and the role is set to be shown
                if ((role.members.includes(member) && role.info.displaySeperate == 1) ||
                    role.info.id == 1) {

                    // if role is the "Offline" role and member is gone for more then 5 minutes
                    if (role.info.id == 1 && getMemberLastOnlineTime(member) > 5) {
                        // Add member to offline list (if not already done)
                        if (!offlineMember.includes(member)) {
                            offlineMember.push(member);
                        }
                    }

                    // If the user has the permission to see the channel
                    if (hasPermission(member, "viewChannel", channel) == true) {

                        // If role should be displayed and
                        // the current role is not the member's highest role and (dont remember why)
                        // the role is not the "Offline Role", then return lol
                        if (highestMemberRole.info.displaySeperate == 1 && role.info.id != highestMemberRole.info.id && role.info.id != 1) {
                            return;
                        }

                        // Gray Color effect for offline members in the member list
                        // Should also avoid duplicate listing in role AND offline for memberlist
                        var extraClassOffline = "";
                        if (role.info.id != 1) { // != Offline
                            if (getMemberLastOnlineTime(member) > 5) {
                                return;
                            }
                        }
                        else {
                            if (getMemberLastOnlineTime(member) < 5) {
                                return;
                            }
                            else {
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
                        if (offlineMember.includes(member)) {
                            offlineMember.pop(member);
                        }

                        // If the role object itself wasnt yet listed
                        if (noMembersInRole == true /*&& (members[member].isMuted == false && members[member].isBanned == false)*/) {

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

                        // If user is muted or banned make it somehow visually known
                        var nameStyle = `${members[member].name}`
                        var statusStyle = `${members[member].status}`

                        if (members[member].isMuted || members[member].isBanned) {
                            let displayColor = "white";
                            if(members[member].isMuted) displayColor = "grey";
                            if(members[member].isBanned) displayColor = "indianred";

                            nameStyle = `<s style="color: ${displayColor};"><span style="font-style: italic;color:${displayColor}">${members[member].name}</span></s>`;
                            statusStyle = `<s style="color: ${displayColor};"><span style="font-style: italic;color:${displayColor}">${members[member].status}</span></s>`;
                            extraClassOffline = "offline_pfp";

                            //if(role.info.id == "1") return;
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

export function getGroupList(member) {

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
        if (hasPermission(member.id, "manageGroups") &&
            addedGroups.includes(group.info.id) == false
        ) {
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

function setJson(obj, path, value) {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
            current[keys[i]] = {}; // Ensure parent object exists
        }
        current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = copyObject(value); // Deep copy before setting
}


export function getChannelTree(member) {

    member.id = xssFilters.inHTMLData(member.id)
    member.token = xssFilters.inHTMLData(member.token)
    member.group = xssFilters.inHTMLData(member.group)

    var group = member.group;

    var addedChannels = [];
    var addedCategories = [];

    var treecode = "";
    let addedInitialCode = false;

    var groups = serverconfig.groups;
    var roles = serverconfig.serverroles;

    if (group == null || groups[group] == null) {
        group = 0;
    }

    var groupCategories = groups[group].channels.categories;
    var showedCategory = false;

    const catCollection = serverconfig.groups[group].channels.categories;
    let sortedCats = Object.keys(catCollection).sort((a, b) => {
        return catCollection[b].info.sortId - catCollection[a].info.sortId
    });


    var added_channels = [];
    let channeltree = {};


    // Foreach channel in the category, display it on the web page
    sortedCats = sortedCats.map((key) => catCollection[key]);
    sortedCats.forEach(cat => {

        showedCategory = false;

        // Show Category if can edit channels (grammar 101)
        if (hasPermission(member.id, "manageChannels", group) == true) {

            // show group name etc if allowed to
            if(!addedInitialCode) treecode = `<h2>${serverconfig.groups[group].info.name}</h2><hr>`; addedInitialCode = true;

            // Add Category
            treecode += "<details open draggable='true'>";
            treecode += `<summary class="categoryTrigger" id="category-${cat.info.id}" style="color: #ABB8BE;">${cat.info.name}</summary>`;
            treecode += `<ul>`

            // change flag that it was already showed
            showedCategory = true;

            setJson(channeltree, `groups.${group}.info`, serverconfig.groups[group].info)
            setJson(channeltree, `groups.${group}.categories.${cat.info.id}.info`, serverconfig.groups[group].channels.categories[cat.info.id].info)
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
                hasPermission(member.id, ["viewGroup"], group) &&
                showedCategory == false && sortedChans.length > 0 &&
                hasPermission(member.id, ["viewChannel"], chan.id)
            ) {
                // show group name etc if allowed to
                if(!addedInitialCode) treecode = `<h2>${serverconfig.groups[group].info.name}</h2><hr>`; addedInitialCode = true;

                // Add Category
                treecode += "<details open>";
                treecode += `<summary class="categoryTrigger" id="category-${cat.info.id}" style="color: #ABB8BE;">${cat.info.name}</summary>`;
                treecode += `<ul>`
                showedCategory = true;
                
                setJson(channeltree, `groups.${group}.info`, serverconfig.groups[group].info)
                setJson(channeltree, `groups.${group}.categories.${cat.info.id}.info`, serverconfig.groups[group].channels.categories[cat.info.id].info)
            }

            // Foreach server role
            Object.keys(roles).forEach(function (role) {

                // if the member is part of the role
                if (roles[role].members.includes(member.id)) {

                    // if the user has the permission to either view the channel or manage channels
                    if (hasPermission(member.id, "viewChannel", chan.id) || hasPermission(member.id, "manageChannels", member.group)) {

                        
                        setJson(channeltree, `groups.${group}.categories.${cat.info.id}.channel.${chan.id}`, serverconfig.groups[group].channels.categories[cat.info.id].channel[chan.id])

                        if (added_channels.includes(chan.id + "_" + chan.name) == false) {

                            // if text channel
                            if (chan.type == "text") {
                                treecode += `<a onclick="setUrl('?group=${group}&category=${cat.info.id}&channel=${chan.id}')"><li class="channelTrigger sortable-channels" draggable='true' id="channel-${chan.id}" style="color: #ABB8BE;">⌨ ${chan.name}</li></a>`;

                                added_channels.push(chan.id + "_" + chan.name)
                            }
                            else if (chan.type == "voice") {
                                treecode += `<a onclick="setUrl('?group=${group}&category=${cat.info.id}&channel=${chan.id}', true);"><li class="channelTrigger sortable-channels" draggable='true' id="channel-${chan.id}" style="color: #ABB8BE;">🎤 ${chan.name}</li></a>`;
                                added_channels.push(chan.id + "_" + chan.name)
                            }
                        }

                    }
                    else {
                        //console.log(`User ${serverconfig.servermembers[member.id].name} was denied`)
                    }
                }
            });

        });


        treecode += "</ul>";
        treecode += "</details>";

    });

    return channeltree;
}

export function banUser(socket, member) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    let ip = socket.handshake.address;

    // get member ban date
    let bannedUntil = getNewDate(member.duration).getTime();

    // Set Member to be banned
    serverconfig.servermembers[member.target].isBanned = 1;

    // Add member to banlist
    serverconfigEditable.banlist[member.target] = JSON.parse(`
                    {
                        "bannedBy": "${member.id}",
                        "reason": "${member.reason}",
                        "until": ${bannedUntil},
                        "ip": "${ip}"
                    }
                    `);

    saveConfig(serverconfigEditable);

    consolas(` User ${serverconfigEditable.servermembers[member.target].name} (IP ${ip}) was added to the blacklist because he was banned`.yellow);
    consolas(` Reason: ${member.reason}`);
    consolas(` Duration: ${bannedUntil}`);

    return banIp(socket, bannedUntil);
}

export function banIp(socket, durationTimestamp) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);
    
    // Ban IP of User
    let ip = socket.handshake.address;
    if (!serverconfigEditable.ipblacklist.hasOwnProperty(ip)) {
        // Add IP to Blacklist
        serverconfigEditable.ipblacklist[ip] = durationTimestamp;
        saveConfig(serverconfigEditable);

        console.log(`IP ${ip} banned until ${durationTimestamp}`)
        return true;
    }
}

export function unbanIp(socket) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);
    
    let ip = socket.handshake.address;
    if (serverconfigEditable.ipblacklist.hasOwnProperty(ip)) {
        delete serverconfigEditable.ipblacklist[ip];
        saveConfig(serverconfigEditable);
    }
    else{
        console.log("does not have property " + ip)
    }
}

export function findInJson(obj, keyToFind, valueToFind, returnPath = false) {
    let result = null;
    let foundPath = "";

    function search(currentObj, currentPath = "") {
        if (typeof currentObj !== "object" || currentObj === null) {
            return;
        }

        for (const key in currentObj) {
            let newPath = currentPath ? `${currentPath}.${key}` : key; // ✅ Build full path

            if (key === keyToFind && currentObj[key] === valueToFind) {
                if (currentPath.includes("channel")) { // ✅ Ensure it's a CHANNEL path
                    result = currentObj; 
                    foundPath = currentPath; // ✅ Fix: Store only the path without `.id`
                    return;
                }
            }

            // ✅ Recursively search nested objects
            if (typeof currentObj[key] === "object" && currentObj[key] !== null) {
                search(currentObj[key], newPath);
                if (result) return; // ✅ Stop recursion when found
            }
        }
    }

    search(obj);

    return returnPath ? foundPath : result; // ✅ Return full JSON path if requested
}






export function formatDateTime(date) {
    if (!(date instanceof Date)) {
        throw new Error("Invalid date: Please pass a valid Date object.");
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        month: "long",   // Full month name (e.g., January)
        day: "numeric",  // Numeric day (e.g., 19)
        year: "numeric", // Full year (e.g., 2025)
        hour: "numeric", // Hour (12-hour format)
        minute: "numeric", // Minute
        hour12: false     // Use 12-hour format
    });

    let formattedDate = formatter.format(date);

    // Replace "at" with a comma, if present
    return formattedDate.replace(" at ", ", ");
}

function getReadableDuration(untilTimestamp) {
    // 14d 23h 58m 58s
    const remainingTime = untilTimestamp - Date.now();
    if (remainingTime <= 0) return "Expired";

    const seconds = Math.floor(remainingTime / 1000) % 60;
    const minutes = Math.floor(remainingTime / (1000 * 60)) % 60;
    const hours = Math.floor(remainingTime / (1000 * 60 * 60)) % 24;
    const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}


export function getNewDate(offset) {
    // basically getReadableDuration but as date
    const units = {
        seconds: 1000,
        second: 1000,
        minutes: 1000 * 60,
        minute: 1000 * 60,
        hours: 1000 * 60 * 60,
        hour: 1000 * 60 * 60,
        days: 1000 * 60 * 60 * 24,
        day: 1000 * 60 * 60 * 24,
        months: "months",
        month: "months",
        years: "years",
        year: "years",
        perma: "perma"
    };

    const [amountStr, unit] = offset.split(" ");
    const amount = parseInt(amountStr, 10);

    if (unit === "perma") {
        return new Date("9999-12-31T23:59:59Z");
    }

    if (isNaN(amount) || !units[unit]) {
        throw new Error("Invalid offset format. Use '<number> <unit>' (e.g., '-1 day', '+2 hours').");
    }

    const now = new Date();

    if (units[unit] === "months") {
        now.setMonth(now.getMonth() + amount);
    } else if (units[unit] === "years") {
        now.setFullYear(now.getFullYear() + amount);
    } else {
        now.setTime(now.getTime() + amount * units[unit]);
    }

    return now;
}

export function muteUser(member) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);    

    let muteDate;
    let jsonObj;
    try{
        muteDate = getNewDate(member.time).getTime();
        jsonObj = JSON.parse(`
            {
                "mutedBy": "${member.id}",
                "reason": "${member.reason}",
                "duration": ${muteDate}
            }
            `);
    }
    catch (err){
        return { error: err }
    }

    if (!serverconfig.mutelist.hasOwnProperty(member.target)) {
        // used for checks
        serverconfigEditable.servermembers[member.target].isMuted = 1;

        // Add member to mutelist
        serverconfigEditable.mutelist[member.target] = jsonObj;

        saveConfig(serverconfigEditable);
        return { duration: muteDate};
    }
    else {
        serverconfigEditable.servermembers[member.target].isMuted = 1;
        serverconfigEditable.mutelist[member.target].duration = muteDate;
        saveConfig(serverconfigEditable);

        io.emit("updateMemberList");

        return { duration: muteDate};
    }
}