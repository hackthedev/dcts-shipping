/*
    The functions here are basically the "core" of the chat app on the server side.
 */
import {serverconfig, xssFilters, colors, saveConfig, usersocket, server, ipsec} from "../../../index.mjs"
import {io} from "../../../index.mjs";
import {getMemberHighestRole} from "./helper.mjs";
import {
    checkBool,
    checkEmptyConfigVar,
    copyObject, generateId,
    getCastingMemberObject, getRoleCastingObject, isLocalhostIp,
    removeFromArray,
    sendMessageToUser
} from "../main.mjs";
import {encodeToBase64} from "../mysql/helper.mjs";
import {signer} from "../../../index.mjs"
import Logger from "@hackthedev/terminal-logger"
import {queryDatabase} from "../mysql/mysql.mjs";

var serverconfigEditable = serverconfig;

export function getMemberLastOnline(memberId) {
    if (!memberId || !serverconfig.servermembers[memberId]) return null;
    if(shouldIgnoreMember(serverconfig.servermembers[memberId])) return null;

    const lastOnline = serverconfig.servermembers[memberId].lastOnline;
    const now = Date.now();
    const minutesPassed = Math.floor((now - lastOnline) / 60000);
    const isOnline = Array.from(io.sockets.sockets.values()).some(s => s.data?.memberId === memberId);

    return { isOnline, minutesPassed };
}


export function getOnlineMemberCount() {
    const onlineMembers = Object.values(serverconfig.servermembers)
        .filter(m => !shouldIgnoreMember(m) && m?.id && Number(getMemberLastOnline(m.id).minutesPassed) <= 5);

    return onlineMembers.length;
}

export function hasPermission(userId, permissions, channelOrGroupId = null, mode = "any") {
    if(shouldIgnoreMember(serverconfig.servermembers[userId])) return false;

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

export function shouldIgnoreMember(member){
    if (!member?.lastOnline) return true;
    return new Date(member?.lastOnline) <= getNewDate(`-${serverconfig.serverinfo.system.members.ignoreTimeout}`);
}

export async function checkIpCache(ip){
    if(!ip) return;

    let ipResult = await queryDatabase(`SELECT * FROM ip_cache WHERE ip = ?`, [ip]);
    if(ipResult.length > 0){
        let row = ipResult[0];

        let lastSyncDate = new Date(row.last_sync);
        let expiredDate = getNewDate("-3 days")

        // if last sync was more than 3 days ago, its not up to date anymore.
        if(lastSyncDate < expiredDate) {
            await queryDatabase(`DELETE FROM ip_cache WHERE ip = ?`, [ip]);
            return null;
        }

        return row;
    }

    return null;
}

export async function updateIpCache(ip, data){
    if(!ip) return;
    let ipCache = await checkIpCache(ip);

    if(!ipCache){
        await queryDatabase(`INSERT IGNORE INTO ip_cache (ip, data) VALUES (?, ?)`, [ip, JSON.stringify(data)]);
    }
}

export async function lookupIP(ip){
    return await ipsec.lookupIP(ip)
}

export async function getMemberIpInfo(socket){
    let ip = getSocketIp(socket);
    return await lookupIP(ip);
}


export function getMemberList(member, channel) {
    var members = serverconfig.servermembers;
    const memberKeys = Object.keys(members);
    let sortedMembers = {};


    for (let i = memberKeys.length - 1; i >= 0; i--) {
        const memberId = memberKeys[i];
        const memberObj = members[memberId];

        // didnt finish onboarding yet
        if(!memberObj.loginName) continue;
        if(memberObj?.isBanned === true) continue;
        if(shouldIgnoreMember(memberObj)) continue;

        if(!hasPermission(memberId, "viewChannel", channel)) continue

        var highestMemberRole = getMemberHighestRole(memberId);
        sortedMembers[memberId] = getCastingMemberObject(memberObj);
        sortedMembers[memberId].highestRole = getRoleCastingObject(highestMemberRole);

        const { isOnline, minutesPassed } = getMemberLastOnline(memberId);

        // if the user is offline
        if (!isOnline){
            sortedMembers[memberId].isOffline = true;
        }
    }

    return {members: sortedMembers, index: -1};
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

export function addBan({
                        identifier,
                        bannedBy = "system",
                        reason = "",
                        until = -1,
                        ip = null,
                       } = {}){

    serverconfig.banlist[identifier] = {
        bannedBy: bannedBy,
        reason: reason,
        until: until,
        ip: ip
    };
    saveConfig(serverconfig);
}

export function removeBan(identifier){
    if(serverconfig.banlist.hasOwnProperty(identifier)) delete serverconfig.banlist[identifier]


    if(serverconfig.servermembers[identifier]?.isBanned){
        serverconfig.servermembers[identifier].isBanned = 0
    }

    saveConfig(serverconfig);
}



export function banUser(socket, member) {
    let ip = getSocketIp(socket);
    if(isLocalhostIp(ip)) ip = null;

    // get member ban date
    let bannedUntil = getNewDate(member.duration).getTime();

    // Set Member to be banned
    serverconfig.servermembers[member.target].isBanned = 1;

    // Add member to banlist
    addBan({
        identifier: member?.target,
        bannedBy: member?.id,
        reason: member?.reason,
        until: bannedUntil,
        ip: ip
    });

    Logger.warn(` User ${serverconfig.servermembers[member.target].name} (IP ${ip}) was added to the banlist because he was banned`.yellow);
    return banIp(socket, bannedUntil);
}

export function getSocketIp(socket){
    return socket?.handshake?.headers["x-forwarded-for"]?.split(",")[0].trim()
        || socket?.handshake?.headers["x-real-ip"]
        || socket?.handshake?.address;
}

export function banIp(socket, durationTimestamp = -1) {
    let ip = getSocketIp(socket);
    if(isLocalhostIp(ip)) return;

    addBan({
        identifier: ip,
        until: durationTimestamp,
    })

    Logger.info(`IP ${ip} banned until ${new Date(durationTimestamp).toLocaleString()}`);
}

export function isIpBanned(ip){
    let existingBannedIp = getJson(serverconfig.blacklist, ["*.ip"]);
    if(existingBannedIp.length > 0 || serverconfig.banlist[ip]){
        Logger.info(`IP ${ip} already banned`)
        return true;
    }

    return false;
}


export function unbanIp(socket) {
    let ip = getSocketIp(socket)

    if (serverconfig.banlist[ip]) {
        delete serverconfig.banlist[ip];
        saveConfig(serverconfig);
    } else {
        Logger.warn(`Tried to unban IP ${ip} but it was not banned`);
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
            let newPath = currentPath ? `${currentPath}.${key}` : key;

            if (key === keyToFind && currentObj[key] === valueToFind) {
                if (currentPath.includes("channel")) {
                    result = currentObj;
                    foundPath = currentPath;
                    return;
                }
            }

            if (typeof currentObj[key] === "object" && currentObj[key] !== null) {
                search(currentObj[key], newPath);
                if (result) return;
            }
        }
    }

    search(obj);

    return returnPath ? foundPath : result;
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
        sendMessageToUser(socketId, {
            title: "You've been disconnected",
            message: reason ? `Reason:<br>${reason}` : "",
            buttons: {
                "0": {
                    text: "Ok",
                    events: "onclick='closeModal()'"
                }
            },
            type: "error",
            displayTime: 600000,
            wasDisconnected: true
        });

        io.sockets.sockets.get(socketId).disconnect();
    } catch (ex) {
        return {error: ex}
    }

    return {error: null};
}

export function muteUser(member) {
    let muteDate;
    let jsonObj;
    try {
        muteDate = getNewDate(member.time).getTime();
        jsonObj = {
            mutedBy: member.id,
            reason: member.reason,
            duration: muteDate
        };
    } catch (err) {
        return {error: err}
    }

    if (!serverconfig.mutelist.hasOwnProperty(member.target)) {
        // used for checks
        serverconfig.servermembers[member.target].isMuted = 1;

        // Add member to mutelist
        serverconfig.mutelist[member.target] = jsonObj;

        saveConfig(serverconfig);
        return {duration: muteDate};
    } else {
        serverconfig.servermembers[member.target].isMuted = 1;
        serverconfig.mutelist[member.target].duration = muteDate;
        saveConfig(serverconfig);

        io.emit("updateMemberList");

        return {duration: muteDate};
    }
}