/*
    The functions here are basically the "core" of the chat app on the server side.
 */
import {serverconfig, xssFilters, colors, saveConfig, usersocket, server} from "../../../index.mjs"
import {consolas} from "../io.mjs";
import {io} from "../../../index.mjs";
import {getMemberHighestRole} from "./helper.mjs";
import {
    checkBool,
    checkEmptyConfigVar,
    copyObject,
    getCastingMemberObject,
    removeFromArray,
    sendMessageToUser
} from "../main.mjs";
import {encodeToBase64} from "../mysql/helper.mjs";
import {signer} from "../../../index.mjs"

var serverconfigEditable = serverconfig;

export function getMemberLastOnline(memberId) {
    if (!memberId || !serverconfig.servermembers[memberId]) return null;

    const lastOnline = serverconfig.servermembers[memberId].lastOnline;
    const now = Date.now();
    const minutesPassed = Math.floor((now - lastOnline) / 60000);
    const isOnline = Array.from(io.sockets.sockets.values()).some(s => s.data?.memberId === memberId);

    return { isOnline, minutesPassed };
}


export function getOnlineMemberCount() {
    const onlineMembers = Object.values(serverconfig.servermembers)
        .filter(m => m?.id && Number(getMemberLastOnline(m.id).minutesPassed) <= 5);

    return onlineMembers.length;
}

export function hasPermission(userId, permissions, channelOrGroupId = null, mode = "any") {
    const permsToCheck = Array.isArray(permissions) ? permissions : [permissions];

    if (permsToCheck.length > 1) {
        if (mode === "all") return permsToCheck.every(p => hasPermission(userId, p, channelOrGroupId));
        return permsToCheck.some(p => hasPermission(userId, p, channelOrGroupId));
    }

    const perm = permsToCheck[0];
    const uid = String(userId);

    const rolesObj = serverconfig.serverroles || {};
    const groupsObj = serverconfig.groups || {};

    function getUserRoles() {
        const out = [];
        for (const rid in rolesObj) {
            const members = rolesObj[rid]?.members || [];
            if (members.map(String).includes(uid)) out.push(String(rid));
        }
        return out;
    }

    function getRoleSort(rid) {
        return Number(rolesObj[String(rid)]?.info?.sortId || 0);
    }

    function decideByHighestRole(permsMap) {
        if (!permsMap) return null;
        let bestSort = -Infinity;
        let chosen = null;
        for (const rid of userRoles) {
            const entry = permsMap[String(rid)];
            if (!entry || !(perm in entry)) continue;
            const s = getRoleSort(rid);
            if (s > bestSort) {
                bestSort = s;
                chosen = entry[perm];
            }
        }
        return chosen;
    }

    // check channels
    function findChannelPath(chId) {
        const idStr = String(chId);
        for (const gid in groupsObj) {
            const cats = groupsObj[gid]?.channels?.categories || {};
            for (const cid in cats) {
                const chs = cats[cid]?.channel || {};
                if (chs[idStr]) {
                    return {
                        groupId: String(gid),
                        categoryId: String(cid),
                        channel: chs[idStr]
                    };
                }
            }
        }
        return null;
    }

    const userRoles = getUserRoles();
    if (userRoles.length === 0) return false;

    // admin bypass
    for (const rid of userRoles) {
        if (rolesObj[String(rid)]?.permissions?.administrator === 1) return true;
    }

    let groupId = null;
    let channelPath = null;

    if (channelOrGroupId != null) {
        // check if channel
        channelPath = findChannelPath(channelOrGroupId);
        if (!channelPath) {
            // check if group
            const gidStr = String(channelOrGroupId);
            if (groupsObj[gidStr]) groupId = gidStr;
        } else {
            groupId = channelPath.groupId;
        }
    }

    // channel overrides
    if (channelPath) {
        const chPerms = channelPath.channel?.permissions || null;
        const chDecision = decideByHighestRole(chPerms);
        if (chDecision !== null) return chDecision === 1;
    }

    // group overrides
    if (groupId) {
        const grpPerms = groupsObj[groupId]?.permissions || null;
        const gDecision = decideByHighestRole(grpPerms);
        if (gDecision !== null) return gDecision === 1;
    }

    // server roles
    const sorted = [...userRoles].sort((a, b) => getRoleSort(b) - getRoleSort(a));
    for (const rid of sorted) {
        const val = rolesObj[String(rid)]?.permissions?.[perm];
        if (val === 1) return true;
        if (val === -1) return false;
    }

    //default deny
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

export function generateGid(id) {
    return (encodeToBase64(signer.canonicalize(serverconfig.servermembers[id]?.publicKey))).substring(0, 20);
}

export function getMemberFromKey(publicKey){
    const members = Object.values(serverconfig.servermembers);
    let found = members.filter(m => m.publicKey === publicKey);

    if(Array.isArray(found)){
        return found[0];
    }
    else{
        return found;
    }
}

export async function changeKeyVerification(publicKey, value){
    if(value !== true && value !== false){
        return;
    }

    let member = getMemberFromKey(publicKey);
    if(!member) return;

    let gid = generateGid(member.id)
    if(!gid) return;

    member.isVerifiedKey = value;
}

export async function hasVerifiedKey(id){
    if(!id) return null;

    let member = serverconfig.servermembers[id];
    if(!member) return null;

    let publicKey = member?.publicKey;
    let keyIsVerified = member?.isVerifiedKey;

    // user isnt using public keys
    if(!publicKey){
        return null;
    }

    // if the public key exists but the verified field doesnt
    // or isnt set, return false;
    if(publicKey && !keyIsVerified){
        publicKey = false;
        return false;
    }

    // has key and is verified
    if(publicKey && keyIsVerified === true){
        return true;
    }
}

export async function getMemberProfile(id) {

    if(serverconfig.servermembers[id]){
        let roles = Object.keys(serverconfig.serverroles).map(role => ({
            id: role,
            ...serverconfig.serverroles[role].info,
            members: serverconfig.serverroles[role].members
        }));

        roles.sort((a, b) => b.sortId - a.sortId);
        roles = roles.filter(role => role.members.includes(id));

        let memberObj = await getCastingMemberObject(serverconfig.servermembers[id]);
        memberObj.roles = roles;

        return memberObj
    }
    return null;
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

                if(serverconfig.servermembers[member].onboarding === false) return

                // Do not show banned users
                if (serverconfig.servermembers[member].isBanned === 1) {
                    if (!bannedMember.includes(member)) bannedMember.push(member);

                    if (checkBool(serverconfig.serverinfo.moderation.bans.memberListHideBanned, "bool") === true) return;
                }

                // check here for highest role
                var highestMemberRole = getMemberHighestRole(member);
                role.info.id = Number(role.info.id)

                // If member is in role and the role is set to be shown
                if ((role.members.includes(member) && role.info.displaySeperate === 1) ||
                    role.info.id === 1) {

                    // if role is the "Offline" role and member is gone for more then x minutes
                    if (role.info.id === 1 && getMemberLastOnline(member).minutesPassed >= 1) {
                        // Add member to offline list (if not already done)
                        if (!offlineMember.includes(member)) {
                            offlineMember.push(member);
                        }
                    }

                    // If the user has the permission to see the channel
                    if (hasPermission(member, "viewChannel", channel) === true) {

                        // If role should be displayed and
                        // the current role is not the member's highest role and (dont remember why)
                        // the role is not the "Offline Role", then return lol
                        if (highestMemberRole.info.displaySeperate === 1 && role.info.id !== highestMemberRole.info.id && role.info.id !== 1) {
                            return;
                        }

                        // gray color effect for offline members in the member list
                        // should also avoid duplicate listing in role AND offline for memberlist
                        var extraClassOffline = "";
                        const { isOnline, minutesPassed } = getMemberLastOnline(member);

                        // if the user IS NOT OFFLINE stop proceeding with trying to add that user
                        if (role.info.id === 1 && isOnline) return;

                        // if the user is offline, dont show him in any other role except offline role
                        if (role.info.id !== 1 && !isOnline) return;
                        if (role.info.id === 1) {
                            extraClassOffline = "offline_pfp";
                        }



                        // This can hide offline members from the list
                        // Could be useful for big servers
                        // Will be a future feature
                        //if(offlineMember.includes(member)){
                        //    return;
                        //}

                        // hide online members from offline section (?)
                        if (offlineMember.includes(member) && role.info.id !== 1) {
                            removeFromArray(offlineMember, member);
                        }

                        // If the role object itself wasnt yet listed
                        if (noMembersInRole === true /*&& (members[member].isMuted == false && members[member].isBanned == false)*/) {

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
                            if (members[member].isMuted) displayColor = "grey";
                            if (members[member].isBanned) displayColor = "indianred";

                            nameStyle = `<s style="color: ${displayColor};"><span style="font-style: italic;color:${displayColor}">${members[member].name}</span></s>`;
                            statusStyle = `<s style="color: ${displayColor};"><span style="font-style: italic;color:${displayColor}">${members[member].status}</span></s>`;
                            extraClassOffline = "offline_pfp";

                            //if(role.info.id == "1") return;
                        }


                        code += `<div class="memberlist-container" data-member-id="${members[member].id}">
                                    <img class="memberlist-img ${extraClassOffline}" data-member-id="${members[member].id}" src="${members[member].icon}" onerror="this.src = '/img/default_pfp.png'">
                                    
                                    <div style="display:flex;flex-direction: column;width: calc(100% - 35px);">
                                        <div class="memberlist-member-info name" 
                                            onclick="getMemberProfile('${members[member].id}');" data-member-id="${members[member].id}"" 
                                            style="color: ${role.info.color};">
                                            ${nameStyle}
                                        </div>
                                        <div class="memberlist-member-info status" data-member-id="${members[member].id}" style="color: ${role.info.color};">
                                            ${statusStyle}
                                        </div>
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

    var code = `<a onclick="showHome()">
                        <div class="group-entry-marker"></div>
                        <div class="server-entry home">
                           <img title="Home" class="server-icon" src="/img/home.jpg">    
                           <span class="home-indicator"></span>                       
                        </div>
                    </a><hr class="homeDivider">`;

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
                           <img title="${group.info.name}" id="${group.info.id}" data-group-id="${group.info.id}" class="server-icon group-icon-${group.info.id}" src="${group.info.icon}">
                        </div>
                    </a>`;
        } else {
            //reverse()

            // Normal user
            userroles.forEach(role => {
                try {
                    if (group.permissions[role].viewGroup == 1 &&
                        addedGroups.includes(group.info.id) == false
                    ) {
                        addedGroups.push(group.info.id);
                        code += `<a onclick="setUrl('?group=${group.info.id}');"><div class="server-entry">
                                    <img title="${group.info.name}" data-group-id="${group.info.id}" id="${group.info.id}" class="server-icon group-icon-${group.info.id}" src="${group.info.icon}">
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
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = copyObject(value); // Deep copy before setting
}

export function getJson(obj, pathOrPaths) {
    if (!Array.isArray(pathOrPaths)) {
        const parts = String(pathOrPaths).split(".");

        function rec(current, i) {
            if (i === parts.length) return [current];
            const key = parts[i];
            if (key === "*") {
                if (typeof current !== "object" || current === null) return [];
                return Object.values(current).flatMap(child => rec(child, i + 1));
            } else {
                if (current == null || !(key in current)) return [];
                return rec(current[key], i + 1);
            }
        }

        return rec(obj, 0);
    }

    const partsList = pathOrPaths.map(p => String(p).split("."));
    const maxLen = Math.max(...partsList.map(p => p.length));

    function recSync(currents, depth) {
        if (depth === maxLen) {
            if (currents.every(v => v !== undefined)) return [currents];
            return [];
        }

        const needWildcard = partsList.map(p => p[depth]).map(k => k === "*");
        const nextKeys = new Set();

        for (let i = 0; i < partsList.length; i++) {
            const key = partsList[i][depth];
            const cur = currents[i];
            if (key === "*") {
                if (cur && typeof cur === "object") {
                    for (const k of Object.keys(cur)) nextKeys.add(k);
                }
            }
        }

        if (nextKeys.size === 0) {
            const nextCurrents = [];
            for (let i = 0; i < partsList.length; i++) {
                const key = partsList[i][depth];
                const cur = currents[i];
                if (cur == null) return [];
                if (!(key in cur)) return [];
                nextCurrents.push(cur[key]);
            }
            return recSync(nextCurrents, depth + 1);
        }

        const out = [];
        for (const k of nextKeys) {
            const nextCurrents = [];
            let valid = true;
            for (let i = 0; i < partsList.length; i++) {
                const key = partsList[i][depth];
                const cur = currents[i];
                if (key === "*") {
                    if (!cur || !(k in cur)) {
                        valid = false;
                        break;
                    }
                    nextCurrents.push(cur[k]);
                } else {
                    if (!cur || !(key in cur)) {
                        valid = false;
                        break;
                    }
                    nextCurrents.push(cur[key]);
                }
            }
            if (valid) out.push(...recSync(nextCurrents, depth + 1));
        }
        return out;
    }

    return recSync(Array(partsList.length).fill(obj), 0);
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
            //if(!addedInitialCode) treecode = `<h2>${serverconfig.groups[group].info.name}</h2><hr>`; addedInitialCode = true;

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
                if (!addedInitialCode) treecode = `<h2>${serverconfig.groups[group].info.name}</h2><hr>`;
                addedInitialCode = true;

                // Add Category
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
                                added_channels.push(chan.id + "_" + chan.name)
                            } else if (chan.type == "voice") {
                                added_channels.push(chan.id + "_" + chan.name)
                            }
                        }

                    } else {
                        //console.log(`User ${serverconfig.servermembers[member.id].name} was denied`)
                    }
                }
            });

        });

    });

    return channeltree;
}

export function banUser(socket, member) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    let ip = socket.handshake.address;

    // get member ban date
    let bannedUntil = getNewDate(member.duration).getTime();

    // Set Member to be banned
    console.log(member.target)
    console.log(serverconfig.servermembers)
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
    } else {
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

export function disconnectUser(socketId, reason = null) {

    try {
        sendMessageToUser(socketId, JSON.parse(
            `{
            "title": "You've been disconnected",
            "message": "${reason ? `Reason:<br>${reason}` : ""}",
            "buttons": {
                "0": {
                    "text": "Ok",
                    "events": "onclick='closeModal()'"
                }
            },
            "type": "error",
            "displayTime": 600000,
            "wasDisconnected": true
        }`));

        io.sockets.sockets.get(socketId).disconnect();
    } catch (ex) {
        return {error: ex}
    }

    return {error: null};
}

export function muteUser(member) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    let muteDate;
    let jsonObj;
    try {
        muteDate = getNewDate(member.time).getTime();
        jsonObj = JSON.parse(`
            {
                "mutedBy": "${member.id}",
                "reason": "${member.reason}",
                "duration": ${muteDate}
            }
            `);
    } catch (err) {
        return {error: err}
    }

    if (!serverconfig.mutelist.hasOwnProperty(member.target)) {
        // used for checks
        serverconfigEditable.servermembers[member.target].isMuted = 1;

        // Add member to mutelist
        serverconfigEditable.mutelist[member.target] = jsonObj;

        saveConfig(serverconfigEditable);
        return {duration: muteDate};
    } else {
        serverconfigEditable.servermembers[member.target].isMuted = 1;
        serverconfigEditable.mutelist[member.target].duration = muteDate;
        saveConfig(serverconfigEditable);

        io.emit("updateMemberList");

        return {duration: muteDate};
    }
}