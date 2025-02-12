import { error } from "console";
import {
    debugmode,
    serverconfig,
    colors,
    versionCode,
    io,
    XMLHttpRequest,
    saveConfig,
    fetch,
    reloadConfig,
    flipDebug,
    ratelimit,
    setRatelimit,
    usersocket,
    sanitizeHtml,
    powVerifiedUsers,
    bcrypt,
    fs
} from "../../index.mjs"
import { banIp, getNewDate } from "./chat/main.mjs";
import { consolas } from "./io.mjs";
import Logger from "./logger.mjs";
import path from "path";

var serverconfigEditable;

/*
    conf = The Variable to check for
    value = Value to fill the variable if null
 */
export function checkEmptyConfigVar(conf, value) {
    if (conf == null) return value;
    else return conf;
}

export function removeFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename; // No extension found, return original filename
    return filename.slice(0, lastDotIndex);
}

export function sanitizeInput(input) {
    return sanitizeHtml(input, {
        allowedTags: [
            'div',
            'span',
            'p',
            'br',
            'b',
            'i',
            'u',
            's',
            'a',
            'ul',
            'ol',
            'li',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'pre',
            'code',
            'blockquote',
            'strong',
            'em',
            'u',
            's',
            'img'
        ],
        allowedAttributes: {
            'a': ['href', 'target', 'rel'],
            'img': ['src', 'alt', 'title'],
            'div': ['class', 'style'],
            'strong': ['class'],
            'em': ['class'],
            'u': ['class'],
            's': ['class'],
            'span': ['class', 'style'],
            '*': ['class', 'style']
        },
        transformTags: {
            'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
        },
        allowedSchemesByTag: {
            img: ['http', 'https', 'data'] // Erlaubt das data-Schema für img-Tags
        },
        allowedSchemesAppliedToAttributes: ['src'], // Nur auf das 'src'-Attribut anwenden
        textFilter: (text) => {
            // Entfernt alle 'data:'-URLs außer 'data:image/png;base64' und 'data:image/jpeg;base64'
            return text.replace(/data:image\/(?!png|jpeg)[^;]+;base64[^"]*/g, '');
        }
    });
}

export function sanitizeFilename(filename) {
    return filename
        .normalize("NFD")                  // Normalize to decompose accented characters
        .replace(/[\u0300-\u036f]/g, '')   // Remove diacritical marks
        .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace non-alphanumeric chars with _
        .replace(/\s+/g, '_');             // Replace spaces with underscores
}

export const mimeTypesCache = new Map(); // Cache to store validated MIME types by file ID
export const fileSizeCache = new Map(); // Cache to track file sizes by file ID

// Helper function to get the total size of files in a directory
export const getFolderSize = (folderPath) => {
    const files = fs.readdirSync(folderPath);
    return files.reduce((total, file) => {
        const { size } = fs.statSync(path.join(folderPath, file));
        return total + size;
    }, 0);
};


export async function checkVersionUpdate() {
    return new Promise((resolve, reject) => {
        var versionUrl = 'https://raw.githubusercontent.com/hackthedev/dcts-shipping/main/version';


        (async function () {
            const res = await fetch(versionUrl)

            if (res.status == 404) {
                resolve(null);
                return null;
            } else if (res.status == 200) {
                var onlineVersionCode = await res.text();
                onlineVersionCode = onlineVersionCode.replaceAll("\n\r", "").replaceAll("\n", "");

                if (onlineVersionCode > versionCode) {
                    resolve(onlineVersionCode);
                    return onlineVersionCode;
                } else {
                    resolve(null);
                    return null;
                }

                resolve(html);
                return html;
            } else {
                resolve(null);
                return null;
            }
        })()


    });

    return prom;
}

export function handleTerminalCommands(command, args) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    try {
        if (command == 'reload') {
            reloadConfig();
            consolas("Reloaded config".cyan);
        }
        if (command == 'debug') {

            let allowedDebugEvents = [
                "messages",
                "all"
            ]

            if (args[1] == null) {
                consolas(`No Event Specified. Allowed Events:`.yellow);
                console.log(allowedDebugEvents);
            }
            flipDebug();
            consolas(`Debug Mode set to ${debugmode} with event ${args[1]}`.cyan);
        }
        else if (command == 'roles') {
            var serverroles = serverconfig.serverroles;
            var serverRolesSorted = []

            console.log("");
            console.log("Server Roles:".cyan);

            // Add them to array for sorting
            Object.keys(serverroles).forEach(function (role) {
                serverRolesSorted.push(serverconfig.serverroles[role]);
            });

            // Sort Server Roles by sortId
            serverRolesSorted = serverRolesSorted.sort((a, b) => {
                if (a.info.sortId > b.info.sortId) {
                    return -1;
                }
            });

            serverRolesSorted.forEach(role => {
                console.log(colors.yellow("- Role ID: " + role.info.id));
                console.log("   - Role Name: " + role.info.name);
                console.log("");
            })
        }
        else if (command == "token") {

            if (args.length == 2) {

                var roleIdArg = args[1];

                if (isNaN(roleIdArg) == false) {
                    try {
                        var roleToken = generateId(64);
                        serverconfigEditable.serverroles[roleIdArg].token.push(roleToken);
                        saveConfig(serverconfigEditable);

                        consolas(colors.cyan(`Redeem key generated for role ${serverconfigEditable.serverroles[roleIdArg].info.name}`));
                        consolas(colors.cyan(roleToken))
                    }
                    catch (Err) {
                        consolas("Couldnt save or generate key".yellow);
                        consolas(colors.red(Err));
                    }
                }
            }
            else {
                consolas(colors.yellow(`Missing Argument: Role ID`));
            }

        }
        else if (command == 'delete') {
            if (args.length == 3) {
                if (args[1] == "user") {
                    if (args[2].length == 12) {
                        if (serverconfig.servermembers[args[2]] != null) {
                            delete serverconfigEditable.servermembers[args[2]];
                            consolas(`Deleting user ${args[2]}`.cyan);
                            saveConfig(serverconfigEditable);
                        }
                        else {
                            consolas(`Couldnt find user ${args[2]}`.yellow);
                        }
                    }
                    else {
                        consolas(`${args[2]} seems to be a invalid id`.yellow);
                    }
                }
            }
            else {
                consolas("Syntax error: delete <option> <value> ".cyan + command);
            }
        }
        else {
            consolas("Unkown command: ".cyan + command);
        }
    }
    catch (e) {
        consolas("Couldnt handle command input".red)
        consolas(colors.red(e))
    }
}

export function copyObject(obj) {
    if (!obj) {
        Logger.debug("copyObject obj was null or undefined")
        return;
    }

    try {
        return JSON.parse(JSON.stringify(obj));
    }
    catch (parseerror) {
        Logger.error("Unable to copy json object;")
        Logger.error(parseerror)
        console.log(obj)
    }
}

export function moveJson(obj, fromPath, toPath) {
    const getNestedObject = (obj, path) => path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
    const setNestedObject = (obj, path, value) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {}; // Ensure path exists
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    };
    const deleteNestedObject = (obj, path) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) return; // Path does not exist
            current = current[keys[i]];
        }
        delete current[keys[keys.length - 1]];
    };

    const value = getNestedObject(obj, fromPath);
    if (value === undefined) {
        console.error(`❌ Path not found: ${fromPath}`);
        return;
    }

    setNestedObject(obj, toPath, value);
    deleteNestedObject(obj, fromPath);
    console.log(`✅ Moved data from ${fromPath} to ${toPath}`);

    return obj;
}

export function checkBool(value, type) {
    if (type === "bool") {
        if (typeof value !== "boolean") {
            throw new Error(`Expected a boolean, but received type '${typeof value}'.`);
        }
        return value; // Return true or false for boolean
    } else if (type === "number") {
        if (typeof value !== "number") {
            throw new Error(`Expected a number, but received type '${typeof value}'.`);
        }

        if (value === 1) {
            return true;
        } else if (value === 0) {
            return false;
        } else {
            throw new Error(`Invalid value '${value}'. Expected 1 or 0.`);
        }
    } else {
        throw new Error(`Invalid type '${type}'. Only 'bool' and 'number' are supported.`);
    }
}


export function checkConfigAdditions() {


    /*
        Account Login Update & Security
    */
    checkObjectKeys(serverconfig, "serverinfo.registration.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.registration.accessCodes", [])

    checkObjectKeys(serverconfig, "serverinfo.login.maxLoginAttempts", 5)

    // Rate Spam & Failed Logins as example
    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.ipBanDuration", "10 minutes")
    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.memberListHideBanned", true)


    /*
        UI / Mod Update 
    */

    // Settings for Moderation 
    //
    // Message Spam
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.repeatedMessages.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.repeatedMessages.counter", 0)
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.repeatedMessages.actions", {})
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.repeatedMessages.timespan", 0)
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.repeatedMessages.bypassers", [])
    //    
    // Blacklist
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.blacklist.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.blacklist.words", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.blacklist.actions", {})
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.blacklist.channels", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.blacklist.userprofile", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.messaging.blacklist.bypassers", [])
    //
    // AI API
    checkObjectKeys(serverconfig, "serverinfo.moderation.ai.profanity_check_enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ai.spam_check_enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ai.spam_api_key", "")
    checkObjectKeys(serverconfig, "serverinfo.moderation.ai.profanity_api_key", "")


    /*
        Config changes from some update 
    */

    // Added MySQL
    checkObjectKeys(serverconfig, "serverinfo.sql.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.sql.host", "localhost")
    checkObjectKeys(serverconfig, "serverinfo.sql.username", "")
    checkObjectKeys(serverconfig, "serverinfo.sql.password", "")
    checkObjectKeys(serverconfig, "serverinfo.sql.database", "dcts")
    checkObjectKeys(serverconfig, "serverinfo.sql.connectionLimit", 10) // Depending on Server Size

    // If the channel doesnt exist it will not display "member joined" messages etc
    checkObjectKeys(serverconfig, "serverinfo.defaultChannel", "0")
    // check for message load limit
    checkObjectKeys(serverconfig, "serverinfo.messageLoadLimit", 50)

    // Additional File Types 
    // Delete entire uploadFileTypes section from config file to recreate it 
    // with the extended list or add manually. will not update if already exists
    checkObjectKeys(serverconfig, "serverinfo.uploadFileTypes",
        [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "audio/mpeg",
            "video/mp4",
            "audio/vnd.wave"
        ])
}


export function checkObjectKeys(obj, path, defaultValue) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!current[key]) {
            current[key] = (i === keys.length - 1) ? defaultValue : {};
        }
        current = current[key];
    }

    saveConfig(obj);
}

export function checkRateLimit(socket) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    var ip = socket.handshake.address;

    //console.log("IP RATE LIMIT")
    //console.log(ip)

    if (ip == "::1" || ip.includes("127.0.0.1")) {
        return;
    }

    if (ratelimit[ip] == null) {
        setRatelimit(ip, 1);
    } else {
        setRatelimit(ip, ratelimit[ip] + 1)
    }

    //consolas(`${ip} Rate Limit: ${ratelimit[ip]}`)

    if (ratelimit[ip] > serverconfig.serverinfo.rateLimit) {
        consolas("Limit exceeded".red);

        sendMessageToUser(socket.id, JSON.parse(
            `{
                        "title": "Rate Limited!",
                        "message": "Your connection was terminated.",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));

        socket.disconnect();

        banIp(socket, getNewDate(serverconfig.serverinfo.moderation.bans.ipBanDuration))
        consolas(`IP ${ip} was added to the blacklist for rate limit spam`);

        return;
    }

    setTimeout(() => {

        try {
            setRatelimit(ip, ratelimit[ip] - 1);
        } catch { }

    }, serverconfig.serverinfo.dropInterval * 1000);
}

export function limitString(text, limit) {
    if (text.length <= limit) return text.substring(0, limit);
    else return text.substring(0, limit) + "...";
}

export function generateId(length) {
    let result = '1';
    const characters = '0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length - 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

export function validateMemberId(id, socket, bypass = false) {

    /* Future Feature
    if(!powVerifiedUsers.includes(socket.id)){

        sendMessageToUser(socket.id, JSON.parse(
            `{
                "title": "Verification Pending",
                "message": "Your identity security is too low.#Please wait for your client to adjust",
                "buttons": {
                    "0": {
                        "text": "Ok",
                        "events": "closePrompt();"
                    }
                },
                "type": "error",
                "popup_type": "confirm"
            }`));

        return false;
    }
        */

    if (bypass == false) {
        checkRateLimit(socket);
    }

    if (id.length == 12 && isNaN(id) == false) {
        return true;
    }
    else {
        return false;
    }
}

export function escapeHtml(text) {
    // Not sure if this is even helpful but so far worked ig sooo

    if (text == null || text.length <= 0) {
        return text;
    }

    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

export function httpGetAsync(theUrl, callback, id) {
    // create the request object
    var xmlHttp = new XMLHttpRequest();

    // set the state change callback to capture when the response comes in
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            callback(xmlHttp.responseText, id);
        }
    }

    // open as a GET call, pass in the url and set async = True
    xmlHttp.open("GET", theUrl, true);
    //xmlHttp.setRequestHeader('Content-Type', 'application/json');

    /*
    xmlHttp.setRequestHeader('Access-Control-Allow-Headers', '*');
     xmlHttp.setRequestHeader('Content-Type', 'application/json');
    xmlHttp.setRequestHeader('Access-Control-Allow-Headers', '*');
    xmlHttp.setRequestHeader("Access-Control-Allow-Origin", "*")
    xmlHttp.setRequestHeader("Access-Control-Allow-Methods", "DELETE, POST, GET, OPTIONS")

     */

    // call send with no params as they were passed in on the url string
    xmlHttp.send(null);

    return;
}

export function tenorCallback_search(responsetext, id) {
    // Parse the JSON response
    var response_objects = JSON.parse(responsetext);

    var top_10_gifs = response_objects["results"];

    // load the GIFs -- for our example we will load the first GIFs preview size (nanogif) and share size (gif)


    top_10_gifs.forEach(gif => {

        io.to(usersocket[id]).emit("receiveGifImage", { gif: gif.media_formats.gif.url, preview: gif.media_formats.gifpreview.url });
        /*
        document.getElementById("emoji-entry-container").insertAdjacentHTML("beforeend",
            `<img
                onclick="sendGif('${gif.media_formats.gif.url}')" src="${gif.media_formats.gifpreview.url}"
                onmouseover="changeGIFSrc('${gif.media_formats.gif.url}', this);"
                onmouseleave="changeGIFSrc('${gif.media_formats.gifpreview.url}', this);"
                style="padding: 1%;border-radius: 20px;float: left;width: 48%; height: fit-content;">`
            */
    })



    //document.getElementById("share_gif").src = top_10_gifs[0]["media_formats"]["gif"]["url"]; top_10_gifs[0]["media_formats"]["gif"]["url"]

    return;

}

export function searchTenor(search, id) {
    // set the apikey and limit
    var apikey = serverconfig.serverinfo.tenor.api_key;
    var clientkey = serverconfig.serverinfo.tenor.client_key;
    var lmt = serverconfig.serverinfo.tenor.limit;

    // test search term
    var search_term = search;

    // using default locale of en_US
    var search_url = "https://tenor.googleapis.com/v2/search?q=" + search_term + "&key=" +
        apikey + "&client_key=" + clientkey + "&limit=" + lmt;

    httpGetAsync(search_url, tenorCallback_search, id);

    // data will be loaded by each call's callback
    return;
}

export function addMinutesToDate(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

export function sendMessageToUser(socketId, data) {
    io.to(socketId).emit("modalMessage", data);
}

export function checkMemberMute(socket, member) {
    serverconfigEditable = checkEmptyConfigVar(serverconfig);
    let ip = socket.handshake.address;

    if (serverconfigEditable.banlist.hasOwnProperty(member.id)) {
        console.log("Checking mutelist for member ID:", member.id);
    }
    if (serverconfigEditable.ipblacklist.hasOwnProperty(ip)) {
        console.log("Checking ipblacklist for IP:", ip);
    }


    checkRateLimit(socket);

    // check mutelist
    if (serverconfigEditable.mutelist.hasOwnProperty(member.id)) {

        var durationStamp = serverconfigEditable.mutelist[member.id].duration;
        var muteReason = serverconfigEditable.mutelist[member.id].reason;

        if (Date.now() >= durationStamp) {
            // unmute user
            serverconfigEditable.servermembers[member.id].isMuted = 0;
            delete serverconfigEditable.mutelist[member.id];
            saveConfig(serverconfigEditable);

            consolas(colors.yellow("Automatically unmuted user " + member.name + ` (${member.id})`));
        }
        else {
            return { result: true, timestamp: durationStamp, reason: muteReason };
        }
    }

    // check ip blacklist
    if (serverconfigEditable.ipblacklist.hasOwnProperty(ip)) {
        if (Date.now() >= serverconfigEditable.ipblacklist[ip]) {
            delete serverconfigEditable.ipblacklist[ip];
            saveConfig(serverconfigEditable);
        }
        else {
            return { result: true, timestamp: serverconfigEditable.ipblacklist[ip] }
        }
    }

    return { result: false };
}

export function checkMemberBan(socket, member) {
    reloadConfig();
    serverconfigEditable = checkEmptyConfigVar(serverconfig);
    let ip = socket.handshake.address;

    if (serverconfigEditable.banlist.hasOwnProperty(member.id)) {
        console.log("Checking banlist for member ID:", member.id);
    }
    if (serverconfigEditable.ipblacklist.hasOwnProperty(ip)) {
        console.log("Checking ipblacklist for IP:", ip);
    }


    checkRateLimit(socket);

    // check banlist
    if (serverconfigEditable.banlist.hasOwnProperty(member.id)) {

        var durationStamp = serverconfigEditable.banlist[member.id].until;
        var banReason = serverconfigEditable.banlist[member.id].reason;

        if (Date.now() >= durationStamp) {
            // unban user
            console.log("unbanning user")
            serverconfigEditable.servermembers[member.id].isBanned = 0;
            delete serverconfigEditable.banlist[member.id];
            saveConfig(serverconfigEditable);

            consolas(colors.yellow("Automatically unbanned user " + member.name + ` (${member.id})`));
        }
        else {
            return { result: true, timestamp: durationStamp, reason: banReason };
        }
    }

    // check ip blacklist
    if (serverconfigEditable.ipblacklist.hasOwnProperty(ip)) {
        if (Date.now() >= serverconfigEditable.ipblacklist[ip]) {
            delete serverconfigEditable.ipblacklist[ip];
            saveConfig(serverconfigEditable);
        }
        else {
            return { result: true, timestamp: serverconfigEditable.ipblacklist[ip] }
        }
    }

    return { result: false };
}

export async function hashPassword(password) {
    const saltRounds = 10; // potential config setting, 20 is painful!!!!
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}

export async function validatePassword(password, hash) {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
}

export function getCastingMemberObject(member) {

    member = copyObject(member);

    if (!member || typeof member !== "object") {
        console.error("Invalid input: Expected an object");
        return;
    }

    const keysToDelete = ["password", "token", "loginName"]; // Keys to always delete

    keysToDelete.forEach(key => {
        if (key in member) {
            delete member[key];
        }
    });

    return member;
}

export function findAndVerifyUser(loginName, password) {
    reloadConfig();
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);
    let serverMembers = serverconfigEditable.servermembers;

    for (const memberId in serverMembers) {
        const member = serverMembers[memberId];

        // Check loginName matches either 'name' or 'nickname'
        if (member.loginName === loginName) {
            // Verify the password hash
            const isPasswordValid = bcrypt.compareSync(password, member.password);
            if (isPasswordValid) {
                console.log("User found and password verified:", member);
                return { result: true, member: member }; // Return the matched user
            } else {
                console.log("Password incorrect for user:", loginName);
                return { result: false, member: null };
            }
        }
    }

    console.log("User not found for loginName:", loginName);
    return { result: null, membeR: null }; // Return null if no user matches
}