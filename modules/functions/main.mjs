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
    bcrypt,
    crypto,
    fs, signer, db
} from "../../index.mjs"
import {
    banIp,
    generateGid,
    getNewDate,
    getSocketIp,
    hasPermission, isIpBanned,
    removeBan,
    resolveRolesByUserId
} from "./chat/main.mjs";
import {consolas} from "./io.mjs";
import Logger from "@hackthedev/terminal-logger"
import path from "path";
import {powVerifiedUsers} from "../sockets/pow.mjs";
import {sendSystemMessage} from "../sockets/home/general.mjs";
import {decodeFromBase64, encodeToBase64} from "./mysql/helper.mjs";
import {checkMemberMigration} from "./migrations/memberJsonToDb.mjs";
import {clearBase64FromDatabase} from "./migrations/base64_fixer.mjs";
import {getMemberHighestRole} from "./chat/helper.mjs";
import {migrateOldMessagesToNewMessageSystemWithoutEncoding} from "./migrations/messageMigration.mjs";
import archiver from "archiver";
import JSONTools from "@hackthedev/json-tools";
import {initPaymentSystem} from "./payments.mjs";

var serverconfigEditable;


/*
    conf = The Variable to check for
    value = Value to fill the variable if null
 */

export function removeFromArray(array, value) {
    const index = array.indexOf(value);
    if (index !== -1) {
        array.splice(index, 1);
    }
}

export function emitBasedOnMemberId(memberId, event, payload){
    if(serverconfig.servermembers[memberId] !== null){
        io.to(String(memberId)).emit(event, payload);
    }
}

export function emitBasedOnPermission(perms, event, payload) {
    const needed = Array.isArray(perms) ? perms : [perms];
    const roles = serverconfig.serverroles || {};
    const membersObj = serverconfig.servermembers || {};
    const target = new Set();

    for (const roleId in roles) {
        const role = roles[roleId];
        if (!role) continue;
        const rp = role.permissions || {};

        if (rp.administrator == 1) {
            for (const m of role.members || []) if (m) target.add(String(m));
            continue;
        }

        const ok = needed.every(p => rp[p] == 1);
        if (!ok) continue;
        for (const m of role.members || []) if (m) target.add(String(m));
    }

    const sent = [];
    for (const memberId of target) {
        if (!membersObj[memberId] || memberId === "system") continue;

        try {
            io.to(String(memberId)).emit(event, payload);
            sent.push(memberId);
        } catch (err) {
            console.error('emitBasedOnPermission emit error for', memberId, err);
        }
    }

    return sent;
}


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

    // ignore files
    if (Buffer.isBuffer(input)) return input;

    return sanitizeHtml(input, {
        allowedTags: [
            'div',
            'source',
            'video',
            'audio',
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
            'pre',
            'code',
            "label",
            'blockquote',
            'strong',
            'em',
            'img',
            'mark'
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
            'a': sanitizeHtml.simpleTransform('a', {target: '_blank', rel: 'noopener noreferrer'})
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

export async function backupSystem() {
    const dirName = sanitizeFilename(`v${versionCode}_${new Date().toISOString()}`);
    const baseDir = `./backups/${dirName}`;
    const zipPath = `${baseDir}.zip`;

    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    fs.cpSync("./configs/", `${baseDir}/configs`, { recursive: true });

    //await exportDatabaseFromPool(
    //    db.pool,
    //    `${baseDir}/${serverconfig.serverinfo.sql.database}.sql`
    //);

    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", resolve);
        archive.on("error", reject);

        archive.pipe(output);
        archive.directory(baseDir, false);
        archive.finalize();
    });

    fs.rmSync(baseDir, { recursive: true, force: true });
}



export const mimeTypesCache = new Map(); // Cache to store validated MIME types by file ID
export const fileSizeCache = new Map(); // Cache to track file sizes by file ID

// Helper function to get the total size of files in a directory
export const getFolderSize = (folderPath) => {
    const files = fs.readdirSync(folderPath);
    return files.reduce((total, file) => {
        const {size} = fs.statSync(path.join(folderPath, file));
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
            } else if (res.status == 200) {
                var onlineVersionCode = await res.text();
                onlineVersionCode = onlineVersionCode.replaceAll("\n\r", "").replaceAll("\n", "");

                if (onlineVersionCode > versionCode) {
                    resolve(onlineVersionCode);
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        })()
    });
}

export async function handleTerminalCommands(command, args) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    try {
        if(command === "clear64"){
            clearBase64FromDatabase();
            return;
        }
        if(command === "rotateMemberTokens"){
            for (const memberId of Object.keys(serverconfig.servermembers)) {
                let member = serverconfig.servermembers[memberId];
                if(member.token){
                    member.token = generateId(48);
                    Logger.info(`Rotated token for member ${member.id}`)
                }
            }

            await saveConfig(serverconfig);
            Logger.success("Rotated all member tokens");
            return;
        }
        if(command === "load"){
            const mem = process.memoryUsage();
            Logger.info(`RAM usage: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`);
            return;
        }
        if (command === 'migrateMessages') {
            if(serverconfig.serverinfo.sql.enabled === true){
                await migrateOldMessagesToNewMessageSystemWithoutEncoding()
            }
            else{
                Logger.warn("SQL needs to be enabled and configurated inside the config.json. Its currently disabled!")
            }

            return;
        }
        if (command == 'migrateMembers') {
            await checkMemberMigration(true);
        }
        if (command == 'reload') {
            await reloadConfig();
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
                return;
            }

            flipDebug();
            consolas(`Debug Mode set to ${debugmode} with event ${args[1]}`.cyan);
        } else if (command == 'roles') {
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
        } else if (command == "token") {

            if (args.length == 2) {

                var roleIdArg = args[1];

                if (isNaN(roleIdArg) == false) {
                    try {
                        var roleToken = generateId(64);
                        serverconfigEditable.serverroles[roleIdArg].token.push(roleToken);
                        saveConfig(serverconfigEditable);

                        consolas(colors.cyan(`Redeem key generated for role ${serverconfigEditable.serverroles[roleIdArg].info.name}`));
                        consolas(colors.cyan(roleToken))
                    } catch (Err) {
                        consolas("Couldnt save or generate key".yellow);
                        consolas(colors.red(Err));
                    }
                }
            } else {
                consolas(colors.yellow(`Missing Argument: Role ID`));
            }

        } else if (command == 'delete') {
            if (args.length == 3) {
                if (args[1] == "user") {
                    if (args[2].length == 12) {
                        if (serverconfig.servermembers[args[2]] != null) {
                            delete serverconfigEditable.servermembers[args[2]];
                            consolas(`Deleting user ${args[2]}`.cyan);
                            saveConfig(serverconfigEditable);
                        } else {
                            consolas(`Couldnt find user ${args[2]}`.yellow);
                        }
                    } else {
                        consolas(`${args[2]} seems to be a invalid id`.yellow);
                    }
                }
            } else {
                consolas("Syntax error: delete <option> <value> ".cyan + command);
            }
        } else if (command == 'passwd') {
            if (args.length == 3) {
                if (args[1].length == 12) {
                    if (args[2]) {
                        serverconfig.servermembers[args[1]].password = await hashPassword(args[2])
                        saveConfig(serverconfigEditable);
                        Logger.success(`Password for user ${serverconfig.servermembers[args[1]].name} (${args[1]}) was changed`);
                    } else {
                        Logger.warn("Missing User. passwd <user id> <new password>")
                    }
                }
            } else {
                Logger.warn("SyntaxError. passwd <user id> <new password>")
            }
        } else if (command == 'msg') {
            if (args.length >= 3) {
                if (args[1].length == 12 || args[1] == "*") {
                    if (args[2]) {

                        let message = "";
                        for (let i = 2; i < args.length; i++) {
                            message += `${args[i]} `;
                        }

                        // message all users
                        if (args[1] == "*") {
                            const ids = Object.keys(serverconfig.servermembers);
                            for (const uid of ids) {
                                if (uid == "system") continue;

                                try {
                                    await sendSystemMessage(uid, message);
                                    Logger.success(`System Message sent to ${serverconfig.servermembers[uid]?.name} (${uid})`);
                                } catch (err) {
                                    Logger.warn(`Failed to send to ${uid}:`, err);
                                }
                            }
                        } else {
                            await sendSystemMessage(args[1], message);
                            Logger.success(`System Message send to ${serverconfig.servermembers[args[1]].name} (${args[1]})`);
                        }
                    } else {
                        Logger.warn("Missing User. passwd <user id> <new password>")
                    }
                }
            } else {
                Logger.warn("SyntaxError. msg < userid | * > < your message >")
            }
        } else if (command == "rooms") {
            listRoomsMembers(io);
        }
        else if (command == 'gid') {
            if (args.length == 2) {
                if (args[1]?.length == 12) {
                    Logger.success(generateGid(args[1]))
                }
            } else {
                Logger.warn("SyntaxError. gid <user id>")
            }
        }
        else {
            consolas("Unkown command: ".cyan + command);
        }
    } catch (e) {
        consolas("Couldnt handle command input".red)
        consolas(colors.red(e))
    }
}


async function listRoomsMembers(io, usersocket = {}) {
    console.log(io.sockets.adapter.rooms)
}


export function checkConnectionLimit(socket, token = null, id = null) {

    // get the connected clients
    const connectedClients = io.engine.clientsCount;

    // remote client ip
    let ip = socket.handshake.address;

    // if a token and id is provided
    let canBypassWithRoles = false;

    if (token !== null && id !== null) {

        // lets make sure the account data is correct
        if (validateMemberId(id, socket, true) == true
            && serverconfig.servermembers[id].token == token) {

            // check if user is allowed to bypass based on roles
            if (hasPermission(id, ["bypassSlots"])) canBypassWithRoles = true;
        }
    }

    // get the actual slot limits for the user / admin case
    let userSlotLimit = parseInt(serverconfig.serverinfo.slots.limit)
    let reservedSlotLimit = parseInt(serverconfig.serverinfo.slots.limit) + parseInt(serverconfig.serverinfo.slots.reserved)

    // logic to check for normal members
    if (connectedClients > userSlotLimit &&
        (!serverconfig.serverinfo.slots.ipWhitelist.includes(ip) &&
            canBypassWithRoles == false)
    ) {
        // if we did let them know
        sendMessageToUser(socket.id, JSON.parse(
            `{
                    "title": "Slot Limit reached!",
                    "message": "The slot limit of ${serverconfig.serverinfo.slots.limit} members was reached!",
                    "buttons": {
                        "0": {
                            "text": "Ok",
                            "events": "onclick='closeModal()'"
                        }
                    },
                    "type": "error",
                    "displayTime": 60000
                }`));

        Logger.debug(`Denied connection for ${ip} due to slot limit`)

        // disconnect them and stop execution
        socket.disconnect();
        return;
    }

    // logic to check for admins that could bypass the normal slot limit
    // and are allowed to use up the reserved ones
    if (connectedClients > reservedSlotLimit &&
        (serverconfig.serverinfo.slots.ipWhitelist.includes(ip) ||
            canBypassWithRoles == true)
    ) {
        // if we did let them know
        sendMessageToUser(socket.id, JSON.parse(
            `{
                            "title": "Reserved Slot Limit reached!",
                            "message": "The reserved slot limit of ${serverconfig.serverinfo.slots.reserved} members was reached!",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": "onclick='closeModal()'"
                                }
                            },
                            "type": "error",
                            "displayTime": 60000
                        }`));

        Logger.debug(`Denied connection for ${ip} due to reserved slot limit`)

        // disconnect them and stop execution
        socket.disconnect();
        return;
    }
}


export function copyObject(obj) {
    if (!obj) {
        Logger.debug("copyObject obj was null or undefined")
        return;
    }

    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (parseerror) {
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
        console.error(`Path not found: ${fromPath}`);
        return;
    }

    setNestedObject(obj, toPath, value);
    deleteNestedObject(obj, fromPath);
    console.log(`Moved data from ${fromPath} to ${toPath}`);

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
    // recreating the config example minimum base so that copying isnt needed anymore
    checkObjectKeys(serverconfig, "serverinfo.name", "Default Server")
    checkObjectKeys(serverconfig, "serverinfo.description", "")
    checkObjectKeys(serverconfig, "serverinfo.port", 2052)
    checkObjectKeys(serverconfig, "serverinfo.setup", 0)
    checkObjectKeys(serverconfig, "serverinfo.maxUploadStorage", 1024)
    checkObjectKeys(serverconfig, "serverinfo.rateLimit", 512)
    checkObjectKeys(serverconfig, "serverinfo.dropInterval", 5)
    //
    checkObjectKeys(serverconfig, "serverinfo.useCloudflareImageCDN", "")
    checkObjectKeys(serverconfig, "serverinfo.cfAccountId", "")
    checkObjectKeys(serverconfig, "serverinfo.cfAccountToken", "")
    checkObjectKeys(serverconfig, "serverinfo.cfHash", "")
    //
    checkObjectKeys(serverconfig, "ipblacklist", [])
    checkObjectKeys(serverconfig, "banlist", {})
    checkObjectKeys(serverconfig, "mutelist", {})
    //
    checkObjectKeys(serverconfig, "serverroles", {
        "0": {
            "info": {
                "id": "0",
                "name": "Member",
                "icon": null,
                "color": "#FFFFFF",
                "deletable": 0,
                "sortId": 1,
                "displaySeperate": 1,
                "hasRole": 1
            },
            "permissions": {
                "readMessages": 1,
                "sendMessages": 1,
                "uploadFiles": 1,
                "redeemKey": 1,
                "maxUpload": "10",
                "manageChannels": 0,
                "viewChannelHistory": 1,
                "createReports": 1
            },
            "members": [],
            "token": []
        },
        "1": {
            "info": {
                "id": "1",
                "name": "Offline",
                "icon": null,
                "color": "#7C808A",
                "deletable": 0,
                "sortId": 0,
                "displaySeperate": 1,
                "hasRole": 0
            },
            "permissions": {},
            "members": [],
            "token": []
        },
        "1111": {
            "info": {
                "id": 1111,
                "name": "Administrator",
                "icon": null,
                "color": "#ff0000",
                "deletable": 0,
                "sortId": 3,
                "displaySeperate": 1,
                "hasRole": 1
            },
            "permissions": {
                "readMessages": 1,
                "administrator": 1,
                "manageChannels": 0
            },
            "members": [],
            "token": [
            ]
        }
    });
    checkObjectKeys(serverconfig, "groups", {
        "0": {
            "info": {
                "id": 0,
                "name": "Home",
                "icon": "img/default_icon.png",
                "banner": "/img/default_banner.png",
                "isDeletable": 1,
                "sortId": 2,
                "access": []
            },
            "channels": {
                "categories": {
                    "0": {
                        "info": {
                            "id": 0,
                            "name": "General",
                            "sortId": 2
                        },
                        "channel": {
                            "0": {
                                "id": 0,
                                "name": "chat",
                                "type": "text",
                                "description": "",
                                "sortId": 0,
                                "permissions": {
                                    "0": {
                                        "readMessages": 1,
                                        "sendMessages": 1,
                                        "viewChannel": 1,
                                        "viewChannelHistory": 1
                                    }
                                },
                                "msgCount": 0
                            }
                        }
                    }
                }
            },
            "permissions": {
                "0": {
                    "viewGroup": 1,
                    "sendMessages": 1,
                    "readMessages": 1
                }
            }
        }
    })


    // new cool ip block shit
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.urlWhitelist",
        [
            "/^\/discover(\/.*)?$/",
            "/^\/uploads(\/.*)?$/",
            "/^\/emojis(\/.*)?$/"
        ]
    )
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.companyDomainWhitelist", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blacklist", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.whitelist", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockedCountryCodes", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockDataCenter", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockSatelite", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockCrawler", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockBogon", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockProxy", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockVPN", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockTor", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockAbuser", true)

    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.displayName", "Banned")
    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.displayMessageNotice", `<span style="color: indianred;">[ Content hidden ]</span>`)

    checkObjectKeys(serverconfig, "serverinfo.instance.contact.email", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.website", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.reddit", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.discord", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.github", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.signal", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.owner.name", "")

    // v9
    checkObjectKeys(serverconfig, "serverinfo.defaultTheme", "default.css")

    // livekit VC
    checkObjectKeys(serverconfig, "serverinfo.livekit.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.livekit.key", "dev")
    checkObjectKeys(serverconfig, "serverinfo.livekit.secret", "testing")
    checkObjectKeys(serverconfig, "serverinfo.livekit.url", "localhost:7880")

    // server list / discovery
    checkObjectKeys(serverconfig, "serverinfo.discovery.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.discovery.networkSyncing", true)
    checkObjectKeys(serverconfig, "serverinfo.discovery.defaultStatus", "verified")

    // cool ass system messaging thx to dms
    checkObjectKeys(serverconfig, "serverinfo.system.members.allowCountryCode", true)
    checkObjectKeys(serverconfig, "serverinfo.system.members.ignoreTimeout", "30 days")
    checkObjectKeys(serverconfig, "serverinfo.system.welcome.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.system.welcome.message",
        `<h3>Welcome to the server!</h3>
        <p>
            We hope you'll like it here!
            If you ever need help press the <b>Support</b> button on the top!
        </p>

        <p>
            <a style="font-size: 10px;color: gray;" href="https://ko-fi.com/shydevil/tip" target="_blank">Donate <3</a>
        </p>
    `)

    // home settings
    checkObjectKeys(serverconfig, "serverinfo.home.banner_url", "")
    checkObjectKeys(serverconfig, "serverinfo.home.title", "Default Server Title")
    checkObjectKeys(serverconfig, "serverinfo.home.subtitle", "Default Server Sub-Title")
    checkObjectKeys(serverconfig, "serverinfo.home.about", "This is the <i>default server</i> about me")

    checkObjectKeys(serverconfig, "serverinfo.reports.enabled", true)

    // TURN SERVER SETTINGS
    checkObjectKeys(serverconfig, "serverinfo.app.url", "http://your-ip-or-domain:port")    // without slash at end!

    checkObjectKeys(serverconfig, "serverinfo.turn.enabled", true)         // use turn or no
    checkObjectKeys(serverconfig, "serverinfo.turn.secret", "north")        // static-auth-secret
    checkObjectKeys(serverconfig, "serverinfo.turn.host", "127.0.0.1")      // public ip or domain
    checkObjectKeys(serverconfig, "serverinfo.turn.port", 3478)             // listening-port


    checkObjectKeys(serverconfig, "groups.*.channels.categories.*.channel.*.msgCount", 0)
    checkObjectKeys(serverconfig, "serverinfo.slots.limit", 100)
    checkObjectKeys(serverconfig, "serverinfo.slots.reserved", 4)
    checkObjectKeys(serverconfig, "serverinfo.slots.ipWhitelist", [
        "::1",
        "::ffff:127.0.0.1"
    ])

    /*
        Account Login Update & Security
    */
    checkObjectKeys(serverconfig, "serverinfo.pow.difficulty", 4)

    checkObjectKeys(serverconfig, "serverinfo.registration.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.registration.accessCodes", {})

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


    /*
        Config changes from some update
    */

    // Added MySQL
    checkObjectKeys(serverconfig, "serverinfo.sql.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.sql.host", "localhost")
    checkObjectKeys(serverconfig, "serverinfo.sql.port", 3306)
    checkObjectKeys(serverconfig, "serverinfo.sql.username", "")
    checkObjectKeys(serverconfig, "serverinfo.sql.password", "")
    checkObjectKeys(serverconfig, "serverinfo.sql.database", "dcts")
    checkObjectKeys(serverconfig, "serverinfo.sql.connectionLimit", 10) // Depending on Server Size

    // ssl vars
    checkObjectKeys(serverconfig, "serverinfo.ssl.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.ssl.key", "")
    checkObjectKeys(serverconfig, "serverinfo.ssl.cert", "")
    checkObjectKeys(serverconfig, "serverinfo.ssl.chain", "")

    // If the channel doesnt exist it will not display "member joined" messages etc
    checkObjectKeys(serverconfig, "serverinfo.defaultChannel", "0")
    checkObjectKeys(serverconfig, "serverinfo.countryCode", "")
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

export function setLongInterval(fn, ms) {
    const MAX = 2147483647; // ~24.8 days

    function run() {
        if (ms > MAX) {
            setTimeout(run, MAX);
            ms -= MAX;
        } else {
            setTimeout(() => {
                fn();
                run(); // redo
            }, ms);
        }
    }

    run();
}


export function toSeconds(input) {
    if (typeof input === "number") return input; // bereits Sekunden
    const str = String(input).toLowerCase().trim().replace(/,/g, " ");

    const UNITS = {
        s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
        m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
        h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
        d: 86400, day: 86400, days: 86400,
        w: 604800, week: 604800, weeks: 604800,
        mo: 2592000, month: 2592000, months: 2592000,          // 30 days
        y: 31536000, yr: 31536000, year: 31536000, years: 31536000 // 365 days
    };

    const re = /(\d+(?:\.\d+)?)\s*(years?|yrs?|y|months?|mos?|mo|weeks?|w|days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g;
    let total = 0, m;

    while ((m = re.exec(str))) {
        const val = parseFloat(m[1]);
        const unit = m[2];

        const key =
            unit.startsWith("sec") || unit === "s" ? "s" :
                unit.startsWith("min") || unit === "m" ? "m" :
                    unit.startsWith("hour") || unit.startsWith("hr") || unit === "h" ? "h" :
                        unit.startsWith("day") || unit === "d" ? "d" :
                            unit.startsWith("week") || unit === "w" ? "w" :
                                unit.startsWith("month") || unit === "mo" || unit === "mos" ? "mo" :
                                    unit.startsWith("year") || unit.startsWith("yr") || unit === "y" ? "y" :
                                        unit;

        if (!UNITS[key]) continue;
        total += val * UNITS[key];
    }

    if (!total) throw new Error(`Invalid interval: ${input}`);
    return Math.round(total);
}


export function checkObjectKeys(obj, path, defaultValue) {
    const keys = path.split('.');

    function recursiveCheck(currentObj, keyIndex) {
        const key = keys[keyIndex];

        if (key === '*') {
            for (const k in currentObj) {
                if (currentObj.hasOwnProperty(k)) {
                    recursiveCheck(currentObj[k], keyIndex + 1);
                }
            }
        } else {
            if (!(key in currentObj)) {
                currentObj[key] = (keyIndex === keys.length - 1) ? defaultValue : {};
            }
            if (keyIndex < keys.length - 1) {
                recursiveCheck(currentObj[key], keyIndex + 1);
            }
        }
    }

    recursiveCheck(obj, 0);
}


export function checkRateLimit(socket) {
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    var ip = socket.handshake.address;

    //console.log("IP RATE LIMIT")
    //console.log(ip)

    if (ip === "::1" || ip.includes("127.0.0.1")) {
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
        } catch {
        }

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

export function validateMemberId(id, socket, token, bypass = false) {
    id = String(id)

    if (bypass === false && socket) {
        checkRateLimit(socket);
    }

    if(!id){
        return false;
    }

    if (socket && !powVerifiedUsers.includes(socket?.id)) {
        return false;
    }

    // check member token if present
    if(id && token){
        let memberObject = serverconfig.servermembers[id];
        if(memberObject && socket) checkMemberBan(socket, memberObject);

        if(serverconfig.servermembers[id]?.token !== token){
            return false;
        }

        // if is banned deny all connections
        if(serverconfig.servermembers[id]?.isBanned === 1){
            return false;
        }
    }

    if(id){
        if(!serverconfig.servermembers[id]) return false;
        // update last online
        serverconfig.servermembers[id].lastOnline = new Date().getTime();
        if(serverconfig.servermembers[id]?.onboarding === false){
            return false;
        }
    }

    return id.length === 12;
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

    return text.replace(/[&<>"']/g, function (m) {
        return map[m];
    });
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

    const targetSocket = [...io.sockets.sockets.values()]
        .find(s => s.data.memberId === id);

    targetSocket.emit("receiveGifImage", {
        gifs: top_10_gifs
    });

}

export function searchTenor(search, id) {
    // set the apikey and limit
    var apikey = serverconfig.serverinfo.tenor.api_key;
    var clientkey = serverconfig.serverinfo.tenor.client_key;
    var lmt = serverconfig.serverinfo.tenor.limit;

    // test search term
    var search_term = search;

    // using default locale of en_US
    var search_url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(search_term)}&key=${apikey}&client_key=${clientkey}&limit=${lmt}`;

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
    if (serverconfigEditable.banlist.hasOwnProperty(ip)) {
        console.log("Checking ipblacklist for IP:", ip);
    }


    checkRateLimit(socket);

    // check mutelist
    if (serverconfig.mutelist.hasOwnProperty(member.id)) {

        var durationStamp = serverconfig.mutelist[member.id].duration;
        var muteReason = serverconfig.mutelist[member.id].reason;

        if (Date.now() >= durationStamp) {
            // unmute user
            serverconfig.servermembers[member.id].isMuted = 0;
            delete serverconfig.mutelist[member.id];
            saveConfig(serverconfig);

            consolas(colors.yellow("Automatically unmuted user " + member.name + ` (${member.id})`));
        } else {
            return {result: true, timestamp: durationStamp, reason: muteReason};
        }
    }

    // check ip blacklist
    if (serverconfig.banlist.hasOwnProperty(ip)) {
        if (Date.now() >= serverconfig.banlist[ip]) {
            delete serverconfig.banlist[ip];
            saveConfig(serverconfig);
        } else {
            return {result: true, timestamp: serverconfig.banlist[ip]}
        }
    }

    return {result: false};
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function findSocketByMemberId(io, memberId) {
    for (const [id, sock] of io.sockets.sockets) {
        if (sock.data?.memberId === memberId) {
            return sock;
        }
    }
    return null;
}

export function isLocalhostIp(ip){
    return [
        "::1",
        "127.0.0.1"
    ].includes(ip);
}


export async function checkMemberBan(socket, member) {
    let ip = getSocketIp(socket);
    checkRateLimit(socket);

    // if the user is not banned anymore but the flag is still there
    if(!serverconfig.banlist.hasOwnProperty(member?.id) && checkAndUnbanIp(ip).result === false){
        if(serverconfig.servermembers[member?.id]) serverconfig.servermembers[member.id].isBanned = false;
    }

    // check banlist for member
    if (serverconfig.banlist.hasOwnProperty(member?.id)) {
        var durationStamp = serverconfig.banlist[member?.id].until;
        var banReason = serverconfig.banlist[member?.id].reason;

        if (Date.now() >= durationStamp) {
            // unban user
            removeBan(member?.id);
            return checkAndUnbanIp(ip);
        } else {
            return {result: true, timestamp: durationStamp, reason: banReason};
        }
    }

    return checkAndUnbanIp(ip);

    function checkAndUnbanIp(ip){
        // check ip blacklist
        if (serverconfig.banlist.hasOwnProperty(ip)) {
            if (Date.now() >= serverconfig.banlist[ip]?.until) {
                removeBan(ip);
                return {result: false, timestamp: null}
            } else {
                return {result: true, timestamp: serverconfig.banlist[ip]}
            }
        }

        return {result: false, timestamp: null}
    }
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

export function getChannelCastingObject(channelObject) {
    channelObject = copyObject(channelObject);

    if (!channelObject || typeof channelObject !== "object") {
        console.error("getRoleCastingObject: Invalid input: Expected an object");
        return;
    }

    const keysToDelete = [
        "permissions"
    ]; // Keys to always delete

    keysToDelete.forEach(key => {
        if (key in channelObject) {
            delete channelObject[key];
        }
    });

    return channelObject;
}


export function getRoleCastingObject(role) {
    role = copyObject(role);

    if (!role || typeof role !== "object") {
        console.error("getRoleCastingObject: Invalid input: Expected an object");
        return;
    }

    const keysToDelete = [
        "token",
        "members",
        "permissions"
    ]; // Keys to always delete

    keysToDelete.forEach(key => {
        if (key in role) {
            delete role[key];
        }
    });

    return role;
}

export function anonymizeMember(member, shouldHide, isAdmin) {
    if(!member) throw new Error("anonymizeMember: Invalid input: Expected a member object");
    member = getCastingMemberObject(member)

    if (!member || typeof member !== "object") {
        console.error("getCastingMemberObject Member: Invalid input: Expected an object");
        return;
    }

    let isBanned = member?.isBanned;

    if(shouldHide && !isAdmin){
        member.id = 0;
        member.icon = "";
        member.status = "";
        member.banner = "";
        member.aboutme = "";
        member.name = isBanned ? `${serverconfig.serverinfo.moderation.bans.displayName}` : "Anon";
        member.joined = 0;
        member.isOnline = false;
        member.lastOnline = 0;
        member.publicKey = "";
        member.nickname = "";
        member.color = "white";
    }

    return member;
}

export function autoAnonymizeMember(issuerMemberId, member){
    if(!member?.id) member = getUnkownMember()
    let shouldAnonymize = member?.isBanned

    if(shouldAnonymize){
        return anonymizeMember(member, shouldAnonymize, hasPermission(issuerMemberId, "viewAnonymizedMessages"));
    }

    return member;
}

export function autoAnonymizeMessage(issuerMemberId, message){
    if(!message?.author?.id) message.author = getUnkownMember()

    let author = serverconfig.servermembers[message.author.id] || getUnkownMember()
    if(!author) throw new Error("Message author member object not found");

    let shouldAnonymize = (author?.isBanned == true || message?.anon === true) || false
    if(shouldAnonymize){
        return anonymizeMessage(message, author?.isBanned, hasPermission(issuerMemberId, "viewAnonymizedMessages"), issuerMemberId);
    }
    else{
        return message;
    }
}

export function anonymizeMessage(message, hideContentForMembers = false, isAdmin = false, issuerMemberId) {
    message = copyObject(message);

    if (!message || typeof message !== "object") {
        console.log(message)
        console.error("getCastingMemberObject Message: Invalid input: Expected an object");
        return;
    }


    let originalAuthor = serverconfig.servermembers[message.author.id] || getUnkownMember();
    let isBanned = originalAuthor?.isBanned;

    // anonymize message author
    if(message?.author?.name){
        message.author = autoAnonymizeMember(issuerMemberId, originalAuthor);
    }

    // anonymize message reply author
    if(message?.reply?.author?.name){
        message.reply.author = autoAnonymizeMember(issuerMemberId, serverconfig.servermembers[message.reply.author.id]);
    }

    if(message?.id) delete message?.id;
    if(message?.author) {
        message.author.id = isAdmin ? originalAuthor?.id : 0
    }

    if(hideContentForMembers || isBanned){
        if(isAdmin){
            if(isBanned){
                message.isAdmin = isAdmin;
            }
        }
        else{
            if(isBanned){
                message.message = `${serverconfig.serverinfo.moderation.bans.displayMessageNotice}`
                message.author.name = `${serverconfig.serverinfo.moderation.bans.displayName}`
                message.author = anonymizeMember(message.author, true, isAdmin);
                message.author.isBanned = true;
            }
        }
    }

    return message;
}

export function setMemberObjColor(member){
    let highestRole = getMemberHighestRole(member?.author?.id || member?.id);
    if(highestRole){
        member.color = highestRole?.info?.color;
    }

    return member;
}

export function getUnkownMember(){
    return {
        id: 0,
        name: "Unkown Member"
    }
}

export function getCastingMemberObject(member) {
    if(!member) member = getUnkownMember();
    member = copyObject(member);

    if (!member || typeof member !== "object") {
        console.error("getCastingMemberObject: Invalid input: Expected an object");
        return;
    }

    let keysToDelete = [
        "password",
        "token",
        "loginName",
        "pow",
        "rowId"
    ]; // Keys to always delete

    if(!serverconfig.serverinfo.system.members.allowCountryCode) keysToDelete.push("country_code");

    keysToDelete.forEach(key => {
        if (key in member) {
            delete member[key];
        }
    });

    member = setMemberObjColor(member)
    return member;
}

export async function findAndVerifyUser(loginName, password) {
    await reloadConfig();
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);
    let serverMembers = serverconfigEditable.servermembers;

    for (const memberId in serverMembers) {
        const member = serverMembers[memberId];

        // Check loginName matches either 'name'
        if (member.loginName === loginName) {
            // Verify the password hash
            const isPasswordValid = await bcrypt.compare(password, member.password);
            if (isPasswordValid) {
                return {result: true, member: copyObject(member)}; // Return the matched user
            } else {
                return {result: false, member: null};
            }
        }
    }

    console.log("User not found for loginName:", loginName);
    return {result: null, member: null}; // Return null if no user matches
}

export function updateFunction_Main(name, sourceString) {
    const newFn = eval('(' + sourceString + ')');
    eval(`${name} = newFn`);
    return newFn;
}
